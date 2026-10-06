#include <gtest/gtest.h>

#include <filesystem>
#include <fstream>
#include <string>

#include "isocheck/checker.h"
#include "isocheck/history.h"

#ifndef FIXTURES_DIR
#define FIXTURES_DIR "fixtures"
#endif

namespace fs = std::filesystem;
using namespace isocheck;

namespace {

History load_fixture(const std::string& filename) {
    fs::path p = fs::path(FIXTURES_DIR) / filename;
    std::ifstream file(p);
    if (!file.is_open()) {
        throw std::runtime_error("Could not open fixture file: " + p.string());
    }
    return parse_history_stream(file);
}

bool has_anomaly(const CheckResult& result, AnomalyType type) {
    for (const auto& a : result.anomalies) {
        if (a.type == type) return true;
    }
    return false;
}

}  // namespace

TEST(CheckerTest, CleanSerial) {
    History h = load_fixture("clean_serial.jsonl");
    CheckResult r = check(h);
    EXPECT_TRUE(r.valid);
    EXPECT_EQ(r.anomalies.size(), 0);
    EXPECT_EQ(r.ok_count, 3);
}

TEST(CheckerTest, InconsistentRead) {
    History h = load_fixture("inconsistent_read.jsonl");
    CheckResult r = check(h);
    EXPECT_FALSE(r.valid);
    EXPECT_TRUE(has_anomaly(r, AnomalyType::kInternalInconsistency) ||
                has_anomaly(r, AnomalyType::kG1c) ||
                !r.anomalies.empty());
}

TEST(CheckerTest, GarbageRead) {
    History h = load_fixture("garbage_read.jsonl");
    CheckResult r = check(h);
    EXPECT_FALSE(r.valid);
    EXPECT_TRUE(has_anomaly(r, AnomalyType::kGarbageRead));
}

TEST(CheckerTest, InternalInconsistency) {
    History h = load_fixture("internal_inconsistency.jsonl");
    CheckResult r = check(h);
    EXPECT_FALSE(r.valid);
    EXPECT_TRUE(has_anomaly(r, AnomalyType::kInternalInconsistency));
}

TEST(CheckerTest, G1aPositive) {
    History h = load_fixture("g1a_positive.jsonl");
    CheckResult r = check(h);
    EXPECT_FALSE(r.valid);
    EXPECT_TRUE(has_anomaly(r, AnomalyType::kG1a));
}

TEST(CheckerTest, G1aNegative) {
    History h = load_fixture("g1a_negative.jsonl");
    CheckResult r = check(h);
    EXPECT_TRUE(r.valid);
    EXPECT_FALSE(has_anomaly(r, AnomalyType::kG1a));
}

TEST(CheckerTest, G1aIgnoresUnexecutedAndWrongKeyAppends) {
    History h = load_fixture("g1a_wrong_key_unexecuted.jsonl");
    CheckResult r = check(h);
    EXPECT_TRUE(r.valid);
    EXPECT_FALSE(has_anomaly(r, AnomalyType::kG1a));
}

TEST(CheckerTest, G1bPositive) {
    History h = load_fixture("g1b_positive.jsonl");
    CheckResult r = check(h);
    EXPECT_FALSE(r.valid);
    EXPECT_TRUE(has_anomaly(r, AnomalyType::kG1b));
}

TEST(CheckerTest, G1bNegative) {
    History h = load_fixture("g1b_negative.jsonl");
    CheckResult r = check(h);
    EXPECT_TRUE(r.valid);
    EXPECT_FALSE(has_anomaly(r, AnomalyType::kG1b));
}

TEST(CheckerTest, G1bDoesNotUseFutureNonOverlappingWriter) {
    History h = load_fixture("g1b_future_writer_negative.jsonl");
    CheckResult r = check(h);
    EXPECT_FALSE(has_anomaly(r, AnomalyType::kG1b));
}

