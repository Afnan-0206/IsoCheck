# IsoCheck Project Progress Tracker

## 1. Current Phase
**Phase 1 Remediation Complete / Phase 2 Pre-Implementation Review (Conditionally Approved)**
- All Phase 1 remediation items verified and empirical evidence collected.
- Phase 2 design review feedback addressed (Items A through F).
- Awaiting final Phase 2 authorization before initiating Phase 2 implementation.

---

## 2. Completed Items

### Core Verification Engine (Phase 1)
- [x] **History Parser & Micro-Op Architecture**: Support for list-append workloads (`invoke`, `ok`, `fail`, `info`), micro-ops (`append`, `read`), and transaction extraction (`core/src/history.cpp`).
- [x] **Version Order Inference**: Per-key version order reconstruction from read prefixes, duplicate element checking, and prefix consistency checking (`core/src/version_order.cpp`).
- [x] **Conflict Graph Construction**: Inference of write-write ($ww$), write-read ($wr$), and read-write anti-dependency ($rw$) edges from version order, plus process-order ($po$) and real-time ($rt$) edges (`core/src/graph.cpp`).
- [x] **SCC Decomposition**: Tarjan's Strongly Connected Components algorithm for isolating cyclic dependency components (`core/src/scc.cpp`).
- [x] **Constrained Shortest Cycle Detection**: BFS-based cycle witness search with exact path reconstruction and priority edge classification (`core/src/cycle.cpp`).
- [x] **Anomaly Detection**: Comprehensive detection of $G0$ (write cycles), $G1a$ (aborted reads), $G1b$ (intermediate reads), $G1c$ (circular information flow), $G\text{-single}$ (single anti-dependency cycles), and version inconsistencies (`duplicate-read`, `inconsistent-read`, `garbage-read`) (`core/src/checker.cpp`).
- [x] **CLI Tool (`isocheck`)**: Command-line interface with stdout witness printing, `--level` thresholding, and `--json` machine-readable output (`cli/src/main.cpp`).

### Validation, Harness & Comparative Campaign
- [x] **Test Fixture Suite**: 17 curated test fixtures covering all isolation levels, positive/negative anomaly cases, and edge scenarios (`tests/fixtures/`).
- [x] **Unit & End-to-End Tests**: 34 unit and integration tests verifying graph construction, cycle finding, witness formatting, and CLI exit codes (`tests/core/test_checker.cpp`).
- [x] **PostgreSQL 17.2 Harness**: Concurrent multithreaded test harness with connection pooling, monotonic indexing, and strict error classification (`harness/postgres.py`, `harness/runner.py`).
- [x] **Full 60-Run Empirical Campaign**: 20 seeded runs across 3 isolation levels (Read Committed, Repeatable Read, Serializable) totaling 31,200 transactions (`campaign_results/campaign_summary.json`):
  * **Read Committed**: 9,756 ok, 644 fail (all SQLSTATE 40P01 deadlocks), 0 info. Zero $G0, G1a, G1b, G1c$ anomalies.
  * **Repeatable Read**: 4,720 ok, 5,680 fail (all SQLSTATE 40001 serialization failures), 0 info. Zero anomalies.
  * **Serializable**: 4,157 ok, 6,243 fail (all SQLSTATE 40001 serialization failures), 0 info. Zero anomalies.
- [x] **Buggy Append Positive Control**: 20-run campaign under buggy read-modify-write without row locks:
  * **Read Committed**: 100% of runs flagged for isolation anomalies (dominant: `inconsistent-read` lost updates).
  * **Serializable**: 100% clean (PostgreSQL SSI detects conflicts and aborts racing transactions before commit).
- [x] **Elle (Jepsen) Differential Testing**: Automated conversion pipeline from IsoCheck JSONL to Clojure EDN, differential test runner in pinned Docker JDK (`eclipse-temurin:21-jdk`), and comparative verdict table (`tests/elle/`).
- [x] **Elle-CLI Bug Reproduction**: Minimal reproduction and thread dump excerpt confirming thread starvation deadlock in `elle-cli 0.1.11` / Jepsen's parallel fold on small histories.

