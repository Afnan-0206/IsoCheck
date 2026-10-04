#include <gtest/gtest.h>

#include "isocheck/graph.h"

using namespace isocheck;

TEST(GraphTest, AddEdgesAndFilter) {
    DepGraph g;
    g.add_edge(1, 2, EdgeType::kWW, 10);
    g.add_edge(2, 3, EdgeType::kWR, 10);
    g.add_edge(1, 1, EdgeType::kWW, 10);  // Self-loop should be ignored

    EXPECT_EQ(g.node_count(), 3);
    EXPECT_EQ(g.edge_count(), 2);

    auto ww_subgraph = g.subgraph({EdgeType::kWW});
    EXPECT_EQ(ww_subgraph.edge_count(), 1);
    EXPECT_EQ(ww_subgraph.out_edges(1).size(), 1);
    EXPECT_EQ(ww_subgraph.out_edges(2).size(), 0);
}

TEST(GraphTest, TarjanNoCycle) {
    // 1 -> 2 -> 3
    DepGraph g;
    g.add_edge(1, 2, EdgeType::kWW, 1);
    g.add_edge(2, 3, EdgeType::kWW, 1);

    auto sccs = tarjan_scc(g);
    EXPECT_TRUE(sccs.empty());  // No cycles means no SCC with >1 node
}

TEST(GraphTest, TarjanSimpleCycleAndShortestCycle) {
    // 1 -> 2 -> 1
    DepGraph g;
    g.add_edge(1, 2, EdgeType::kWW, 1);
    g.add_edge(2, 1, EdgeType::kWW, 2);

    auto sccs = tarjan_scc(g);
    ASSERT_EQ(sccs.size(), 1);
    EXPECT_EQ(sccs[0].size(), 2);

    auto cycle = find_shortest_cycle(g, sccs[0]);
    ASSERT_TRUE(cycle.has_value());
    EXPECT_EQ(cycle->edges.size(), 2);

    // Verify it is a closed loop
    EXPECT_EQ(cycle->edges[0].to, cycle->edges[1].from);
    EXPECT_EQ(cycle->edges[1].to, cycle->edges[0].from);
}

TEST(GraphTest, TarjanFindsMinimalCycleInChordedGraph) {
    // 1 -> 2 -> 3 -> 1 (length 3 cycle)
    // 1 -> 2 -> 1 (chord creates length 2 cycle)
    DepGraph g;
    g.add_edge(1, 2, EdgeType::kWW, 1);
    g.add_edge(2, 3, EdgeType::kWW, 1);
    g.add_edge(3, 1, EdgeType::kWW, 1);
    g.add_edge(2, 1, EdgeType::kWR, 2);

    auto sccs = tarjan_scc(g);
    ASSERT_EQ(sccs.size(), 1);

    auto cycle = find_shortest_cycle(g, sccs[0]);
    ASSERT_TRUE(cycle.has_value());
    // Shortest cycle should have length 2 (1 -> 2 -> 1), not length 3
    EXPECT_EQ(cycle->edges.size(), 2);
}
