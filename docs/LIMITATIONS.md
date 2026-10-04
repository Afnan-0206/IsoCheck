# IsoCheck Limitations & Scope Boundaries

Honesty is a core rule of this project. This document explicitly identifies what IsoCheck can and CANNOT prove, along with known limitations of black-box isolation checking.

---

## 1. What IsoCheck Proves (Soundness)

- **Sound Witness Guarantee**: If IsoCheck flags an anomaly (G0, G1a, G1b, G1c, garbage read, inconsistent read), that anomaly is mathematically proven to have occurred in the client-observed history. The cycle or witness provided is an incontrovertible violation of the asserted isolation model.
- **Zero False Positives on Correct Histories**: A compliant database running serializable transactions will yield zero anomalies under IsoCheck.

---

## 2. What IsoCheck Does NOT Prove (Completeness)

- **Passing Does Not Guarantee Bug-Freedom**: If IsoCheck reports `VALID` (zero anomalies), it only proves that *this specific execution history* contained no observable violations. A database may still have isolation bugs that were not triggered due to low thread contention, insufficient transaction duration, or unexercised race windows.
- **Black-Box Blindness**: IsoCheck observes only client inputs and outputs. It cannot observe internal database state transitions, unexercised transaction paths, lock acquisition order, or write-ahead log (WAL) records directly.
- **Unread Aborts**: If a transaction aborts, but no subsequent transaction attempts to read the keys it modified, IsoCheck cannot detect if dirty data lingered in memory unless a read exposes it.
- **Info Outcome Ambiguity**: If a transaction experiences a network timeout (`info`) and none of its writes are ever observed by subsequent reads, IsoCheck cannot distinguish between:
  1. The transaction committed, but subsequent operations never accessed those keys.
  2. The transaction aborted cleanly.
- **Phase 1 Boundary**: Phase 1 implements G0, G1a, G1b, and G1c (WW and WR cycles/dependencies). Anti-dependencies (RW edges) and G2 / G-single classification are introduced in Phase 2. Therefore, anomalies requiring anti-dependency cycle witnesses (e.g. classical Write Skew under Snapshot Isolation) are detected in Phase 2, not Phase 1.
