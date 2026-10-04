#pragma once
/// history.h — Types for representing observed transaction histories.
///
/// Models the Jepsen/Elle history format: a sequence of operations, where each
/// operation represents a client's invoke/ok/fail/info event for a transaction.
///
/// Key design choice: We use the list-append workload exclusively.
/// Each transaction value is a vector of micro-operations:
///   ["append", key, val]  — append unique integer val to key's list
///   ["r", key, [list]]    — read key, observing list (or null)
///
/// Reference: Elle paper (Kingsbury & Alvaro, 2020), Section 3.

#include <cstdint>
#include <optional>
#include <string>
#include <variant>
#include <vector>

#include <nlohmann/json.hpp>

namespace isocheck {

/// Type of a micro-operation within a transaction.
enum class MicroOpType {
    kAppend,  // Write: append a unique value to a key's list
    kRead,    // Read: observe the current list for a key
};

/// A single micro-operation within a transaction.
/// Invariant: if type == kAppend, append_val is set and read_result is empty.
///            if type == kRead, read_result is set (possibly empty = null read).
struct MicroOp {
    MicroOpType type = MicroOpType::kAppend;
    int64_t key = 0;

    // For kAppend: the unique value being appended.
    int64_t append_val = 0;

    // For kRead: the observed list. Empty vector means null (key not yet created).
    // has_value() == false means null read.
    std::optional<std::vector<int64_t>> read_result = std::nullopt;

    bool operator==(const MicroOp&) const = default;
};

/// The lifecycle state of an operation in the history.
/// - invoke: client sent request, no response yet
/// - ok:     client received successful response
/// - fail:   client received definite failure (transaction aborted)
/// - info:   indeterminate — timeout, crash, unknown outcome
///
/// Why "info" instead of "fail" for timeouts: A timeout doesn't prove the
/// transaction didn't commit. Treating it as "fail" would be unsound — we
/// might miss anomalies involving committed-but-unacknowledged transactions.
/// Treating it as "info" is conservative: we include it in the analysis
/// but never assume it definitely committed or aborted.
enum class OpType {
    kInvoke,
    kOk,
    kFail,
    kInfo,
};

/// A single operation in the history log.
/// Each invoke has a corresponding ok/fail/info with the same process+index.
///
/// Invariant: index is globally unique and monotonically increasing.
/// Invariant: time is in nanoseconds (monotonic clock, not wall clock).
struct Op {
    int64_t index;
    OpType type;
    int64_t process;
    std::string f;  // Always "txn" for list-append workload
    std::vector<MicroOp> value;
    int64_t time;  // Nanoseconds

    bool operator==(const Op&) const = default;
};

/// A complete observed history: the ordered sequence of all operations.
///
/// Invariant: operations appear in index order.
/// Invariant: every invoke is followed (eventually) by exactly one
///            ok, fail, or info with the same process.
struct History {
    std::vector<Op> ops;
};

/// Represents a committed or indeterminate transaction extracted from the
/// history by pairing invoke + completion operations.
///
/// Why "Transaction" separate from "Op": The raw history has invoke/ok as
/// separate entries. For analysis, we need paired transactions with the final
/// observed values (from the ok/info op) and the known completion state.
struct Transaction {
    int64_t index;        // Index of the completion (ok/info) op
    int64_t process;
    OpType completion;    // kOk, kFail, or kInfo
    std::vector<MicroOp> value;  // Final observed values (from completion op)
    int64_t invoke_time;  // When the invoke was sent
    int64_t complete_time; // When the completion was received

    bool operator==(const Transaction&) const = default;
};

// --- JSON serialization ---

void to_json(nlohmann::json& j, const MicroOp& op);
void from_json(const nlohmann::json& j, MicroOp& op);

void to_json(nlohmann::json& j, const Op& op);
void from_json(const nlohmann::json& j, Op& op);

// --- Parsing ---

/// Parse a JSONL history from a string (one JSON object per line).
/// Throws std::runtime_error on malformed input.
History parse_history(const std::string& jsonl);

/// Parse a JSONL history from an input stream (streaming, line by line).
History parse_history_stream(std::istream& in);

/// Extract paired transactions from a raw history.
/// Pairs each invoke with its corresponding ok/fail/info.
/// Transactions that completed as "fail" (definite abort) are excluded
/// from the returned vector because aborted transactions don't install
/// versions and can't participate in dependency cycles.
/// "info" (indeterminate) transactions ARE included — they might have committed.
///
/// Why exclude "fail": An aborted transaction's writes are rolled back.
/// Including them would create false dependency edges. However, we DO
/// check if any "ok" transaction read values written by a "fail" transaction
/// (that's G1a — aborted read), which is done separately in the checker.
std::vector<Transaction> extract_transactions(const History& history);

}  // namespace isocheck
