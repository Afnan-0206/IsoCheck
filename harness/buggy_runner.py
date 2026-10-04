"""
IsoCheck Buggy Append Runner (Positive Control)

Deliberately broken client mode that does SELECT → client-side append → UPDATE
in separate statements at READ COMMITTED with no row lock. This creates a
classic lost-update / incompatible-version-order anomaly window.

The race:
  Client A: SELECT val FROM kv WHERE key=k  → sees [1,2]
  Client B: SELECT val FROM kv WHERE key=k  → sees [1,2]
  Client A: UPDATE kv SET val = '[1,2,3]' WHERE key=k  → ok
  Client B: UPDATE kv SET val = '[1,2,4]' WHERE key=k  → overwrites A's append!

Result: value 3 is lost. The checker should flag this as an inconsistent version
order or lost update.
"""

import argparse
import concurrent.futures
import json
import logging
import os
import subprocess
import sys
import threading
import time
import random
from typing import List, Dict, Any, Optional, Tuple

import psycopg
from psycopg import errors

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("isocheck.buggy")


class GlobalIndex:
    """Thread-safe monotonic index generator."""
    def __init__(self, start: int = 0):
        self._val = start
        self._lock = threading.Lock()

    def next(self) -> int:
        with self._lock:
            cur = self._val
            self._val += 1
            return cur


def buggy_execute_transaction(
    conn: psycopg.Connection,
    template: List[Tuple[str, int, Optional[int]]],
    isolation_level: str,
) -> Tuple[str, List[Any]]:
    """
    Execute a transaction using the BUGGY pattern:
    - For appends: SELECT current value, append in Python, UPDATE with full list
    - No row-level locking (no SELECT FOR UPDATE)
    - Separate statements, not a single atomic upsert

    This is deliberately broken to create lost-update scenarios at READ COMMITTED.
    """
    observed: List[Any] = []
    try:
        with conn.transaction():
            with conn.cursor() as cur:
                cur.execute(f"SET TRANSACTION ISOLATION LEVEL {isolation_level};")

                for op in template:
                    op_type, key, val = op
                    if op_type == "append":
                        # BUGGY: read-modify-write without locking
                        cur.execute("SELECT val FROM kv WHERE key = %s;", (key,))
                        row = cur.fetchone()
                        if row is None:
                            # Key doesn't exist yet — insert it
                            new_list = [val]
                            cur.execute(
                                "INSERT INTO kv (key, val) VALUES (%s, %s::jsonb);",
                                (key, json.dumps(new_list))
                            )
                        else:
                            # BUGGY: read old value, append in Python, write back
                            # Another transaction may have appended between our
                            # SELECT and UPDATE, causing a lost update.
                            raw = row[0]
                            if isinstance(raw, list):
                                current_list = raw
                            else:
                                current_list = json.loads(raw)
                            current_list.append(val)
                            cur.execute(
                                "UPDATE kv SET val = %s::jsonb WHERE key = %s;",
                                (json.dumps(current_list), key)
                            )
                        observed.append(["append", key, val])

                    elif op_type == "r":
                        cur.execute("SELECT val FROM kv WHERE key = %s;", (key,))
                        row = cur.fetchone()
                        if row is None:
                            read_list = None
                        else:
                            raw = row[0]
                            if isinstance(raw, list):
                                read_list = raw
                            else:
                                read_list = json.loads(raw)
                        observed.append(["r", key, read_list])

        return "ok", observed

    except (errors.SerializationFailure, errors.DeadlockDetected):
        return "fail", observed
    except (errors.OperationalError, psycopg.OperationalError):
        return "info", observed
    except Exception as e:
        sqlstate = getattr(e, "sqlstate", None)
        if sqlstate in ("40001", "40P01"):
            return "fail", observed
        return "info", observed


def buggy_client_worker(
    process_id: int,
    conn_info: Dict[str, Any],
    isolation_level: str,
    seed: int,
    num_keys: int,
    num_txns: int,
    ops_per_txn: int,
    global_index: GlobalIndex,
    history_out: List[Dict[str, Any]],
    history_lock: threading.Lock,
):
    """Worker thread running buggy-append transactions."""
    rng = random.Random(seed + process_id * 10007)
    val_counter = 0

    try:
        with psycopg.connect(**conn_info) as conn:
            for _ in range(num_txns):
                template = []
                for _ in range(ops_per_txn):
                    # Heavily skewed to key 0 for maximum contention
                    key = 0 if rng.random() < 0.7 else rng.randint(0, num_keys - 1)
                    is_read = rng.random() < 0.4  # More appends than reads for contention
                    if is_read:
                        template.append(("r", key, None))
                    else:
                        val_counter += 1
                        # Globally unique value: (process_id << 32) | counter
                        val = (process_id << 32) | val_counter
                        template.append(("append", key, val))

                invoke_val = [
                    [op[0], op[1], op[2]] if op[0] == "append" else [op[0], op[1], None]
                    for op in template
                ]

                invoke_idx = global_index.next()
                invoke_time = time.time_ns()
                invoke_op = {
                    "index": invoke_idx,
                    "type": "invoke",
                    "process": process_id,
                    "f": "txn",
                    "value": invoke_val,
                    "time": invoke_time,
                }
                with history_lock:
                    history_out.append(invoke_op)

                status, observed = buggy_execute_transaction(
                    conn, template, isolation_level
                )

                complete_idx = global_index.next()
                complete_time = time.time_ns()
                complete_op = {
                    "index": complete_idx,
                    "type": status,
                    "process": process_id,
                    "f": "txn",
                    "value": observed,
                    "time": complete_time,
                }
                with history_lock:
                    history_out.append(complete_op)

    except Exception as e:
        logger.error(f"Process {process_id} fatal error: {e}")


