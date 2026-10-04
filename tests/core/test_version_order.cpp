#include <gtest/gtest.h>

#include "isocheck/version_order.h"

using namespace isocheck;

TEST(VersionOrderTest, CleanSequentialWritesAndRead) {
    // Txn 1: append(1, 10)
    Transaction t1{
        .index = 1,
        .process = 0,
        .completion = OpType::kOk,
        .value = {MicroOp{.type = MicroOpType::kAppend, .key = 1, .append_val = 10, .read_result = std::nullopt}},
        .invoke_time = 0,
        .complete_time = 10,
    };
    // Txn 2: append(1, 20)
    Transaction t2{
        .index = 2,
        .process = 0,
        .completion = OpType::kOk,
        .value = {MicroOp{.type = MicroOpType::kAppend, .key = 1, .append_val = 20, .read_result = std::nullopt}},
        .invoke_time = 20,
        .complete_time = 30,
    };
    // Txn 3: read(1) -> [10, 20]
    Transaction t3{
        .index = 3,
        .process = 1,
        .completion = OpType::kOk,
        .value = {MicroOp{.type = MicroOpType::kRead, .key = 1, .append_val = 0, .read_result = std::vector<int64_t>{10, 20}}},
        .invoke_time = 40,
        .complete_time = 50,
    };

    auto [vo, anomalies] = infer_version_orders({t1, t2, t3});
    EXPECT_TRUE(anomalies.empty());
    ASSERT_TRUE(vo.orders.contains(1));
    EXPECT_EQ(vo.orders[1].versions, (std::vector<int64_t>{10, 20}));
    EXPECT_EQ(vo.value_to_txn[10], 1);
    EXPECT_EQ(vo.value_to_txn[20], 2);
}

TEST(VersionOrderTest, DetectInconsistentRead) {
    // Txn 1: append(1, 10)
    Transaction t1{
        .index = 1,
        .process = 0,
        .completion = OpType::kOk,
        .value = {MicroOp{.type = MicroOpType::kAppend, .key = 1, .append_val = 10, .read_result = std::nullopt}},
        .invoke_time = 0,
        .complete_time = 10,
    };
    // Txn 2: append(1, 20)
    Transaction t2{
        .index = 2,
        .process = 0,
        .completion = OpType::kOk,
        .value = {MicroOp{.type = MicroOpType::kAppend, .key = 1, .append_val = 20, .read_result = std::nullopt}},
        .invoke_time = 20,
        .complete_time = 30,
    };
    // Txn 3 reads [10, 20]
    Transaction t3{
        .index = 3,
        .process = 1,
        .completion = OpType::kOk,
        .value = {MicroOp{.type = MicroOpType::kRead, .key = 1, .append_val = 0, .read_result = std::vector<int64_t>{10, 20}}},
        .invoke_time = 40,
        .complete_time = 50,
    };
    // Txn 4 reads [20, 10] - reversed order! Not a prefix of [10, 20]
    Transaction t4{
        .index = 4,
        .process = 2,
        .completion = OpType::kOk,
        .value = {MicroOp{.type = MicroOpType::kRead, .key = 1, .append_val = 0, .read_result = std::vector<int64_t>{20, 10}}},
        .invoke_time = 60,
        .complete_time = 70,
    };

    auto [vo, anomalies] = infer_version_orders({t1, t2, t3, t4});
    EXPECT_FALSE(anomalies.empty());
    bool found_inconsistent = false;
    for (const auto& a : anomalies) {
        if (a.type == InferenceAnomaly::Type::kInconsistentRead) {
            found_inconsistent = true;
            EXPECT_EQ(a.txn_index, 4);
        }
    }
    EXPECT_TRUE(found_inconsistent);
}

TEST(VersionOrderTest, DetectGarbageRead) {
    // Txn 1 reads [999] on key 1, but 999 was never appended by any txn!
    Transaction t1{
        .index = 1,
        .process = 0,
        .completion = OpType::kOk,
        .value = {MicroOp{.type = MicroOpType::kRead, .key = 1, .append_val = 0, .read_result = std::vector<int64_t>{999}}},
        .invoke_time = 0,
        .complete_time = 10,
    };

    auto [vo, anomalies] = infer_version_orders({t1});
    EXPECT_FALSE(anomalies.empty());
    bool found_garbage = false;
    for (const auto& a : anomalies) {
        if (a.type == InferenceAnomaly::Type::kGarbageRead) {
            found_garbage = true;
            EXPECT_EQ(a.txn_index, 1);
        }
    }
    EXPECT_TRUE(found_garbage);
}

TEST(VersionOrderTest, DetectDuplicateWrite) {
    // Two txns both append 100 to key 1 (violates append value uniqueness)
    Transaction t1{
        .index = 1,
        .process = 0,
        .completion = OpType::kOk,
        .value = {MicroOp{.type = MicroOpType::kAppend, .key = 1, .append_val = 100, .read_result = std::nullopt}},
        .invoke_time = 0,
        .complete_time = 10,
    };
    Transaction t2{
        .index = 2,
        .process = 1,
        .completion = OpType::kOk,
        .value = {MicroOp{.type = MicroOpType::kAppend, .key = 1, .append_val = 100, .read_result = std::nullopt}},
        .invoke_time = 20,
        .complete_time = 30,
    };

    auto [vo, anomalies] = infer_version_orders({t1, t2});
    EXPECT_FALSE(anomalies.empty());
    bool found_duplicate = false;
    for (const auto& a : anomalies) {
        if (a.type == InferenceAnomaly::Type::kDuplicateWrite) {
            found_duplicate = true;
        }
    }
    EXPECT_TRUE(found_duplicate);
}