---

## 3. Open Items (Phase 2 Scope)

- [ ] **Item 1: Incompatible Version Order Handling**: When reads on a key cannot form a single prefix chain, report `incompatible-order` and do NOT emit guessed $rw$/$ww$ edges. Implement the longest consistent chain heuristic / key exclusion as designed from Elle. Add test fixtures.
- [ ] **Item 2: Configurable Cycle Search Cap**: Bound search in large SCCs by candidate count/edge index. When bounded, report cycle candidate with `"witness not proven minimal"` annotation.
- [ ] **Item 3: Simulated Database (SimDB) Failure Modes**: In-memory database simulation supporting crash mid-transaction (orphan/aborted writes for $G1a$ positive control) and crash post-commit before client acknowledgment (indeterminate `info` status).
- [ ] **Item 4: Hierarchical Verdict Profile**: Always evaluate and output compliance against all consistency levels ($PL\text{-}1, PL\text{-}2, PL\text{-}2+, PL\text{-}SI, PL\text{-}3, \text{Strict-Serializable}$). `--level` only sets CLI exit code.
- [ ] **Item 5: Extended JSON Schema**: Add `schema_version`, per-edge justifying operations in cycle witnesses, and boolean `witness_minimal` flag.

---

## 4. Key Decisions & Approvals

| Decision | Topic | Status | User Approval Reference |
|---|---|---|---|
| **D-1** | Full Hierarchical Profile | Approved | "Compute the full hierarchical verdict profile always; --level only sets the exit code." |
| **D-2** | SCC Cycle Search Bound | Approved | "SCC cap: approved. Candidates by edge index, configurable, reported in the verdict, 'witness not proven minimal' when capped." |
| **D-3** | Incompatible Order Handling | Approved | "If reads on a key are not all prefixes of one chain, the version order is not inferable. Report incompatible-order and do NOT emit rw/ww edges from a guessed linearization. Use only the longest consistent chain, or exclude the key." |
| **D-4** | SimDB Fault Injection | Approved | "simdb must support crash mid-transaction (orphan or aborted writes, G1a controls) and crash after commit before ack (info)." |
| **D-5** | JSON Schema Extensions | Approved | "JSON schema approved: add schema_version, per-edge justifying ops, witness_minimal. Keep the one-line text witness." |
| **D-6** | Witness Formatting | Approved | No duplicated start node, no "Cycle:" prefix; clean arrow-delimited transaction path (`T0 -> T1 -> T0`). |

---

## 5. Exact Resume Commands

### Build Engine and Tests
```bash
cmake -B build -G Ninja
cmake --build build
ctest --test-dir build --output-on-failure
```

### Run IsoCheck on a History
```bash
./build/cli/isocheck tests/fixtures/clean_serial.jsonl
./build/cli/isocheck --json tests/fixtures/g0_positive.jsonl
```

### Run PostgreSQL Campaign (60 Runs)
```bash
python harness/run_campaign.py \
  --checker-bin ./build/cli/isocheck \
  --runs 20 \
  --clients 8 \
  --txns 65 \
  --output-dir campaign_results
```

### Run Buggy Positive Control
```bash
# Read Committed (expect 100% flagged)
python harness/buggy_runner.py \
  --checker-bin ./build/cli/isocheck \
  --isolation "READ COMMITTED" \
  --runs 20 \
  --output-dir buggy_results_rc

# Serializable (expect 100% clean due to SSI)
python harness/buggy_runner.py \
  --checker-bin ./build/cli/isocheck \
  --isolation "SERIALIZABLE" \
  --runs 20 \
  --output-dir buggy_results_ser
```

### Run Elle Comparative Verification
```bash
python tests/elle/test_fixtures_batch.py
```
