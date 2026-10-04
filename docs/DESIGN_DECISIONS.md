# IsoCheck Design Decisions & Tradeoffs

This document outlines key technical decisions made during the design and implementation of IsoCheck, documenting the alternatives considered, rationale, and tradeoffs.

---

## Decision 1: C++20 Core Library with Python Workload Harness

### Context
We need high performance for graph cycle algorithms and large history parsing ($10^5$ to $10^7$ transactions) while maintaining flexibility for workload generation and database drivers.

### Choices Considered
1. **Pure Python**:
   - *Pros*: Quick prototyping, rich database connectors.
   - *Cons*: High memory overhead for node objects and dictionaries; slow graph traversal on millions of edges; Global Interpreter Lock (GIL) limits single-process throughput.
2. **Pure Rust**:
   - *Pros*: High performance, strong memory safety.
   - *Cons*: Project specification calls for C++20 core and Python harness.
3. **C++20 Core + Python Harness (Chosen)**:
   - *Pros*: Zero-overhead abstractions in C++20 (`std::optional`, `std::vector`, `std::unordered_map`), deterministic memory management, high cache locality. Python harness provides clean async/thread concurrent client generation and direct SQL drivers (`psycopg`).
   - *Cons*: Cross-language boundary; build requires C++ toolchain (CMake/GCC).

---

## Decision 2: Iterative vs. Recursive Tarjan's SCC Algorithm

### Context
Tarjan's algorithm finds strongly connected components (SCCs) in linear time $O(V + E)$. The canonical textbook implementation is recursive DFS.

### Problem with Recursive DFS
In a history with $10^6$ transactions, long chains of sequential write dependencies ($T_1 \to_{ww} T_2 \to_{ww} \dots \to_{ww} T_n$) can cause DFS call depths of hundreds of thousands of frames, easily overflowing the default OS call stack (typically 8MB on Linux / 1MB on Windows).

### Chosen Approach: Iterative Tarjan with Explicit Heap Stack
We maintain call-stack state (`node`, `edge_index`) on a heap-allocated `std::vector<StackFrame>`.
- **Tradeoff**: Slightly more verbose implementation and stack frame management.
- **Benefit**: Immune to call-stack overflow regardless of graph depth.

---

## Decision 3: Minimal Witness Generation via BFS over DFS Backtracking

### Context
When an SCC is detected, any cycle within it proves an anomaly. However, raw SCCs can contain thousands of overlapping cycles. Users need a concise, minimal witness to debug database issues.

### Choices Considered
1. **First-found cycle via DFS back-edge**:
   - *Pros*: $O(V + E)$ fast.
   - *Cons*: May produce a cycle with 50 hops when an obvious 2-node cycle exists, making human triage difficult.
2. **All elementary cycles (Johnson's algorithm)**:
   - *Pros*: Exhaustive.
   - *Cons*: Exponential complexity $O((V+E)(C+1))$; unusable on dense graphs.
3. **Shortest Cycle Search via BFS within SCC (Chosen)**:
   - *Pros*: Guaranteed minimal length witness. Trivial to explain in post-mortems and bug reports.
   - *Cons*: In the worst case $O(V \cdot (V + E))$, but since this runs strictly within already isolated, small anomaly SCCs (usually 2 to 5 nodes), running time is negligible in practice (< 1 ms).

---

## Decision 4: Classification of Indeterminate Outcomes (`info`)

### Context
Network disconnects, server restarts, client timeouts, or unhandled socket drops leave the transaction's fate uncertain on the client.

### Soundness Tradeoff
- **If treated as `fail`**: If the transaction actually committed on the database before the network drop, subsequent transactions will read its writes. IsoCheck would falsely flag these reads as G1a (aborted reads), producing false positives.
- **If treated as `ok`**: If the transaction actually aborted, but we assume it committed, missing versions would be flagged as data loss or cycle failures.
- **Chosen (`info`)**: Recorded as indeterminate. Its writes are registered as potentially valid, so readers don't trigger spurious G1a errors, but it is never assumed to have definitely committed if its effects never appear. This strictly mirrors Jepsen's formal treatment of unknown states.

---

## Decision 5: List-Append Data Model vs. Register (RW) Model

### Context
In black-box testing, inferring what happened inside the database requires observing output.

### The Power of Ordered List-Appends (Traceability)
If transactions append unique integers to a list, each read returns an ordered sequence:
1. **Total Order per Key**: A single read $[v_1, v_2, v_3]$ proves that $v_1$ was committed before $v_2$, and $v_2$ before $v_3$.
2. **Zero Guesswork**: Unlike single-value registers (where reading `5` only tells you the latest value, but not what happened between `3` and `5`), lists preserve the full lineage.
3. **Prefix Invariant**: In linearizable and serializable systems, every committed read must be a prefix of the final list state. Any non-prefix read immediately flags intermediate, aborted, or out-of-order execution.
