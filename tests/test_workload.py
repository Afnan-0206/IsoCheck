"""
Pytest unit tests for IsoCheck Workload Generator.
Validates:
1. Append Value Uniqueness (globally unique across clients and threads)
2. Seed Determinism (same seed reproduces exact same sequence)
3. Key Skew Distribution (Zipfian skew concentrates accesses on key 0)
"""

import concurrent.futures
import pytest
from harness.workload import WorkloadConfig, WorkloadGenerator, sample_zipfian


def test_unique_append_values_single_generator():
    """Verify that a single generator never emits duplicate append values."""
    config = WorkloadConfig(num_keys=5, ops_per_txn=5, read_ratio=0.0, seed=123)
    gen = WorkloadGenerator(process_id=1, config=config)

    seen = set()
    for _ in range(100):
        txn = gen.next_transaction_template()
        for op, key, val in txn:
            if op == "append":
                assert val not in seen, f"Duplicate value {val} emitted by process 1"
                seen.add(val)
    assert len(seen) == 500


def test_unique_append_values_multi_process_concurrent():
    """Verify that multiple concurrent client generators produce globally disjoint value sets."""
    config = WorkloadConfig(num_keys=10, ops_per_txn=4, read_ratio=0.2, seed=42)
    num_processes = 8
    txns_per_process = 50

    all_values = []
    import threading
    lock = threading.Lock()

    def run_worker(pid: int):
        gen = WorkloadGenerator(process_id=pid, config=config)
        vals = []
        for _ in range(txns_per_process):
            txn = gen.next_transaction_template()
            for op, key, val in txn:
                if op == "append":
                    vals.append(val)
        with lock:
            all_values.extend(vals)

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_processes) as executor:
        futures = [executor.submit(run_worker, p) for p in range(num_processes)]
        for f in futures:
            f.result()

    unique_set = set(all_values)
    assert len(all_values) == len(unique_set), (
        f"Detected duplicate values across processes: total={len(all_values)}, unique={len(unique_set)}"
    )


def test_seed_determinism():
    """Verify that running with the same seed reproduces the exact sequence of transactions."""
    config1 = WorkloadConfig(num_keys=5, ops_per_txn=3, read_ratio=0.5, key_skew=0.8, seed=9999)
    config2 = WorkloadConfig(num_keys=5, ops_per_txn=3, read_ratio=0.5, key_skew=0.8, seed=9999)

    gen1 = WorkloadGenerator(process_id=0, config=config1)
    gen2 = WorkloadGenerator(process_id=0, config=config2)

    for i in range(50):
        t1 = gen1.next_transaction_template()
        t2 = gen2.next_transaction_template()
        assert t1 == t2, f"Discrepancy at transaction {i} with identical seeds"


def test_seed_non_determinism_across_different_seeds():
    """Verify that different seeds produce distinct transaction streams."""
    config1 = WorkloadConfig(seed=1111)
    config2 = WorkloadConfig(seed=2222)

    gen1 = WorkloadGenerator(process_id=0, config=config1)
    gen2 = WorkloadGenerator(process_id=0, config=config2)

    diffs = sum(1 for _ in range(20) if gen1.next_transaction_template() != gen2.next_transaction_template())
    assert diffs > 0


def test_key_skew_zipfian_shape():
    """Verify that Zipfian skew s=1.0 concentrates accesses monotonically on lower keys."""
    import random
    rng = random.Random(42)
    n = 5
    s = 1.2
    samples = [sample_zipfian(n, s, rng) for _ in range(5000)]

    counts = {k: samples.count(k) for k in range(n)}
    # Key 0 must have significantly more samples than key 1, key 1 > key 2, etc.
    assert counts[0] > counts[1] > counts[2] > counts[3] > counts[4]
    # In Zipfian s=1.2, key 0 should capture >40% of all accesses
    assert counts[0] / len(samples) > 0.40
