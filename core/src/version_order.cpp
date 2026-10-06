#include "isocheck/version_order.h"

#include <algorithm>
#include <sstream>
#include <unordered_set>

namespace isocheck {

std::pair<VersionOrders, std::vector<InferenceAnomaly>>
infer_version_orders(
    const std::vector<Transaction>& txns,
    const std::unordered_map<int64_t, std::unordered_set<int64_t>>& failed_appends_by_key) {
    VersionOrders vo;
    std::vector<InferenceAnomaly> anomalies;
    auto known_values_by_key = failed_appends_by_key;

    // --- Step 1: Build the value→txn map (recoverability) ---
    // Each append value must be globally unique. If it's not, that's
    // a duplicate-write anomaly.
    for (const auto& txn : txns) {
        for (const auto& mop : txn.value) {
            if (mop.type != MicroOpType::kAppend) continue;
            known_values_by_key[mop.key].insert(mop.append_val);

            auto [it, inserted] = vo.value_to_txn.try_emplace(
                mop.append_val, txn.index);
            if (!inserted) {
                anomalies.push_back({
                    InferenceAnomaly::Type::kDuplicateWrite,
                    mop.key,
                    txn.index,
                    "Value " + std::to_string(mop.append_val) +
                    " was appended by both txn " + std::to_string(it->second) +
                    " and txn " + std::to_string(txn.index),
                });
            }
        }
    }

    // --- Step 2: Collect all reads per key ---
    // For each key, we want the longest read from a committed (ok) transaction.
    // info transactions are included in analysis but we prefer ok reads
    // for version order since they definitely observed those values.
    struct ReadInfo {
        int64_t txn_index;
        std::vector<int64_t> values;
        OpType completion;
    };

    std::unordered_map<int64_t, std::vector<ReadInfo>> reads_by_key;

    for (const auto& txn : txns) {
        for (const auto& mop : txn.value) {
            if (mop.type != MicroOpType::kRead) continue;
            if (!mop.read_result.has_value()) continue;  // null read

            reads_by_key[mop.key].push_back({
                txn.index,
                mop.read_result.value(),
                txn.completion,
            });
        }
    }

    // Check for duplicate elements within read results (violates append list model)
    for (const auto& [key, reads] : reads_by_key) {
        for (const auto& r : reads) {
            std::unordered_set<int64_t> seen;
            for (int64_t val : r.values) {
                if (!seen.insert(val).second) {
                    anomalies.push_back({
                        InferenceAnomaly::Type::kDuplicateRead,
                        key,
                        r.txn_index,
                        "Key " + std::to_string(key) + ": txn " + std::to_string(r.txn_index) +
                        " read duplicate element " + std::to_string(val),
                    });
                    break;
                }
            }
        }
    }

    // --- Step 3: For each key, find the longest read and verify prefixes ---
    for (auto& [key, reads] : reads_by_key) {
        // Find the longest read. Prefer ok over info for equal length,
        // because ok transactions definitely committed and observed those values.
        const ReadInfo* longest = nullptr;
        for (const auto& r : reads) {
            if (!longest ||
                r.values.size() > longest->values.size() ||
                (r.values.size() == longest->values.size() &&
                 r.completion == OpType::kOk && longest->completion != OpType::kOk)) {
                longest = &r;
            }
        }

        if (!longest || longest->values.empty()) continue;

        // Set the version order for this key.
        vo.orders[key] = KeyVersionOrder{key, longest->values};

        // Check for garbage reads: values in the longest read that were
        // never appended by any transaction.
        for (int64_t val : longest->values) {
            if (!known_values_by_key[key].count(val)) {
                anomalies.push_back({
                    InferenceAnomaly::Type::kGarbageRead,
                    key,
                    longest->txn_index,
                    "Key " + std::to_string(key) + " read value " +
                    std::to_string(val) + " which was never appended by any transaction",
                });
            }
        }

        // Verify all other reads are prefixes of the longest read.
        for (const auto& r : reads) {
            if (&r == longest) continue;

            // A read [a, b, c] is a prefix of [a, b, c, d, e] if the first
            // len(read) elements match.
            bool is_prefix = true;
            if (r.values.size() > longest->values.size()) {
                is_prefix = false;
            } else {
                for (size_t i = 0; i < r.values.size(); ++i) {
                    if (r.values[i] != longest->values[i]) {
                        is_prefix = false;
                        break;
                    }
                }
            }

            if (!is_prefix) {
                std::ostringstream oss;
                oss << "Key " << key << ": txn " << r.txn_index
                    << " read [";
                for (size_t i = 0; i < r.values.size(); ++i) {
                    if (i > 0) oss << ", ";
                    oss << r.values[i];
                }
                oss << "] which is not a prefix of the longest read [";
                for (size_t i = 0; i < longest->values.size(); ++i) {
                    if (i > 0) oss << ", ";
                    oss << longest->values[i];
                }
                oss << "] from txn " << longest->txn_index;

                anomalies.push_back({
                    InferenceAnomaly::Type::kInconsistentRead,
                    key,
                    r.txn_index,
                    oss.str(),
                });
            }

            // Also check for garbage reads in non-longest reads
            for (int64_t val : r.values) {
                if (!known_values_by_key[key].count(val)) {
                    anomalies.push_back({
                        InferenceAnomaly::Type::kGarbageRead,
                        key,
                        r.txn_index,
                        "Key " + std::to_string(key) + " read value " +
                        std::to_string(val) + " which was never appended by any transaction",
                    });
                }
            }
        }
    }

    // --- Step 4: Check internal consistency ---
    // Within a single transaction, if you append val to key k, then
    // later read key k, the read must include val (and all prior appends
    // by this transaction to k).
    for (const auto& txn : txns) {
        // Track appends made by this txn, per key
        std::unordered_map<int64_t, std::vector<int64_t>> my_appends;

        for (const auto& mop : txn.value) {
            if (mop.type == MicroOpType::kAppend) {
                my_appends[mop.key].push_back(mop.append_val);
            } else if (mop.type == MicroOpType::kRead && mop.read_result.has_value()) {
                // Check: all values we've appended to this key so far
                // should appear in this read.
                auto it = my_appends.find(mop.key);
                if (it == my_appends.end()) continue;

                const auto& read_vals = mop.read_result.value();
                std::unordered_set<int64_t> read_set(
                    read_vals.begin(), read_vals.end());

                for (int64_t appended : it->second) {
                    if (read_set.find(appended) == read_set.end()) {
                        anomalies.push_back({
                            InferenceAnomaly::Type::kInternalInconsistency,
                            mop.key,
                            txn.index,
                            "Txn " + std::to_string(txn.index) +
                            " appended " + std::to_string(appended) +
                            " to key " + std::to_string(mop.key) +
                            " but a later read within the same txn did not observe it",
                        });
                    }
                }
            }
        }
    }

    return {std::move(vo), std::move(anomalies)};
}

}  // namespace isocheck
