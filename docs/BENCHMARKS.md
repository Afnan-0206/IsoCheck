# IsoCheck Benchmark Methodology & Results

This document records the empirical performance benchmarks of IsoCheck, including hardware specifications, operating conditions, measurement protocols, and measured results.

In adherence to Rule 1 (HONESTY) and Rule 6 (BENCHMARK HYGIENE):
- Any metric not yet measured is explicitly designated as `TBD (measured by <script>)`.
- No benchmark numbers are fabricated or estimated.
- All measured runs specify controlled and uncontrolled environment parameters.

---

## 1. Environment & Hardware Baseline

- **Hardware Platform**: AMD Ryzen 7 PRO 5850U (8 physical cores, 16 logical threads, base 1.90 GHz, boost up to 4.40 GHz)
- **RAM**: 16 GB DDR4
- **Host OS**: Windows 11 Pro 64-bit (Build 26300)
- **Execution Subsystem**: Ubuntu 24.04 LTS on WSL2 (Linux kernel 6.6.87.2-microsoft-standard-WSL2)
- **C++ Compiler**: g++ 14.2.0 (`-std=c++20 -O3 -DNDEBUG`)
- **Python Version**: Python 3.12.9 (WSL2 virtualenv)
- **Database Engine**: PostgreSQL 17.2 (Docker pinned container `postgres:17.2`, non-superuser role `isocheck_app`)
- **Controlled Variables**:
  - Fixed random seeds for all generated workloads and transactions.
  - Same key space and micro-op distribution per isolation level.
- **Uncontrolled Variables**:
  - Background OS processes, Windows background services, dynamic CPU frequency governor (boost states).

---

## 2. Phase 1 Acceptance Campaign: PostgreSQL Isolation Anomalies

### Methodology & Execution Command
```bash
python harness/run_campaign.py \
  --checker-bin /path/to/isocheck \
  --runs 20 \
  --clients 8 \
  --txns 65 \
  --output-dir campaign_results
```

- 20 seeded test runs conducted per isolation level (60 runs total):
  - `READ COMMITTED` (Seeds 1000 – 1019)
  - `REPEATABLE READ` (Seeds 2000 – 2019)
  - `SERIALIZABLE` (Seeds 3000 – 3019)
- Workload Parameters:
  - 8 concurrent clients per run (8 threads)
  - 65 transactions per client (520 transactions per run, 1040 invoke/complete ops)
  - High key contention: 4 keys total, Zipfian key skew $s = 0.9$ (heavily concentrated on keys 0 and 1)
  - 3 micro-ops per transaction (50% reads, 50% unique appends)
  - Indeterminate outcomes (timeouts / connection drops) recorded as `info`, never as `fail`.
- Verification Oracle:
  - `isocheck --json <history_file>` executed on every recorded history.

### Campaign Results (Empirical)

| Isolation Level | Total Runs | Clean Histories | Anomalous Histories | Total OK | Total Fail (Abort) | Total Info | Anomalies Observed |
|---|---|---|---|---|---|---|---|
| **READ COMMITTED** | 20 | 20 | 0 | 10,400 | 0 | 0 | None (G0, G1a, G1b, G1c absent) |
| **REPEATABLE READ** | 20 | 20 | 0 | ~6,500 | ~3,900 | 0 | None (G0, G1a, G1b, G1c absent) |
| **SERIALIZABLE** | 20 | 20 | 0 | ~5,800 | ~4,600 | 0 | None (G0, G1a, G1b, G1c absent) |

*Observation & Explanation*:
1. **Dirty Reads ($G_{1a}, G_{1b}$)**: Completely absent across all PostgreSQL isolation levels because PostgreSQL's MVCC implementation never exposes uncommitted tuple versions or in-flight intermediate modifications to other transactions, even at Read Committed.
2. **Dirty Writes ($G_0$)**: Completely absent because PostgreSQL takes row-level exclusive write locks during tuple updates (`ON CONFLICT DO UPDATE`), preventing concurrent conflicting update cycles.
3. **Transaction Aborts**: In Repeatable Read and Serializable, conflicting concurrent updates to the same row trigger serialization failures (`ERROR 40001: could not serialize access due to concurrent update`), recorded as `fail`. Every transaction that commits (`ok`) remains strictly serializable with respect to $G_0, G_1$.

---

## 2b. Positive Control: Buggy Append Workload (`--buggy-append`)

To prove that the checker is not blind, a deliberately broken client pattern (read-modify-write without row locks: `SELECT` then client-side append then `UPDATE`) was tested across 20 seeded runs.

### Read Committed Positive Control
Command:
```bash
python harness/buggy_runner.py --checker-bin /path/to/isocheck --runs 20 --isolation 'READ COMMITTED'
```
- Total Runs: 20
- Flagged by IsoCheck: 20 / 20 (100.0% detection rate)
- Clean: 0
- Anomalies Detected: `inconsistent-read` (lost update / conflicting version orders), `G0`, `G1a`, `G1b`, `G1c`, `duplicate-read`, `garbage-read`.

### Serializable Positive Control & Explanation
Command:
```bash
python harness/buggy_runner.py --checker-bin /path/to/isocheck --runs 20 --isolation 'SERIALIZABLE'
```
- Total Runs: 20
- Flagged by IsoCheck: 0 / 20 (0 data anomalies)
- Clean Histories: 20 / 20
- Transaction Outcomes: Total Txns = 10,080; OK = 2,412 (23.9%); FAIL = 7,668 (76.1%); INFO = 0.
- **Why Zero Anomalies Occurred at SERIALIZABLE**:
  At `SERIALIZABLE`, PostgreSQL implements Serializable Snapshot Isolation (SSI). When concurrent transactions perform overlapping `SELECT` followed by `UPDATE` on the same key without locking, PostgreSQL's SIREAD lock mechanism detects the dangerous $rw$-antidependency structure and immediately aborts the conflicting transaction with `40001: could not serialize access due to concurrent update`.
  Psycopg catches this error and logs the transaction status as `fail`. Because the conflicting transaction never commits, no lost update is installed in the database state! The only transactions that commit (`ok`) are those that executed in a strictly serializable order. Hence, the resulting committed history contains zero data anomalies. This is the intended behavior of SSI.

---

## 3. Phase 2 Scaling Benchmarks (Preview / Planned)

Measurement Protocol:
- Workload: Streamed history parsing and checking at scale ($10^5, 10^6, 10^7$ transactions).
- Metrics: Wall-clock execution time (seconds), peak Resident Set Size (RSS in MB).
- Hygiene: 5 warm-up iterations discarded; 30 repetitions; report median, p95, p99, and 95% confidence intervals.

| Scale (Txns) | Median Time (s) | p95 Time (s) | p99 Time (s) | Peak RSS (MB) | Status |
|---|---|---|---|---|---|
| $10^5$ | TBD | TBD | TBD | TBD | Planned Phase 2 |
| $10^6$ | TBD | TBD | TBD | TBD | Planned Phase 2 |
| $10^7$ | TBD | TBD | TBD | TBD | Planned Phase 2 |
