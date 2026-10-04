#include <fstream>
#include <iostream>
#include <string>
#include <vector>

#include "isocheck/checker.h"
#include "isocheck/history.h"

namespace {

void print_usage(const char* prog) {
    std::cerr << "Usage: " << prog << " [OPTIONS] [HISTORY_FILE]\n"
              << "\n"
              << "Options:\n"
              << "  --json       Output result as JSON\n"
              << "  -h, --help   Show this help message\n"
              << "\n"
              << "If HISTORY_FILE is omitted or '-', reads from stdin.\n";
}

}  // namespace

int main(int argc, char* argv[]) {
    bool json_output = false;
    std::string file_path;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--json") {
            json_output = true;
        } else if (arg == "-h" || arg == "--help") {
            print_usage(argv[0]);
            return 0;
        } else if (arg.rfind("-", 0) == 0 && arg != "-") {
            std::cerr << "Unknown option: " << arg << "\n";
            print_usage(argv[0]);
            return 2;
        } else {
            file_path = arg;
        }
    }

    isocheck::History history;
    try {
        if (file_path.empty() || file_path == "-") {
            history = isocheck::parse_history_stream(std::cin);
        } else {
            std::ifstream file(file_path);
            if (!file.is_open()) {
                std::cerr << "Error: Cannot open file " << file_path << "\n";
                return 2;
            }
            history = isocheck::parse_history_stream(file);
        }
    } catch (const std::exception& e) {
        std::cerr << "Error parsing history: " << e.what() << "\n";
        return 2;
    }

    auto result = isocheck::check(history);

    if (json_output) {
        nlohmann::json j = result;
        std::cout << j.dump(2) << "\n";
    } else {
        std::cout << "IsoCheck Result: " << (result.valid ? "VALID" : "INVALID") << "\n";
        std::cout << "  Transactions: " << result.transaction_count
                  << " (ok=" << result.ok_count
                  << ", fail=" << result.fail_count
                  << ", info=" << result.info_count << ")\n";
        std::cout << "  Distinct Keys: " << result.key_count << "\n";
        std::cout << "  Anomalies: " << result.anomalies.size() << "\n";
        for (size_t i = 0; i < result.anomalies.size(); ++i) {
            const auto& a = result.anomalies[i];
            std::cout << "\n[" << (i + 1) << "] ";
            switch (a.type) {
                case isocheck::AnomalyType::kInconsistentRead:
                    std::cout << "INCONSISTENT READ\n";
                    break;
                case isocheck::AnomalyType::kInternalInconsistency:
                    std::cout << "INTERNAL INCONSISTENCY\n";
                    break;
                case isocheck::AnomalyType::kGarbageRead:
                    std::cout << "GARBAGE READ\n";
                    break;
                case isocheck::AnomalyType::kDuplicateWrite:
                    std::cout << "DUPLICATE WRITE\n";
                    break;
                case isocheck::AnomalyType::kDuplicateRead:
                    std::cout << "DUPLICATE READ\n";
                    break;
                case isocheck::AnomalyType::kG1a:
                    std::cout << "G1a (Aborted Read)\n";
                    break;
                case isocheck::AnomalyType::kG1b:
                    std::cout << "G1b (Intermediate Read)\n";
                    break;
                case isocheck::AnomalyType::kG1c:
                    std::cout << "G1c (Circular Information Flow)\n";
                    break;
                case isocheck::AnomalyType::kG0:
                    std::cout << "G0 (Write Cycle)\n";
                    break;
            }
            std::cout << "    " << a.description << "\n";
            if (a.cycle) {
                std::cout << "    Witness Cycle: " << a.cycle->describe() << "\n";
            }
            if (!a.involved_txns.empty()) {
                std::cout << "    Involved Txns: [";
                for (size_t k = 0; k < a.involved_txns.size(); ++k) {
                    if (k > 0) std::cout << ", ";
                    std::cout << a.involved_txns[k];
                }
                std::cout << "]\n";
            }
        }
    }

    return result.valid ? 0 : 1;
}