TEST(CheckerTest, G0Positive) {
    History h = load_fixture("g0_positive.jsonl");
    CheckResult r = check(h);
    EXPECT_FALSE(r.valid);
    EXPECT_TRUE(has_anomaly(r, AnomalyType::kG0));
}

TEST(CheckerTest, G0Negative) {
    History h = load_fixture("g0_negative.jsonl");
    CheckResult r = check(h);
    EXPECT_TRUE(r.valid);
    EXPECT_FALSE(has_anomaly(r, AnomalyType::kG0));
}

TEST(CheckerTest, G1cPositive) {
    History h = load_fixture("g1c_positive.jsonl");
    CheckResult r = check(h);
    EXPECT_FALSE(r.valid);
    EXPECT_TRUE(has_anomaly(r, AnomalyType::kG1c));
}

TEST(CheckerTest, G1cNegative) {
    History h = load_fixture("g1c_negative.jsonl");
    CheckResult r = check(h);
    EXPECT_TRUE(r.valid);
    EXPECT_FALSE(has_anomaly(r, AnomalyType::kG1c));
}

TEST(CheckerTest, G0PositiveExactWitnessString) {
    History h = load_fixture("g0_positive.jsonl");
    CheckResult r = check(h);
    ASSERT_FALSE(r.valid);
    ASSERT_TRUE(has_anomaly(r, AnomalyType::kG0));
    for (const auto& a : r.anomalies) {
        if (a.type == AnomalyType::kG0) {
            ASSERT_TRUE(a.cycle.has_value());
            std::string desc = a.cycle->describe();
            EXPECT_EQ(desc, "T3 -[ww on key 2]-> T1 -[ww on key 1]-> T3");
            EXPECT_EQ(a.description, "G0 (write cycle): T3 -[ww on key 2]-> T1 -[ww on key 1]-> T3");
        }
    }
}

TEST(CheckerTest, G1cPositiveExactWitnessString) {
    History h = load_fixture("g1c_positive.jsonl");
    CheckResult r = check(h);
    ASSERT_FALSE(r.valid);
    ASSERT_TRUE(has_anomaly(r, AnomalyType::kG1c));
    for (const auto& a : r.anomalies) {
        if (a.type == AnomalyType::kG1c) {
            ASSERT_TRUE(a.cycle.has_value());
            std::string desc = a.cycle->describe();
            EXPECT_EQ(desc, "T3 -[wr on key 2]-> T1 -[ww on key 1]-> T3");
            EXPECT_EQ(a.description, "G1c (circular information flow): T3 -[wr on key 2]-> T1 -[ww on key 1]-> T3");
        }
    }
}

TEST(CheckerTest, G1bThreeAppendsPositive) {
    History h = load_fixture("g1b_3_appends_positive.jsonl");
    CheckResult r = check(h);
    EXPECT_FALSE(r.valid);
    EXPECT_TRUE(has_anomaly(r, AnomalyType::kG1b));
}

TEST(CheckerTest, G1bThreeAppendsNegative) {
    History h = load_fixture("g1b_3_appends_negative.jsonl");
    CheckResult r = check(h);
    EXPECT_TRUE(r.valid);
    EXPECT_FALSE(has_anomaly(r, AnomalyType::kG1b));
}

TEST(CheckerTest, DuplicateReadPositive) {
    History h = load_fixture("duplicate_read_positive.jsonl");
    CheckResult r = check(h);
    EXPECT_FALSE(r.valid);
    EXPECT_TRUE(has_anomaly(r, AnomalyType::kDuplicateRead));
}

TEST(CheckerTest, DuplicateReadNegative) {
    History h = load_fixture("duplicate_read_negative.jsonl");
    CheckResult r = check(h);
    EXPECT_TRUE(r.valid);
    EXPECT_FALSE(has_anomaly(r, AnomalyType::kDuplicateRead));
}

TEST(CheckerTest, SelfLoopNoEdge) {
    History h = load_fixture("self_loop_rw.jsonl");
    CheckResult r = check(h);
    EXPECT_TRUE(r.valid);
    EXPECT_EQ(r.anomalies.size(), 0);
}

