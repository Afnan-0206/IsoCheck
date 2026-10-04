#include "isocheck/history.h"

#include <sstream>
#include <stdexcept>
#include <unordered_map>

namespace isocheck {

// --- MicroOp JSON ---

void to_json(nlohmann::json& j, const MicroOp& op) {
    if (op.type == MicroOpType::kAppend) {
        j = nlohmann::json::array({"append", op.key, op.append_val});
    } else {
        if (op.read_result.has_value()) {
            j = nlohmann::json::array({"r", op.key, op.read_result.value()});
        } else {
            j = nlohmann::json::array({"r", op.key, nullptr});
        }
    }
}

void from_json(const nlohmann::json& j, MicroOp& op) {
    if (!j.is_array() || j.size() < 2) {
        throw std::runtime_error("MicroOp must be an array of at least 2 elements");
    }

    const auto& op_type = j[0].get<std::string>();
    op.key = j[1].get<int64_t>();

    if (op_type == "append") {
        if (j.size() != 3) {
            throw std::runtime_error("append micro-op must have 3 elements");
        }
        op.type = MicroOpType::kAppend;
        op.append_val = j[2].get<int64_t>();
        op.read_result = std::nullopt;
    } else if (op_type == "r") {
        op.type = MicroOpType::kRead;
        op.append_val = 0;
        if (j.size() < 3 || j[2].is_null()) {
            op.read_result = std::nullopt;
        } else {
            op.read_result = j[2].get<std::vector<int64_t>>();
        }
    } else {
        throw std::runtime_error("Unknown micro-op type: " + op_type);
    }
}

// --- Op JSON ---

static OpType parse_op_type(const std::string& s) {
    if (s == "invoke") return OpType::kInvoke;
    if (s == "ok")     return OpType::kOk;
    if (s == "fail")   return OpType::kFail;
    if (s == "info")   return OpType::kInfo;
    throw std::runtime_error("Unknown op type: " + s);
}

static std::string op_type_to_string(OpType t) {
    switch (t) {
        case OpType::kInvoke: return "invoke";
        case OpType::kOk:     return "ok";
        case OpType::kFail:   return "fail";
        case OpType::kInfo:   return "info";
    }
    // Unreachable, but silences compiler warning.
    return "unknown";
}

void to_json(nlohmann::json& j, const Op& op) {
    j = nlohmann::json{
        {"index", op.index},
        {"type", op_type_to_string(op.type)},
        {"process", op.process},
        {"f", op.f},
        {"value", op.value},
        {"time", op.time},
    };
}

void from_json(const nlohmann::json& j, Op& op) {
    op.index = j.at("index").get<int64_t>();
    op.type = parse_op_type(j.at("type").get<std::string>());
    op.process = j.at("process").get<int64_t>();
    op.f = j.at("f").get<std::string>();
    op.value = j.at("value").get<std::vector<MicroOp>>();
    op.time = j.at("time").get<int64_t>();
}

// --- Parsing ---

History parse_history(const std::string& jsonl) {
    std::istringstream stream(jsonl);
    return parse_history_stream(stream);
}

History parse_history_stream(std::istream& in) {
    History history;
    std::string line;
    int line_num = 0;

    while (std::getline(in, line)) {
        ++line_num;
        // Skip empty lines and comments
        if (line.empty() || line[0] == '#') continue;

        try {
            auto j = nlohmann::json::parse(line);
            history.ops.push_back(j.get<Op>());
        } catch (const std::exception& e) {
            throw std::runtime_error(
                "Failed to parse history line " + std::to_string(line_num) +
                ": " + e.what());
        }
    }

    return history;
}

std::vector<Transaction> extract_transactions(const History& history) {
    // Map from process id to the pending invoke op for that process.
    // Invariant: at most one pending invoke per process at a time.
    std::unordered_map<int64_t, const Op*> pending;
    std::vector<Transaction> txns;

    for (const auto& op : history.ops) {
        if (op.type == OpType::kInvoke) {
            // Record the invoke. If there's already a pending invoke for
            // this process, the history is malformed, but we handle it
            // gracefully by overwriting (the previous invoke had no response).
            pending[op.process] = &op;
        } else {
            // This is a completion (ok/fail/info). Find the matching invoke.
            auto it = pending.find(op.process);
            if (it == pending.end()) {
                // Completion without a matching invoke — skip.
                continue;
            }

            const Op* invoke = it->second;
            pending.erase(it);

            // Skip definitely-aborted transactions: they don't install
            // versions and can't create dependency edges.
            // We handle G1a (aborted reads) separately by checking if
            // any ok transaction read values from fail transactions.
            if (op.type == OpType::kFail) continue;

            Transaction txn;
            txn.index = op.index;
            txn.process = op.process;
            txn.completion = op.type;
            txn.value = op.value;  // Use the completion's values (has read results)
            txn.invoke_time = invoke->time;
            txn.complete_time = op.time;
            txns.push_back(std::move(txn));
        }
    }

    return txns;
}

}  // namespace isocheck
