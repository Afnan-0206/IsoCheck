"""
IsoCheck Test Runner & Campaign Harness.
Executes concurrent clients against Postgres, records histories in JSONL format,
and invokes the IsoCheck checker binary to verify isolation guarantees.
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
from typing import List, Dict, Any, Optional

import psycopg

from workload import WorkloadConfig, WorkloadGenerator
from postgres import PostgresHarness

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("isocheck.runner")


class GlobalIndex:
    """Thread-safe monotonic index generator for history operations."""
    def __init__(self, start: int = 0):
        self._val = start
        self._lock = threading.Lock()

    def next(self) -> int:
        with self._lock:
            cur = self._val
            self._val += 1
            return cur


def count_sqlstates(history: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    counts: Dict[tuple, int] = {}
    for op in history:
        if op.get("type") not in ("fail", "info"):
            continue
        key = (op["type"], op.get("sqlstate"))
        counts[key] = counts.get(key, 0) + 1
    return [
        {"status": status, "sqlstate": sqlstate, "count": count}
        for (status, sqlstate), count in sorted(
            counts.items(), key=lambda item: (item[0][0], item[0][1] or "")
        )
    ]


def client_worker(
    process_id: int,
    conn_info: Dict[str, Any],
    isolation_level: str,
    config: WorkloadConfig,
    num_txns: int,
    global_index: GlobalIndex,
    history_out: List[Dict[str, Any]],
    history_lock: threading.Lock,
    stop_event: threading.Event,
):
    """Worker thread running transactions for a single process."""
    gen = WorkloadGenerator(process_id, config)
    harness = PostgresHarness(conn_info, isolation_level)

    try:
        with psycopg.connect(**conn_info) as conn:
            for _ in range(num_txns):
                if stop_event.is_set():
                    break

                template = gen.next_transaction_template()
                # Format template for invoke log: reads have None result
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

                status, observed, sqlstate = harness.execute_transaction(conn, template)
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
                if sqlstate is not None:
                    complete_op["sqlstate"] = sqlstate

                with history_lock:
                    history_out.append(complete_op)

    except Exception as e:
        logger.error(f"Process {process_id} encountered fatal error: {e}")


def run_workload(
    conn_info: Dict[str, Any],
    isolation_level: str,
    num_clients: int,
    txns_per_client: int,
    config: WorkloadConfig,
    output_file: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Run concurrent clients and collect history."""
    harness = PostgresHarness(conn_info, isolation_level)
    harness.init_schema()
    harness.reset_table()

    global_index = GlobalIndex(0)
    history: List[Dict[str, Any]] = []
    history_lock = threading.Lock()
    stop_event = threading.Event()

    threads = []
    logger.info(f"Starting {num_clients} clients at isolation level {isolation_level}...")
    start_time = time.time()

    for pid in range(num_clients):
        t = threading.Thread(
            target=client_worker,
            args=(
                pid,
                conn_info,
                isolation_level,
                config,
                txns_per_client,
                global_index,
                history,
                history_lock,
                stop_event,
            )
        )
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    elapsed = time.time() - start_time
    # Sort history strictly by index to ensure proper chronological order
    history.sort(key=lambda op: op["index"])
    logger.info(f"Finished {len(history)} operations ({len(history)//2} txns) in {elapsed:.2f}s")

    if output_file:
        os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)
        with open(output_file, "w") as f:
            for op in history:
                f.write(json.dumps(op) + "\n")
        logger.info(f"Saved history to {output_file}")

    return history


def main():
    parser = argparse.ArgumentParser(description="IsoCheck Test Runner")
    parser.add_argument("--host", default="localhost", help="Postgres host")
    parser.add_argument("--port", type=int, default=5432, help="Postgres port")
    parser.add_argument("--user", default="isocheck_app", help="Postgres user")
    parser.add_argument("--password", default="isocheck_app", help="Postgres password")
    parser.add_argument("--dbname", default="isocheck", help="Postgres db name")
    parser.add_argument("--isolation", default="READ COMMITTED",
                        choices=["READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"],
                        help="Transaction isolation level")
    parser.add_argument("--clients", type=int, default=4, help="Number of concurrent clients")
    parser.add_argument("--txns", type=int, default=50, help="Transactions per client")
    parser.add_argument("--keys", type=int, default=5, help="Number of distinct keys")
    parser.add_argument("--ops-per-txn", type=int, default=3, help="Micro-ops per transaction")
    parser.add_argument("--skew", type=float, default=0.8, help="Zipfian key skew")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--output", default="history.jsonl", help="Output history file path")
    parser.add_argument("--checker-bin", default=None, help="Path to isocheck CLI binary to run")

    args = parser.parse_args()

    conn_info = {
        "host": args.host,
        "port": args.port,
        "user": args.user,
        "password": args.password,
        "dbname": args.dbname,
    }

    config = WorkloadConfig(
        num_keys=args.keys,
        ops_per_txn=args.ops_per_txn,
        read_ratio=0.5,
        key_skew=args.skew,
        seed=args.seed,
    )

    history = run_workload(
        conn_info=conn_info,
        isolation_level=args.isolation,
        num_clients=args.clients,
        txns_per_client=args.txns,
        config=config,
        output_file=args.output,
    )

    if args.checker_bin and os.path.exists(args.checker_bin):
        logger.info(f"Running checker: {args.checker_bin} {args.output}")
        res = subprocess.run([args.checker_bin, args.output], capture_output=True, text=True)
        print(res.stdout)
        if res.stderr:
            print(res.stderr, file=sys.stderr)
        sys.exit(res.returncode)


if __name__ == "__main__":
    main()
