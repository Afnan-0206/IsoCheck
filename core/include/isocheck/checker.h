#pragma once
/// checker.h — Top-level anomaly detection.
///
/// Orchestrates the full checking pipeline:
///   1. Parse history → extract transactions
///   2. Infer per-key version orders (detect non-cycle anomalies)
///   3. Build dependency graph (ww + wr edges)
///   4. Find cycles (classify as G0, G1c)
///   5. Check for G1a (aborted read) and G1b (intermediate read)
///
/// Anomaly classification follows Adya et al. (2000) as used by Elle:
///   G0:  Cycle of ww-only edges (dirty write / write cycle)
///   G1a: Committed txn reads a version written by an aborted txn
///   G1b: Committed txn reads an intermediate version of another txn
///   G1c: Cycle of ww + wr edges (circular information flow)
///
/// Phase 2 adds: G-single (exactly one rw edge), G2 (any rw edge in cycle)

#include <string>
#include <variant>
#include <vector>

#include <nlohmann/json.hpp>

#include "graph.h"
#include "history.h"
#include "version_order.h"

namespace isocheck {

/// Classification of detected anomalies.
enum class AnomalyType {
    // Non-cycle anomalies (detected during inference)
    kInconsistentRead,
    kInternalInconsistency,
    kGarbageRead,
    kDuplicateWrite,
    kDuplicateRead,

    // G1 anomalies
    kG1a,  // Aborted read
    kG1b,  // Intermediate read
    kG1c,  // Circular information flow (ww+wr cycle)

    // G0
    kG0,   // Write cycle (ww-only cycle)
};

/// A detected anomaly with its classification and witness.
struct Anomaly {
    AnomalyType type;
    std::string description;

    // For cycle anomalies, the witness cycle.
    std::optional<Cycle> cycle;

    // For non-cycle anomalies, the relevant transaction indices.
    std::vector<int64_t> involved_txns;
};

/// The verdict: summary of all anomalies found in a history.
struct CheckResult {
    bool valid;  // true if no anomalies found
    std::vector<Anomaly> anomalies;

    // Statistics
    size_t transaction_count;
    size_t ok_count;
    size_t fail_count;
    size_t info_count;
    size_t key_count;
};

/// Serialize CheckResult to JSON for CLI output.
void to_json(nlohmann::json& j, const Anomaly& a);
void to_json(nlohmann::json& j, const CheckResult& r);

/// Run the full checking pipeline on a parsed history.
///
/// This is the main entry point for the checker. It:
///   1. Extracts transactions (pairing invoke + completion)
///   2. Infers version orders and detects non-cycle anomalies
///   3. Builds the dependency graph
///   4. Checks for G1a (aborted reads) and G1b (intermediate reads)
///   5. Finds cycles: G0 (ww-only), G1c (ww+wr)
///
/// Returns a CheckResult with all anomalies found.
CheckResult check(const History& history);

/// Build the dependency graph from version orders and transactions.
///
/// For each key's version order [v0, v1, v2, ...]:
///   - ww edge: txn(v_i) → txn(v_{i+1}) for each consecutive pair
///   - wr edge: txn(v_i) → txn(reader) for each txn that read a version
///              containing v_i as its latest element
///
/// Invariant: no self-loops (a txn cannot depend on itself via different keys).
DepGraph build_dep_graph(
    const VersionOrders& vo,
    const std::vector<Transaction>& txns);

}  // namespace isocheck
