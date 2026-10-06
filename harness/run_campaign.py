"""
IsoCheck Phase 1 Acceptance Campaign:
Runs 20 seeded test runs per isolation level (Read Committed, Repeatable Read, Serializable)
against Postgres and checks each history with the IsoCheck checker.
Produces a comprehensive summary table for the Phase 1 report.
"""

import argparse
import json
import logging
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, Any, List

from workload import WorkloadConfig
from runner import count_sqlstates, run_workload

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("campaign")


def run_campaign(
    conn_info: Dict[str, Any],
    checker_bin: str,
    output_dir: str = "campaign_results",
    runs_per_level: int = 20,
    clients: int = 8,
    txns_per_client: int = 65,
) -> Dict[str, List[Dict[str, Any]]]:

    os.makedirs(output_dir, exist_ok=True)
    levels = ["READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"]
    results = {level: [] for level in levels}

    total_runs = len(levels) * runs_per_level
    current_run = 0

    for level in levels:
        logger.info(f"=== Starting campaign for {level} ({runs_per_level} runs) ===")
        for i in range(runs_per_level):
            current_run += 1
            seed = 1000 * (levels.index(level) + 1) + i
            history_file = os.path.join(
                output_dir,
                f"history_{level.lower().replace(' ', '_')}_run_{i+1}_seed_{seed}.jsonl"
            )

            config = WorkloadConfig(
                num_keys=4,          # High contention across 4 keys
                ops_per_txn=3,
                read_ratio=0.5,
                key_skew=0.9,        # Skewed towards key 0/1 to provoke races
                seed=seed,
            )

            logger.info(f"[{current_run}/{total_runs}] Running {level} run {i+1} (seed={seed})...")
            history = run_workload(
                conn_info=conn_info,
                isolation_level=level,
                num_clients=clients,
                txns_per_client=txns_per_client,
                config=config,
                output_file=history_file,
            )

            # Run checker binary with --json output
            if sys.platform == "win32" and checker_bin.startswith("/"):
                abs_hist = str(Path(history_file).resolve())
                drive = abs_hist[0].lower()
                wsl_hist = f"/mnt/{drive}/" + abs_hist[3:].replace("\\", "/")
                cmd = ["wsl", "-e", checker_bin, "--json", wsl_hist]
            else:
                cmd = [checker_bin, "--json", history_file]
            check_proc = subprocess.run(cmd, capture_output=True, text=True)

            try:
                check_data = json.loads(check_proc.stdout)
            except Exception as e:
                logger.error(f"Failed to parse checker output: {check_proc.stdout}\nStderr: {check_proc.stderr}")
                check_data = {
                    "valid": False,
                    "anomalies": [{"type": "checker_crash", "description": str(e)}],
                    "stats": {"transactions": len(history) // 2}
                }

            run_result = {
                "run": i + 1,
                "seed": seed,
                "valid": check_data.get("valid", False),
                "stats": check_data.get("stats", {}),
                "anomalies": [a.get("type") for a in check_data.get("anomalies", [])],
                "anomaly_details": check_data.get("anomalies", []),
                "history_file": history_file,
                "sqlstates": count_sqlstates(history),
            }
            results[level].append(run_result)

            status_str = "CLEAN" if run_result["valid"] else f"ANOMALIES: {','.join(run_result['anomalies'])}"
            logger.info(f"  -> Run {i+1} Result: {status_str}")

    return results


def print_summary_table(results: Dict[str, List[Dict[str, Any]]]):
    print("\n" + "=" * 95)
    print("                              PHASE 1 ACCEPTANCE CAMPAIGN SUMMARY")
    print("=" * 95)
    print(f"{'Isolation Level':<18} | {'Runs':<5} | {'Clean':<5} | {'Anom':<5} | {'Total OK':<9} | {'Fail (Abort)':<13} | {'Info':<5} | {'Anomalies'}")
    print("-" * 95)

    for level, runs in results.items():
        total = len(runs)
        clean = sum(1 for r in runs if r["valid"])
        anomalous = total - clean
        total_ok = sum(r["stats"].get("ok", 0) for r in runs)
        total_fail = sum(r["stats"].get("fail", 0) for r in runs)
        total_info = sum(r["stats"].get("info", 0) for r in runs)
        types_observed = set()
        for r in runs:
            types_observed.update(r["anomalies"])
        types_str = ", ".join(sorted(types_observed)) if types_observed else "None"
        print(f"{level:<18} | {total:<5} | {clean:<5} | {anomalous:<5} | {total_ok:<9} | {total_fail:<13} | {total_info:<5} | {types_str}")
        sqlstate_counts = {
            "40001": {"fail": 0, "info": 0},
            "40P01": {"fail": 0, "info": 0},
            "other": {"fail": 0, "info": 0},
        }
        for run in runs:
            for row in run.get("sqlstates", []):
                state = row["sqlstate"]
                bucket = state if state in ("40001", "40P01") else "other"
                if row["status"] in ("fail", "info"):
                    sqlstate_counts[bucket][row["status"]] += row["count"]
        print(f"  SQLSTATE fail/info: {sqlstate_counts}")
    print("=" * 95 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Phase 1 Acceptance Campaign")
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--port", type=int, default=5432)
    parser.add_argument("--user", default="isocheck_app")
    parser.add_argument("--password", default="isocheck_app")
    parser.add_argument("--dbname", default="isocheck")
    parser.add_argument("--checker-bin", required=True, help="Path to compiled isocheck binary")
    parser.add_argument("--runs", type=int, default=20, help="Runs per isolation level")
    parser.add_argument("--clients", type=int, default=8, help="Clients per run (>=8)")
    parser.add_argument("--txns", type=int, default=65, help="Txns per client (>=65 for 520+ txns)")
    parser.add_argument("--output-dir", default="campaign_results")

    args = parser.parse_args()

    conn_info = {
        "host": args.host,
        "port": args.port,
        "user": args.user,
        "password": args.password,
        "dbname": args.dbname,
    }

    results = run_campaign(
        conn_info=conn_info,
        checker_bin=args.checker_bin,
        output_dir=args.output_dir,
        runs_per_level=args.runs,
        clients=args.clients,
        txns_per_client=args.txns,
    )

    print_summary_table(results)

    # Save complete JSON summary
    summary_path = os.path.join(args.output_dir, "campaign_summary.json")
    with open(summary_path, "w") as f:
        json.dump(results, f, indent=2)
    logger.info(f"Campaign summary saved to {summary_path}")


if __name__ == "__main__":
    main()
