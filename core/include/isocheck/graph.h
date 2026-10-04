#pragma once
/// graph.h — Labeled directed graph for the inferred serialization graph.
///
/// Edge types follow Adya's formalism (Section 2 of the Elle paper):
///   ww: write-write dependency (Ti installs xi, Tj installs next version)
///   wr: write-read dependency  (Ti installs xi, Tj reads xi)
///   rw: read-write (anti-dependency) — Phase 2
///
/// The graph is stored as an adjacency list with labeled edges.
/// Self-loops are excluded (Ti ≠ Tj per Adya's convention).

#include <cstdint>
#include <optional>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace isocheck {

/// Type of dependency edge in the serialization graph.
enum class EdgeType {
    kWW,  // Write-write: version order between successive writes
    kWR,  // Write-read: writer → reader
    kRW,  // Read-write (anti-dependency): reader → next writer (Phase 2)
};

/// A labeled directed edge.
struct Edge {
    int64_t from;       // Source transaction index
    int64_t to;         // Target transaction index
    EdgeType type;
    int64_t key;        // The key this dependency is about

    bool operator==(const Edge&) const = default;
};

/// A directed graph with labeled edges, keyed by transaction index.
///
/// Design choice: adjacency list over adjacency matrix because the graph
/// is sparse (each txn touches few keys, so few edges per node).
/// For 10^6 transactions, adjacency list uses O(V + E) memory vs O(V^2).
class DepGraph {
public:
    /// Add a directed edge. Ignores self-loops (from == to).
    void add_edge(int64_t from, int64_t to, EdgeType type, int64_t key);

    /// Ensure node exists in the graph even without edges.
    void add_node(int64_t node);

    /// Get all outgoing edges from a node.
    const std::vector<Edge>& out_edges(int64_t node) const;

    /// Get all nodes in the graph.
    std::vector<int64_t> nodes() const;

    /// Number of nodes.
    size_t node_count() const;

    /// Number of edges.
    size_t edge_count() const;

    /// Build a subgraph containing only edges of the specified types.
    /// Used for anomaly-specific cycle detection:
    ///   G0:  ww only
    ///   G1c: ww + wr
    ///   G2:  ww + wr + rw (Phase 2)
    DepGraph subgraph(const std::unordered_set<EdgeType>& allowed_types) const;

private:
    std::unordered_map<int64_t, std::vector<Edge>> adj_;
    static const std::vector<Edge> kEmpty_;  // Returned for nodes with no edges
};

/// A cycle in the dependency graph, serving as a witness for an anomaly.
///
/// The cycle is represented as a sequence of edges forming a closed loop:
///   edges[0].from → edges[0].to → edges[1].to → ... → edges[0].from
///
/// Why store edges (not just nodes): The edge labels (ww/wr/rw) and keys
/// are essential for classifying the anomaly type and for generating
/// human-readable explanations.
struct Cycle {
    std::vector<Edge> edges;

    /// Human-readable description of the cycle.
    std::string describe() const;
};

/// Find all strongly connected components using iterative Tarjan's algorithm.
///
/// Why iterative (not recursive): Recursive Tarjan blows the stack on large
/// graphs. With 10^6 transactions, recursion depth can exceed default stack
/// limits. Iterative Tarjan uses an explicit stack on the heap.
///
/// Returns SCCs with >1 node (trivial SCCs are not cycles).
/// Complexity: O(V + E).
std::vector<std::vector<int64_t>> tarjan_scc(const DepGraph& graph);

/// Find the shortest cycle within a single SCC using BFS.
///
/// Why BFS (not DFS): BFS from any node in the SCC finds the shortest
/// cycle through that node. We try all nodes and return the overall shortest.
/// This gives a MINIMAL witness — easier for humans to understand.
///
/// Complexity: O(V * (V + E)) in the worst case for the SCC subgraph.
/// In practice, anomaly SCCs are small (2-5 nodes).
std::optional<Cycle> find_shortest_cycle(
    const DepGraph& graph,
    const std::vector<int64_t>& scc_nodes);

}  // namespace isocheck
