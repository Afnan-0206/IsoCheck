#pragma once
/// version_order.h — Per-key version order inference from observed reads.
///
/// The central insight from the Elle paper (Section 3): if each append
/// value is globally unique, and our datatype is an ordered list, then
/// any read reveals the COMPLETE version history of that key up to some
/// point. We call this "traceability".
///
/// Algorithm:
///   1. For each key, collect all reads from committed (ok) transactions.
///   2. Find the longest read — this is our best approximation of the
///      full version order for this key.
///   3. Verify every other read is a PREFIX of the longest read.
///      If not, the observation is inconsistent (implies an anomaly).
///
/// From the version order, we can infer:
///   - ww edges: if value a immediately precedes value b in the list,
///     then txn(a) →ww→ txn(b)
///   - wr edges: if a read observes value a, then txn(a) →wr→ reader
///   - rw edges (Phase 2): if a read saw version ending at a, and b
///     follows a, then reader →rw→ txn(b)

#include <cstdint>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

#include "history.h"

namespace isocheck {

/// The inferred version order for a single key.
/// versions[i] is the i-th value appended to this key (0-indexed).
///
/// Invariant: this is the longest observed read for this key.
/// All other reads must be prefixes of this sequence.
struct KeyVersionOrder {
    int64_t key;
    std::vector<int64_t> versions;  // Ordered: versions[0] was appended first
};

/// Result of version order inference for the entire history.
struct VersionOrders {
    /// Per-key version orders. Key = key id.
    std::unordered_map<int64_t, KeyVersionOrder> orders;

    /// Maps each append value to the transaction index that performed it.
    /// Invariant: every append value is globally unique, so this is 1-to-1.
    /// This is "recoverability" from the Elle paper.
    std::unordered_map<int64_t, int64_t> value_to_txn;
};

/// Anomalies detectable during version order inference.
/// These are "non-cycle" anomalies — found before graph construction.
struct InferenceAnomaly {
    enum class Type {
        kInconsistentRead,   // A read is not a prefix of the longest read
        kGarbageRead,        // A read contains a value never appended by any txn
        kDuplicateWrite,     // Two transactions appended the same value to a key
        kDuplicateRead,      // A read contains duplicate values
        kInternalInconsistency,  // A txn's read is inconsistent with its own writes
    };

    Type type;
    int64_t key;
    int64_t txn_index;      // Transaction that exhibited the anomaly
    std::string description; // Human-readable explanation
};

/// Infer per-key version orders from a set of extracted transactions.
///
/// Returns the version orders and any non-cycle anomalies found.
/// The anomalies vector is populated with all problems found; it does
/// NOT short-circuit on the first anomaly.
///
/// Why not short-circuit: We want to report ALL anomalies in a single
/// pass, so the user gets a complete picture. This is especially useful
/// for debugging database behavior.
std::pair<VersionOrders, std::vector<InferenceAnomaly>>
infer_version_orders(
    const std::vector<Transaction>& txns,
    const std::unordered_map<int64_t, std::unordered_set<int64_t>>& failed_appends_by_key = {});

}  // namespace isocheck