def run_buggy_workload(
    conn_info: Dict[str, Any],
    isolation_level: str,
    seed: int,
    num_clients: int = 8,
    txns_per_client: int = 63,
    num_keys: int = 3,
    ops_per_txn: int = 3,
    output_file: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Run buggy-append workload and collect history."""
    # Initialize table
    with psycopg.connect(**conn_info, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS kv (
                    key BIGINT PRIMARY KEY,
                    val JSONB NOT NULL DEFAULT '[]'::jsonb
                );
            """)
            cur.execute("TRUNCATE TABLE kv;")

    global_index = GlobalIndex(0)
    history: List[Dict[str, Any]] = []
    history_lock = threading.Lock()

    threads = []
    logger.info(f"Starting {num_clients} BUGGY clients at {isolation_level} (seed={seed})...")
    start_time = time.time()

    for pid in range(num_clients):
        t = threading.Thread(
            target=buggy_client_worker,
            args=(
                pid, conn_info, isolation_level, seed,
                num_keys, txns_per_client, ops_per_txn,
                global_index, history, history_lock,
            )
        )
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    elapsed = time.time() - start_time
    history.sort(key=lambda op: op["index"])
    logger.info(f"Finished {len(history)} ops ({len(history)//2} txns) in {elapsed:.2f}s")

    if output_file:
        os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)
        with open(output_file, "w") as f:
            for op in history:
                f.write(json.dumps(op) + "\n")
        logger.info(f"Saved history to {output_file}")

    return history


def main():
    parser = argparse.ArgumentParser(description="IsoCheck Buggy Append Positive Control")
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--port", type=int, default=5432)
    parser.add_argument("--user", default="isocheck_app")
    parser.add_argument("--password", default="isocheck_app")
    parser.add_argument("--dbname", default="isocheck")
    parser.add_argument("--checker-bin", required=True, help="Path to isocheck binary")
    parser.add_argument("--runs", type=int, default=20, help="Number of seeded runs")
    parser.add_argument("--clients", type=int, default=8)
    parser.add_argument("--txns", type=int, default=63, help="Txns per client (total ~500)")
    parser.add_argument("--keys", type=int, default=3, help="Keyspace size")
    parser.add_argument("--isolation", default="READ COMMITTED",
                        choices=["READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"])
    parser.add_argument("--output-dir", default="buggy_results")

    args = parser.parse_args()

    conn_info = {
        "host": args.host,
        "port": args.port,
        "user": args.user,
        "password": args.password,
        "dbname": args.dbname,
    }

    os.makedirs(args.output_dir, exist_ok=True)
    results = []

    for i in range(args.runs):
        seed = 5000 + i
        history_file = os.path.join(
            args.output_dir,
            f"buggy_{args.isolation.lower().replace(' ', '_')}_run_{i+1}_seed_{seed}.jsonl"
        )

        history = run_buggy_workload(
            conn_info=conn_info,
            isolation_level=args.isolation,
            seed=seed,
            num_clients=args.clients,
            txns_per_client=args.txns,
            num_keys=args.keys,
            output_file=history_file,
        )

        # Run checker
        cmd = [args.checker_bin, "--json", history_file]
        check_proc = subprocess.run(cmd, capture_output=True, text=True)
        try:
            check_data = json.loads(check_proc.stdout)
        except Exception as e:
            logger.error(f"Checker parse error: {check_proc.stdout}\nStderr: {check_proc.stderr}")
            check_data = {"valid": False, "anomalies": [{"type": "checker_crash"}], "stats": {}}

        run_result = {
            "run": i + 1,
            "seed": seed,
            "valid": check_data.get("valid", False),
            "anomalies": [a.get("type") for a in check_data.get("anomalies", [])],
            "stats": check_data.get("stats", {}),
        }
        results.append(run_result)

        status_str = "CLEAN" if run_result["valid"] else f"FLAGGED: {','.join(run_result['anomalies'])}"
        logger.info(f"  Run {i+1} (seed={seed}): {status_str}")

    # Summary
    flagged = sum(1 for r in results if not r["valid"])
    clean = sum(1 for r in results if r["valid"])
    all_anomaly_types = set()
    for r in results:
        all_anomaly_types.update(r["anomalies"])

    print(f"\n{'='*60}")
    print(f"BUGGY APPEND POSITIVE CONTROL ({args.isolation})")
    print(f"{'='*60}")
    print(f"Total runs:  {len(results)}")
    print(f"Flagged:     {flagged}")
    print(f"Clean:       {clean}")
    print(f"Anomaly types observed: {sorted(all_anomaly_types) if all_anomaly_types else 'NONE'}")
    if clean == len(results):
        print("\nWARNING: Checker found NO anomalies in buggy workload!")
        print("This suggests the checker may be blind. Investigate before proceeding.")
    print(f"{'='*60}\n")

    # Save JSON summary
    summary_path = os.path.join(args.output_dir, "buggy_summary.json")
    with open(summary_path, "w") as f:
        json.dump({"isolation": args.isolation, "results": results}, f, indent=2)


if __name__ == "__main__":
    main()
