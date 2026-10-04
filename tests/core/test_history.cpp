#include <gtest/gtest.h>

#include <sstream>

#include "isocheck/history.h"

using namespace isocheck;

TEST(HistoryTest, MicroOpAppendJson) {
    MicroOp op{
        .type = MicroOpType::kAppend,
        .key = 42,
        .append_val = 100,
        .read_result = std::nullopt,
    };
    nlohmann::json j = op;
    EXPECT_EQ(j[0], "append");
    EXPECT_EQ(j[1], 42);
    EXPECT_EQ(j[2], 100);

    MicroOp roundtrip = j.get<MicroOp>();
    EXPECT_EQ(roundtrip.type, MicroOpType::kAppend);
    EXPECT_EQ(roundtrip.key, 42);
    EXPECT_EQ(roundtrip.append_val, 100);
    EXPECT_FALSE(roundtrip.read_result.has_value());
}

TEST(HistoryTest, MicroOpReadJson) {
    MicroOp op{
        .type = MicroOpType::kRead,
        .key = 1,
        .append_val = 0,
        .read_result = std::vector<int64_t>{10, 20, 30},
    };
    nlohmann::json j = op;
    EXPECT_EQ(j[0], "r");
    EXPECT_EQ(j[1], 1);
    EXPECT_EQ(j[2], (std::vector<int64_t>{10, 20, 30}));

    MicroOp roundtrip = j.get<MicroOp>();
    EXPECT_EQ(roundtrip.type, MicroOpType::kRead);
    EXPECT_EQ(roundtrip.key, 1);
    ASSERT_TRUE(roundtrip.read_result.has_value());
    EXPECT_EQ(*roundtrip.read_result, (std::vector<int64_t>{10, 20, 30}));
}

TEST(HistoryTest, MicroOpNullReadJson) {
    MicroOp op{
        .type = MicroOpType::kRead,
        .key = 7,
        .append_val = 0,
        .read_result = std::nullopt,
    };
    nlohmann::json j = op;
    EXPECT_EQ(j[0], "r");
    EXPECT_EQ(j[1], 7);
    EXPECT_TRUE(j[2].is_null());

    MicroOp roundtrip = j.get<MicroOp>();
    EXPECT_EQ(roundtrip.type, MicroOpType::kRead);
    EXPECT_EQ(roundtrip.key, 7);
    EXPECT_FALSE(roundtrip.read_result.has_value());
}

TEST(HistoryTest, ParseHistoryBasic) {
    std::string input =
        "{\"index\": 0, \"type\": \"invoke\", \"process\": 0, \"f\": \"txn\", \"value\": [[\"append\", 1, 10]], \"time\": 100}\n"
        "{\"index\": 1, \"type\": \"ok\", \"process\": 0, \"f\": \"txn\", \"value\": [[\"append\", 1, 10]], \"time\": 200}\n";

    History h = parse_history(input);
    ASSERT_EQ(h.ops.size(), 2);
    EXPECT_EQ(h.ops[0].index, 0);
    EXPECT_EQ(h.ops[0].type, OpType::kInvoke);
    EXPECT_EQ(h.ops[0].process, 0);
    EXPECT_EQ(h.ops[0].time, 100);

    EXPECT_EQ(h.ops[1].index, 1);
    EXPECT_EQ(h.ops[1].type, OpType::kOk);
    EXPECT_EQ(h.ops[1].process, 0);
    EXPECT_EQ(h.ops[1].time, 200);
}

TEST(HistoryTest, ParseHistoryMalformedThrows) {
    std::string malformed = "this is not valid json";
    EXPECT_THROW(parse_history(malformed), std::runtime_error);
}

TEST(HistoryTest, ExtractTransactions) {
    std::string input =
        "{\"index\": 0, \"type\": \"invoke\", \"process\": 0, \"f\": \"txn\", \"value\": [[\"append\", 1, 1]], \"time\": 10}\n"
        "{\"index\": 1, \"type\": \"invoke\", \"process\": 1, \"f\": \"txn\", \"value\": [[\"append\", 2, 2]], \"time\": 20}\n"
        "{\"index\": 2, \"type\": \"ok\", \"process\": 0, \"f\": \"txn\", \"value\": [[\"append\", 1, 1]], \"time\": 30}\n"
        "{\"index\": 3, \"type\": \"fail\", \"process\": 1, \"f\": \"txn\", \"value\": [[\"append\", 2, 2]], \"time\": 40}\n"
        "{\"index\": 4, \"type\": \"invoke\", \"process\": 2, \"f\": \"txn\", \"value\": [[\"append\", 3, 3]], \"time\": 50}\n"
        "{\"index\": 5, \"type\": \"info\", \"process\": 2, \"f\": \"txn\", \"value\": [[\"append\", 3, 3]], \"time\": 60}\n";

    History h = parse_history(input);
    auto txns = extract_transactions(h);

    // Fail transactions are filtered out from the main extracted transactions list,
    // ok and info are preserved.
    ASSERT_EQ(txns.size(), 2);
    EXPECT_EQ(txns[0].index, 2);
    EXPECT_EQ(txns[0].process, 0);
    EXPECT_EQ(txns[0].completion, OpType::kOk);
    EXPECT_EQ(txns[0].invoke_time, 10);
    EXPECT_EQ(txns[0].complete_time, 30);

    EXPECT_EQ(txns[1].index, 5);
    EXPECT_EQ(txns[1].process, 2);
    EXPECT_EQ(txns[1].completion, OpType::kInfo);
    EXPECT_EQ(txns[1].invoke_time, 50);
    EXPECT_EQ(txns[1].complete_time, 60);
}
