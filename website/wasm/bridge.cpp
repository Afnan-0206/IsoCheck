/// bridge.cpp - Emscripten bridge for IsoCheck WASM module.
/// Exposes check_history_wasm() to JavaScript via embind.

#include <emscripten/bind.h>
#include <sstream>
#include <string>

#include "isocheck/checker.h"
#include "isocheck/history.h"

using namespace emscripten;
using namespace isocheck;

/// Takes a JSONL history string, runs the full checking pipeline,
/// and returns a JSON result string.
std::string check_history_wasm(const std::string& jsonl_input) {
    try {
        auto history = parse_history(jsonl_input);
        auto result = check(history);

        nlohmann::json j;
        to_json(j, result);
        return j.dump(2);
    } catch (const std::exception& e) {
        nlohmann::json err;
        err["error"] = true;
        err["message"] = std::string(e.what());
        return err.dump(2);
    }
}

EMSCRIPTEN_BINDINGS(isocheck_module) {
    function("check_history", &check_history_wasm);
}
