import json
import os
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(r"c:\Users\hp\Desktop\Projects\IsoCheck")
ELLE_DIR = PROJECT_ROOT / "tests" / "elle"
TEMP_EDN_DIR = ELLE_DIR / "temp_edn"
TEMP_EDN_DIR.mkdir(parents=True, exist_ok=True)
CHECKER_BIN = r"\\wsl.localhost\Ubuntu\home\hp\isocheck-build\cli\isocheck"

sys.path.insert(0, str(ELLE_DIR))
from convert import convert_file

# Check if checker bin is accessible from windows or via wsl
def run_isocheck(p: Path):
    cmd = ["wsl", "-e", "/home/hp/isocheck-build/cli/isocheck", "--json", str(p).replace("\\", "/").replace("c:", "/mnt/c")]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return json.loads(proc.stdout)
    except Exception as e:
        return {"valid": False, "anomalies": [{"type": f"parse_error: {e}"}]}

def run_elle(edn_filename: str):
    docker_mount = f"{ELLE_DIR}:/app"
    container_edn = f"/app/temp_edn/{edn_filename}"
    cmd = [
        "docker", "run", "--rm",
        "-v", docker_mount,
        "eclipse-temurin:21-jdk",
        "java", "-jar", "/app/elle-cli.jar",
        "-m", "list-append",
        "-f", "edn",
        "-v", "json",
        container_edn
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        out = proc.stdout.strip()
        idx = out.find("{")
        if idx != -1:
            return json.loads(out[idx:])
        return {"valid?": False, "raw": out}
    except subprocess.TimeoutExpired:
        return {"valid?": False, "timeout": True, "error": "Elle timed out (Jepsen fold deadlock on sparse history)"}
    except Exception as e:
        return {"valid?": False, "error": str(e)}

fixtures = sorted((PROJECT_ROOT / "tests" / "fixtures").glob("*.jsonl"))

# Also select 10+ real histories
real_histories = []
camp = PROJECT_ROOT / "campaign_results"
if camp.exists():
    real_histories.extend(sorted(camp.glob("history_read_committed_run_*.jsonl"))[:3])
    real_histories.extend(sorted(camp.glob("history_repeatable_read_run_*.jsonl"))[:3])
    real_histories.extend(sorted(camp.glob("history_serializable_run_*.jsonl"))[:3])

buggy_rc = PROJECT_ROOT / "buggy_results_rc"
if buggy_rc.exists():
    real_histories.extend(sorted(buggy_rc.glob("buggy_read_committed_run_*.jsonl"))[:3])

buggy_ser = PROJECT_ROOT / "buggy_results_ser"
if buggy_ser.exists():
    real_histories.extend(sorted(buggy_ser.glob("buggy_serializable_run_*.jsonl"))[:2])

all_targets = [(f, "Fixture") for f in fixtures] + [(h, "Real Postgres") for h in real_histories]

print(f"{'Target History':<40} | {'Category':<13} | {'IsoCheck':<20} | {'Elle Verdict':<25} | Agree?")
print("-" * 110)

results = []
for p, cat in all_targets:
    edn_file = f"{p.stem}.edn"
    edn_path = TEMP_EDN_DIR / edn_file
    convert_file(p, edn_path)

    iso_res = run_isocheck(p)
    elle_res = run_elle(edn_file)

    iso_valid = iso_res.get("valid", False)
    iso_anoms = [a.get("type") for a in iso_res.get("anomalies", [])]
    iso_str = "CLEAN" if iso_valid else f"ANOM: {','.join(sorted(set(iso_anoms)))}"

    elle_valid = elle_res.get("valid?", False)
    elle_anoms = elle_res.get("anomaly-types", [])
    if elle_res.get("timeout"):
        elle_str = "TIMEOUT (Jepsen deadlock)"
    else:
        elle_str = "CLEAN" if elle_valid else f"ANOM: {','.join(sorted(set(elle_anoms)))}"

    # Determine agreement
    if elle_res.get("timeout"):
        agree_str = "DIFF (Elle hang)"
    elif iso_valid == elle_valid:
        agree_str = "AGREE"
    else:
        agree_str = "DIFF"

    print(f"{p.name:<40} | {cat:<13} | {iso_str:<20} | {elle_str:<25} | {agree_str}")
    sys.stdout.flush()

    results.append({
        "file": p.name,
        "category": cat,
        "isocheck_valid": iso_valid,
        "isocheck_anomalies": iso_anoms,
        "elle_valid": elle_valid,
        "elle_anomalies": elle_anoms,
        "agree": agree_str,
        "elle_raw": elle_res,
    })

with open(ELLE_DIR / "differential_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print("\nFinished differential test suite. Saved to tests/elle/differential_results.json")
