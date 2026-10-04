#!/usr/bin/env python3
"""
Differential test runner comparing IsoCheck against Elle (Jepsen).
Runs in pinned Docker JDK image (eclipse-temurin:21-jdk) on EDN-converted histories.
Outputs a complete comparison table and explanations for every verdict.
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, Any, List

from convert import convert_file

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ELLE_DIR = PROJECT_ROOT / "tests" / "elle"
TEMP_EDN_DIR = ELLE_DIR / "temp_edn"
DOCKER_IMAGE = "eclipse-temurin:21-jdk"
CHECKER_BIN = Path(os.environ.get("CHECKER_BIN", str(Path.home() / "isocheck-build" / "cli" / "isocheck")))


def run_isocheck(history_path: Path) -> Dict[str, Any]:
    cmd = [str(CHECKER_BIN), "--json", str(history_path)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return json.loads(proc.stdout)
    except Exception as e:
        return {
            "valid": False,
            "anomalies": [{"type": "crash", "description": f"{e}: {proc.stderr}"}],
            "stats": {},
        }


def run_elle(edn_filename: str) -> Dict[str, Any]:
    docker_mount = f"{ELLE_DIR}:/app"
    container_edn_path = f"/app/temp_edn/{edn_filename}"
    cmd = [
        "docker", "run", "--rm",
        "-v", docker_mount,
        DOCKER_IMAGE,
        "java", "-jar", "/app/elle-cli.jar",
        "-m", "list-append",
        "-f", "edn",
        "-v", "json",
        container_edn_path,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    output = proc.stdout.strip()
    # Find JSON payload in stdout (ignoring warning lines)
    json_start = output.find("{")
    if json_start != -1:
        json_str = output[json_start:]
        try:
            return json.loads(json_str)
        except Exception as e:
            return {"valid?": False, "error": f"JSON parse error: {e}", "raw": output}
    return {"valid?": False, "error": f"No JSON output: {output}, stderr: {proc.stderr}"}


def main():
    TEMP_EDN_DIR.mkdir(parents=True, exist_ok=True)

    fixtures = sorted((PROJECT_ROOT / "tests" / "fixtures").glob("*.jsonl"))

    real_histories = []
    campaign_dir = PROJECT_ROOT / "campaign_results"
    if campaign_dir.exists():
        real_histories.extend(sorted(campaign_dir.glob("history_read_committed_run_*.jsonl"))[:3])
        real_histories.extend(sorted(campaign_dir.glob("history_repeatable_read_run_*.jsonl"))[:3])
        real_histories.extend(sorted(campaign_dir.glob("history_serializable_run_*.jsonl"))[:3])

    buggy_dir = PROJECT_ROOT / "buggy_results_rc"
    if buggy_dir.exists():
        real_histories.extend(sorted(buggy_dir.glob("buggy_read_committed_run_*.jsonl"))[:3])

    buggy_ser_dir = PROJECT_ROOT / "buggy_results_ser"
    if buggy_ser_dir.exists():
        real_histories.extend(sorted(buggy_ser_dir.glob("buggy_serializable_run_*.jsonl"))[:2])

    all_targets = [(f, "Fixture") for f in fixtures] + [(h, "Real Postgres") for h in real_histories]

    results = []

    print(f"{'History File':<38} | {'Category':<13} | {'IsoCheck':<18} | {'Elle':<18} | {'Agree?'}")
    print("-" * 105)

    for path, category in all_targets:
        edn_name = f"{path.stem}.edn"
        edn_path = TEMP_EDN_DIR / edn_name

        try:
            convert_file(path, edn_path)
        except Exception as e:
            print(f"{path.name:<38} | {category:<13} | ERROR: {e}")
            continue

        iso_res = run_isocheck(path)
        elle_res = run_elle(edn_name)

        iso_valid = iso_res.get("valid", False)
        iso_anomalies = [a.get("type") for a in iso_res.get("anomalies", [])]
        iso_str = "CLEAN" if iso_valid else f"ANOM: {','.join(sorted(set(iso_anomalies)))}"

        elle_valid = elle_res.get("valid?", False)
        elle_anomalies = elle_res.get("anomaly-types", [])
        elle_str = "CLEAN" if elle_valid else f"ANOM: {','.join(sorted(set(elle_anomalies)))}"

        agree = (iso_valid == elle_valid)

        agree_str = "YES" if agree else "NO"
        print(f"{path.name:<38} | {category:<13} | {iso_str:<18} | {elle_str:<18} | {agree_str}")

        results.append({
            "history": path.name,
            "category": category,
            "isocheck_valid": iso_valid,
            "isocheck_anomalies": iso_anomalies,
            "elle_valid": elle_valid,
            "elle_anomalies": elle_anomalies,
            "agree": agree,
        })

    summary_file = ELLE_DIR / "differential_results.json"
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved differential test results to {summary_file}")


if __name__ == "__main__":
    main()
