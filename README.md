# IsoCheck: Black-Box Transactional Isolation Checker

[![C++20](https://img.shields.io/badge/C%2B%2B-20-blue.svg)](https://en.cppreference.com/w/cpp/20)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-blue.svg)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

IsoCheck is a high-performance black-box transactional isolation checker implemented in **C++20** with a **Python 3.12** workload harness. It infers dependency graphs from client-observed transaction histories and detects isolation anomalies via strongly connected component (SCC) and minimal cycle search.

IsoCheck builds directly upon the mathematical formalisms established in:
- **Atul Adya** (1999): *Weak Consistency: A Generalized Theory and Optimistic Implementations for Distributed Transactions*.
- **Kyle Kingsbury & Peter Alvaro** (2020): *Elle: Inferring Isolation Anomalies from Experimental Observations* ([arXiv:2003.10554](https://arxiv.org/pdf/2003.10554)).

---

## 1. Problem Statement & Key Insights

Traditional database tests check whether queries succeed or match assertions. However, multi-client race conditions under weak isolation levels (e.g. Read Committed, Repeatable Read, Snapshot Isolation) frequently allow subtle, non-serializable interleavings without generating database errors.

IsoCheck treats the database as a pure **black box**:
1. Clients concurrently issue transactions composed of ordered **list-append** operations (`append` and `read`).
2. Every appended integer is **globally unique** (enabling exact $1:1$ mapping between values and writing transactions: "traceability").
3. Each read returns an ordered list of values observed so far on that key.
4. From the collection of reads, IsoCheck infers the **per-key version order**.
5. From the version orders, IsoCheck constructs the directed **dependency graph** ($\to_{ww}, \to_{wr}$, and in Phase 2 $\to_{rw}$).
6. Any directed cycle in this graph serves as a **sound, minimal witness** proving an isolation violation.

---

## 2. Supported Anomalies (Phase 1 MVP)

| Anomaly | Classification | Graph Pattern / Property | Explanation |
|---|---|---|---|
| **G0** | Dirty Write / Write Cycle | Directed cycle of pure $\to_{ww}$ edges | Two or more transactions overwrite each other's updates concurrently in conflicting orders. |
| **G1a** | Aborted Read | Read observes value from aborted transaction | A committed transaction observes data modified by a failed/aborted transaction. |
| **G1b** | Intermediate Read | Read observes non-final write of active transaction | A transaction reads a state installed mid-way through another transaction before that transaction finished. |
| **G1c** | Circular Information Flow | Directed cycle of $\to_{ww}$ and $\to_{wr}$ edges | A cycle in the serialization graph involving both writes and reads. |
| **Garbage Read** | Data Corruption | Value observed that was never written | A read returns an element never appended by any transaction in history. |
| **Inconsistent Read** | Version Inconsistency | Read is not a prefix of the longest read | A read observed an out-of-order, truncated, or incompatible version sequence. |
| **Internal Inconsistency** | Read-Your-Writes Violation | Intra-txn read misses prior intra-txn write | A single transaction fails to observe its own preceding write to the same key. |

---

## 3. Repository Structure

```
IsoCheck/
├── CMakeLists.txt              # Root build configuration (C++20, warnings, dependencies)
├── Dockerfile                  # Multi-stage container build (gcc:14 + slim runtime)
├── docker-compose.yml          # Containerized Postgres 17 + Toxiproxy + IsoCheck
├── cli/                        # isocheck CLI binary
│   ├── CMakeLists.txt
│   └── main.cpp
├── core/                       # Core static library
│   ├── include/isocheck/       # Public headers (history.h, version_order.h, graph.h, checker.h)
│   └── src/                    # Implementations (iterative Tarjan, BFS shortest cycle, inference)
├── harness/                    # Workload generation and database harness
│   ├── workload.py             # Skewed list-append generator with unique values
│   ├── postgres.py             # Postgres driver supporting RC, RR, Serializable
│   ├── runner.py               # Concurrent multi-client history recorder
│   ├── run_campaign.py         # 20-seed acceptance campaign runner
│   └── requirements.txt
├── tests/                      # Unit test suites and hand-crafted fixtures
│   ├── fixtures/               # 12 JSONL test fixtures (positive & negative cases)
│   └── core/                   # GoogleTest suites (history, version_order, graph, checker)
└── docs/                       # Project documentation
    ├── ARCHITECTURE.md         # Invariants, components, and data flow
    ├── DESIGN_DECISIONS.md     # Rationale and tradeoffs (Tarjan iterative vs recursive, etc.)
    ├── LIMITATIONS.md          # Transparent boundaries of black-box testing
    └── BENCHMARKS.md           # Controlled benchmark results & methodology
```

---

## 4. Building and Running

### Prerequisites
- CMake $\ge 3.24$
- C++20 compliant compiler (`g++` 14+, `clang++` 16+)
- Ninja build system
- Python 3.12+ with `psycopg[binary]`

### One-Command Build
```bash
mkdir -p build && cd build
cmake -GNinja -DCMAKE_BUILD_TYPE=Release ..
ninja
```

### Running Unit Tests
```bash
./build/tests/isocheck_tests
```
All 26 unit tests run across 4 suites covering parsing, version inference, iterative Tarjan SCC, BFS shortest cycle detection, and all 12 positive/negative anomaly fixtures.

### Running the CLI
```bash
# Check a history file
./build/cli/isocheck history.jsonl

# Output JSON with cycle witnesses
./build/cli/isocheck --json history.jsonl
```

### Running the Postgres Campaign
```bash
python3 harness/run_campaign.py \
    --checker-bin ./build/cli/isocheck \
    --runs 20 \
    --clients 4 \
    --txns 25
```
# IsoCheck
