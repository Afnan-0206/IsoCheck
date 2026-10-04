#include "isocheck/checker.h"

#include <algorithm>
#include <sstream>
#include <unordered_map>
#include <unordered_set>

namespace isocheck {

// --- JSON serialization ---

static std::string anomaly_type_str(AnomalyType t) {
    switch (t) {
        case AnomalyType::kInconsistentRead:      return "inconsistent-read";
        case AnomalyType::kInternalInconsistency: return "internal-inconsistency";
        case AnomalyType::kGarbageRead:           return "garbage-read";
        case AnomalyType::kDuplicateWrite:        return "duplicate-write";
        case AnomalyType::kDuplicateRead:         return "duplicate-read";
        case AnomalyType::kG1a:                   return "G1a";
        case AnomalyType::kG1b:                   return "G1b";
        case AnomalyType::kG1c:                   return "G1c";
        case AnomalyType::kG0:                    return "G0";
    }
    return "unknown";
}

void to_json(nlohmann::json& j, const Anomaly& a) {
    j = nlohmann::json{
        {"type", anomaly_type_str(a.type)},
        {"description", a.description},
    };
    if (a.cycle.has_value()) {
        j["cycle"] = a.cycle->describe();
    }
    if (!a.involved_txns.empty()) {
        j["involved_txns"] = a.involved_txns;
    }
}

void to_json(nlohmann::json& j, const CheckResult& r) {
    j = nlohmann::json{
        {"valid", r.valid},
        {"anomalies", r.anomalies},
        {"stats", {
            {"transactions", r.transaction_count},
            {"ok", r.ok_count},
            {"fail", r.fail_count},
            {"info", r.info_count},
            {"keys", r.key_count},
        }},
    };
}

// --- Dependency graph construction ---

DepGraph build_dep_graph(
    const VersionOrders& vo,
    const std::vector<Transaction>& txns) {

    DepGraph graph;

    // Ensure every transaction is a node in the graph, even if it
    // has no dependency edges. This matters for node_count() accuracy.
    for (const auto& txn : txns) {
        graph.add_node(txn.index);
    }

    // --- ww edges ---
    // For each key's version order [v0, v1, v2, ...], consecutive values
    // were written by specific transactions. txn(v_i) →ww→ txn(v_{i+1}).
    for (const auto& [key, kvo] : vo.orders) {
        const auto& versions = kvo.versions;
        for (size_t i = 0; i + 1 < versions.size(); ++i) {
            auto it_from = vo.value_to_txn.find(versions[i]);
            auto it_to = vo.value_to_txn.find(versions[i + 1]);

            // Skip if either value can't be traced to a transaction
            // (e.g., garbage values). The anomaly was already flagged
            // during version order inference.
            if (it_from == vo.value_to_txn.end() ||
                it_to == vo.value_to_txn.end()) continue;

            graph.add_edge(it_from->second, it_to->second, EdgeType::kWW, key);
        }
    }

    // --- wr edges ---
    // For each read that observes a list [..., v_last], the transaction
    // that appended v_last has a wr-dependency to the reading transaction.
    //
    // More precisely: for each value v in the read list, txn(v) →wr→ reader.
    // But the most informative edge is from the writer of the LAST value
    // in the read, because that's the version the reader actually observed.
    // We add edges for the last value only, to keep the graph sparse.
    //
    // Actually, to be sound and match Elle's behavior: if a reader observes
    // version [v1, v2, v3], it wr-depends on the transaction that installed
    // that version. The installed version is the one whose final append is v3.
    // So wr edge: txn(v3) → reader.
    for (const auto& txn : txns) {
        for (const auto& mop : txn.value) {
            if (mop.type != MicroOpType::kRead) continue;
            if (!mop.read_result.has_value()) continue;
            const auto& read_vals = mop.read_result.value();
            if (read_vals.empty()) continue;

            // The reader observed the version whose last append is read_vals.back()
            int64_t last_val = read_vals.back();
            auto it = vo.value_to_txn.find(last_val);
            if (it == vo.value_to_txn.end()) continue;

            graph.add_edge(it->second, txn.index, EdgeType::kWR, mop.key);
        }
    }

    return graph;
}

// --- G1a detection (aborted reads) ---
// A committed transaction (ok) reads a value written by an aborted (fail) transaction.

static std::vector<Anomaly> check_g1a(
    const History& history,
    const VersionOrders& vo) {

    std::vector<Anomaly> anomalies;

    // Collect all values appended by failed (aborted) transactions
    std::unordered_set<int64_t> aborted_values;
    std::unordered_map<int64_t, int64_t> aborted_val_to_process;

    // We need to look at the raw history to find fail ops
    std::unordered_map<int64_t, const Op*> pending_invokes;

    for (const auto& op : history.ops) {
        if (op.type == OpType::kInvoke) {
            pending_invokes[op.process] = &op;
        } else if (op.type == OpType::kFail) {
            auto it = pending_invokes.find(op.process);
            if (it != pending_invokes.end()) {
                // The invoke has the append operations
                for (const auto& mop : it->second->value) {
                    if (mop.type == MicroOpType::kAppend) {
                        aborted_values.insert(mop.append_val);
                        aborted_val_to_process[mop.append_val] = op.process;
                    }
                }
                pending_invokes.erase(it);
            }
        } else {
            pending_invokes.erase(op.process);
        }
    }

    if (aborted_values.empty()) return anomalies;

    // Now check: did any committed transaction read an aborted value?
    // Look at ok-completed transactions in the extracted set.
    for (const auto& op : history.ops) {
        if (op.type != OpType::kOk) continue;

        for (const auto& mop : op.value) {
            if (mop.type != MicroOpType::kRead) continue;
            if (!mop.read_result.has_value()) continue;

            for (int64_t val : mop.read_result.value()) {
                if (aborted_values.count(val)) {
                    anomalies.push_back({
                        AnomalyType::kG1a,
                        "G1a (aborted read): committed txn " +
                        std::to_string(op.index) + " on process " +
                        std::to_string(op.process) + " read value " +
                        std::to_string(val) + " from key " +
                        std::to_string(mop.key) +
                        ", which was written by aborted process " +
                        std::to_string(aborted_val_to_process[val]),
                        std::nullopt,
                        {op.index},
                    });
                }
            }
        }
    }

    return anomalies;
}

// --- G1b detection (intermediate reads) ---
// A committed transaction reads an intermediate version — a value that is
// NOT the final write to that key by its source transaction.
//
// Example: T1 does [append k 1, append k 2]. The final version from T1
// on key k has both 1 and 2. If T2 reads [... 1] but not [... 1, 2],
// and 1 is not the last append by T1 to k, then T2 read an intermediate state.

static std::vector<Anomaly> check_g1b(
    const std::vector<Transaction>& txns,
    const VersionOrders& vo) {

    std::vector<Anomaly> anomalies;

    struct IntermediateInfo {
        int64_t txn_index;
        int64_t key;
        int64_t final_val;
    };
    std::unordered_map<int64_t, IntermediateInfo> intermediate_appends;

    for (const auto& txn : txns) {
        if (txn.completion != OpType::kOk) continue;

        std::unordered_map<int64_t, std::vector<int64_t>> appends_by_key;
        for (const auto& mop : txn.value) {
            if (mop.type == MicroOpType::kAppend) {
                appends_by_key[mop.key].push_back(mop.append_val);
            }
        }

        for (const auto& [key, vals] : appends_by_key) {
            if (vals.size() > 1) {
                int64_t final_val = vals.back();
                for (size_t i = 0; i + 1 < vals.size(); ++i) {
                    intermediate_appends[vals[i]] = IntermediateInfo{txn.index, key, final_val};
                }
            }
        }
    }

    if (intermediate_appends.empty()) return anomalies;

    for (const auto& txn : txns) {
        if (txn.completion != OpType::kOk) continue;

        for (const auto& mop : txn.value) {
            if (mop.type != MicroOpType::kRead) continue;
            if (!mop.read_result.has_value()) continue;
            const auto& read_vals = mop.read_result.value();
            if (read_vals.empty()) continue;

            int64_t last_val = read_vals.back();
            auto it = intermediate_appends.find(last_val);
            if (it != intermediate_appends.end()) {
                const auto& info = it->second;
                if (info.txn_index != txn.index && info.key == mop.key) {
                    anomalies.push_back({
                        AnomalyType::kG1b,
                        "G1b (intermediate read): txn " +
                        std::to_string(txn.index) +
                        " read key " + std::to_string(mop.key) +
                        " and observed intermediate write " +
                        std::to_string(last_val) + " from txn " +
                        std::to_string(info.txn_index) +
                        " without observing final value " +
                        std::to_string(info.final_val),
                        std::nullopt,
                        {txn.index, info.txn_index},
                    });
                }
            }
        }
    }

    return anomalies;
}

// --- Main check pipeline ---

CheckResult check(const History& history) {
    CheckResult result;
    result.valid = true;

    // --- Step 1: Count raw op types ---
    result.ok_count = 0;
    result.fail_count = 0;
    result.info_count = 0;
    for (const auto& op : history.ops) {
        if (op.type == OpType::kOk) ++result.ok_count;
        else if (op.type == OpType::kFail) ++result.fail_count;
        else if (op.type == OpType::kInfo) ++result.info_count;
    }

    // --- Step 2: Extract transactions ---
    auto txns = extract_transactions(history);
    result.transaction_count = txns.size();

    // --- Step 3: Infer version orders + non-cycle anomalies ---
    auto [vo, inference_anomalies] = infer_version_orders(txns);
    result.key_count = vo.orders.size();

    // Convert inference anomalies to checker anomalies
    for (const auto& ia : inference_anomalies) {
        AnomalyType at = AnomalyType::kInternalInconsistency;
        switch (ia.type) {
            case InferenceAnomaly::Type::kInconsistentRead:
                at = AnomalyType::kInconsistentRead;
                break;
            case InferenceAnomaly::Type::kGarbageRead:
                at = AnomalyType::kGarbageRead;
                break;
            case InferenceAnomaly::Type::kDuplicateWrite:
                at = AnomalyType::kDuplicateWrite;
                break;
            case InferenceAnomaly::Type::kDuplicateRead:
                at = AnomalyType::kDuplicateRead;
                break;
            case InferenceAnomaly::Type::kInternalInconsistency:
                at = AnomalyType::kInternalInconsistency;
                break;
        }

        result.anomalies.push_back({
            at,
            ia.description,
            std::nullopt,
            {ia.txn_index},
        });
        result.valid = false;
    }

    // --- Step 4: Check G1a (aborted reads) ---
    auto g1a_anomalies = check_g1a(history, vo);
    for (auto& a : g1a_anomalies) {
        result.anomalies.push_back(std::move(a));
        result.valid = false;
    }

    // --- Step 5: Check G1b (intermediate reads) ---
    auto g1b_anomalies = check_g1b(txns, vo);
    for (auto& a : g1b_anomalies) {
        result.anomalies.push_back(std::move(a));
        result.valid = false;
    }

    // --- Step 6: Build dependency graph ---
    auto graph = build_dep_graph(vo, txns);

    // --- Step 7: Check G0 (ww-only cycles) ---
    {
        auto ww_graph = graph.subgraph({EdgeType::kWW});
        auto sccs = tarjan_scc(ww_graph);
        for (const auto& scc : sccs) {
            auto cycle = find_shortest_cycle(ww_graph, scc);
            if (cycle) {
                result.anomalies.push_back({
                    AnomalyType::kG0,
                    "G0 (write cycle): " + cycle->describe(),
                    std::move(cycle),
                    {},
                });
                result.valid = false;
            }
        }
    }

    // --- Step 8: Check G1c (ww+wr cycles) ---
    {
        auto ww_wr_graph = graph.subgraph({EdgeType::kWW, EdgeType::kWR});
        auto sccs = tarjan_scc(ww_wr_graph);
        for (const auto& scc : sccs) {
            auto cycle = find_shortest_cycle(ww_wr_graph, scc);
            if (cycle) {
                // Only report as G1c if the cycle contains at least one wr edge.
                // If it's ww-only, it was already reported as G0.
                bool has_wr = false;
                for (const auto& e : cycle->edges) {
                    if (e.type == EdgeType::kWR) {
                        has_wr = true;
                        break;
                    }
                }

                if (has_wr) {
                    result.anomalies.push_back({
                        AnomalyType::kG1c,
                        "G1c (circular information flow): " + cycle->describe(),
                        std::move(cycle),
                        {},
                    });
                    result.valid = false;
                }
            }
        }
    }

    return result;
}

}  // namespace isocheck
