#include "isocheck/graph.h"

#include <algorithm>
#include <cassert>
#include <functional>
#include <queue>
#include <sstream>
#include <stack>
#include <unordered_set>

namespace isocheck {

const std::vector<Edge> DepGraph::kEmpty_ = {};

void DepGraph::add_edge(int64_t from, int64_t to, EdgeType type, int64_t key) {
    // Exclude self-loops: a transaction can't depend on itself.
    if (from == to) return;

    // Ensure both nodes exist in the adjacency list.
    adj_[from];
    adj_[to];

    adj_[from].push_back(Edge{from, to, type, key});
}

void DepGraph::add_node(int64_t node) {
    adj_[node];
}

const std::vector<Edge>& DepGraph::out_edges(int64_t node) const {
    auto it = adj_.find(node);
    if (it == adj_.end()) return kEmpty_;
    return it->second;
}

std::vector<int64_t> DepGraph::nodes() const {
    std::vector<int64_t> result;
    result.reserve(adj_.size());
    for (const auto& [node, _] : adj_) {
        result.push_back(node);
    }
    return result;
}

size_t DepGraph::node_count() const {
    return adj_.size();
}

size_t DepGraph::edge_count() const {
    size_t count = 0;
    for (const auto& [_, edges] : adj_) {
        count += edges.size();
    }
    return count;
}

DepGraph DepGraph::subgraph(const std::unordered_set<EdgeType>& allowed_types) const {
    DepGraph sub;
    for (const auto& [node, edges] : adj_) {
        sub.adj_[node];  // Ensure node exists even with no filtered edges
        for (const auto& e : edges) {
            if (allowed_types.count(e.type)) {
                sub.adj_[node].push_back(e);
            }
        }
    }
    return sub;
}

// --- Cycle description ---

static std::string edge_type_str(EdgeType t) {
    switch (t) {
        case EdgeType::kWW: return "ww";
        case EdgeType::kWR: return "wr";
        case EdgeType::kRW: return "rw";
    }
    return "??";
}

std::string Cycle::describe() const {
    if (edges.empty()) return "(empty cycle)";

    std::ostringstream oss;
    for (size_t i = 0; i < edges.size(); ++i) {
        if (i == 0) {
            oss << "T" << edges[i].from;
        }
        oss << " -[" << edge_type_str(edges[i].type)
            << " on key " << edges[i].key
            << "]-> T" << edges[i].to;
    }
    return oss.str();
}

// --- Iterative Tarjan's SCC ---
//
// Classic Tarjan uses recursion, which blows the stack for large graphs.
// This iterative version uses an explicit call stack.
//
// Reference: Tarjan (1972), "Depth-first search and linear graph algorithms"
// Iterative adaptation from Nuutila & Soisalon-Soininen (1994).

std::vector<std::vector<int64_t>> tarjan_scc(const DepGraph& graph) {
    // Node state for Tarjan's algorithm
    struct NodeState {
        int64_t index = -1;    // Discovery index (-1 = not visited)
        int64_t lowlink = -1;  // Lowest reachable index
        bool on_stack = false;
    };

    std::unordered_map<int64_t, NodeState> state;
    std::stack<int64_t> tarjan_stack;
    int64_t next_index = 0;
    std::vector<std::vector<int64_t>> sccs;

    auto all_nodes = graph.nodes();

    // Iterative DFS frame
    struct Frame {
        int64_t node;
        size_t edge_idx;  // Which outgoing edge to process next
    };

    for (int64_t start : all_nodes) {
        if (state[start].index != -1) continue;

        std::stack<Frame> call_stack;
        call_stack.push({start, 0});

        // Initialize start node
        state[start].index = next_index;
        state[start].lowlink = next_index;
        ++next_index;
        state[start].on_stack = true;
        tarjan_stack.push(start);

        while (!call_stack.empty()) {
            auto& frame = call_stack.top();
            const auto& edges = graph.out_edges(frame.node);

            if (frame.edge_idx < edges.size()) {
                int64_t neighbor = edges[frame.edge_idx].to;
                ++frame.edge_idx;

                if (state[neighbor].index == -1) {
                    // Not visited: "recurse" into neighbor
                    state[neighbor].index = next_index;
                    state[neighbor].lowlink = next_index;
                    ++next_index;
                    state[neighbor].on_stack = true;
                    tarjan_stack.push(neighbor);
                    call_stack.push({neighbor, 0});
                } else if (state[neighbor].on_stack) {
                    // Back edge: update lowlink
                    state[frame.node].lowlink = std::min(
                        state[frame.node].lowlink,
                        state[neighbor].index);
                }
            } else {
                // All edges processed: check if this node is an SCC root
                if (state[frame.node].lowlink == state[frame.node].index) {
                    std::vector<int64_t> scc;
                    int64_t w;
                    do {
                        w = tarjan_stack.top();
                        tarjan_stack.pop();
                        state[w].on_stack = false;
                        scc.push_back(w);
                    } while (w != frame.node);

                    // Only keep non-trivial SCCs (size > 1 means a cycle exists)
                    if (scc.size() > 1) {
                        sccs.push_back(std::move(scc));
                    }
                }

                // "Return" from this frame: propagate lowlink to parent
                int64_t finished_node = frame.node;
                call_stack.pop();

                if (!call_stack.empty()) {
                    auto& parent = call_stack.top();
                    state[parent.node].lowlink = std::min(
                        state[parent.node].lowlink,
                        state[finished_node].lowlink);
                }
            }
        }
    }

    return sccs;
}

// --- BFS shortest cycle within an SCC ---

std::optional<Cycle> find_shortest_cycle(
    const DepGraph& graph,
    const std::vector<int64_t>& scc_nodes) {

    if (scc_nodes.size() < 2) return std::nullopt;

    // Build a set for quick membership checks
    std::unordered_set<int64_t> scc_set(scc_nodes.begin(), scc_nodes.end());

    std::optional<Cycle> best;

    // Try BFS from each node in the SCC to find the shortest cycle
    // through that node. Keep the globally shortest.
    for (int64_t start : scc_nodes) {
        // BFS state: for each node, store the edge that led to it
        std::unordered_map<int64_t, Edge> parent_edge;
        std::queue<int64_t> bfs_queue;

        // Start BFS from neighbors of `start`
        for (const auto& e : graph.out_edges(start)) {
            if (!scc_set.count(e.to)) continue;

            if (e.to == start) {
                // Self-loop (shouldn't happen due to add_edge filtering,
                // but handle defensively)
                continue;
            }

            if (parent_edge.find(e.to) == parent_edge.end()) {
                parent_edge[e.to] = e;
                bfs_queue.push(e.to);
            }
        }

        // BFS until we reach `start` again
        bool found = false;
        Edge closing_edge{};
        while (!bfs_queue.empty() && !found) {
            int64_t current = bfs_queue.front();
            bfs_queue.pop();

            for (const auto& e : graph.out_edges(current)) {
                if (!scc_set.count(e.to)) continue;

                if (e.to == start) {
                    // Found a cycle back to start!
                    closing_edge = e;
                    found = true;
                    break;
                }

                if (parent_edge.find(e.to) == parent_edge.end()) {
                    parent_edge[e.to] = e;
                    bfs_queue.push(e.to);
                }
            }
        }

        if (found) {
            // Reconstruct the cycle by following parent edges backwards
            Cycle cycle;
            std::vector<Edge> path;

            // Trace from closing_edge.from back to start
            int64_t node = closing_edge.from;
            while (node != start) {
                auto it = parent_edge.find(node);
                assert(it != parent_edge.end());
                path.push_back(it->second);
                node = it->second.from;
            }

            // Reverse to get start→...→closing_edge.from, then add closing edge
            std::reverse(path.begin(), path.end());
            path.push_back(closing_edge);
            cycle.edges = std::move(path);

            if (!best || cycle.edges.size() < best->edges.size()) {
                best = std::move(cycle);
            }
        }
    }

    return best;
}

}  // namespace isocheck
