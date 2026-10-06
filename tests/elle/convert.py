#!/usr/bin/env python3
"""
Converts IsoCheck JSONL transaction histories into EDN format for elle-cli.

IsoCheck JSONL format:
{"index": 0, "type": "invoke", "process": 0, "f": "txn", "value": [["append", 1, 1]], "time": 0}
{"index": 1, "type": "ok", "process": 0, "f": "txn", "value": [["append", 1, 1]], "time": 100}

Elle EDN format:
{:index 0, :type :invoke, :process 0, :f :txn, :value [[:append 1 1]], :time 0}
{:index 1, :type :ok, :process 0, :f :txn, :value [[:append 1 1]], :time 100}
"""

import json
import sys
from pathlib import Path

OP_TYPES = {"invoke", "ok", "fail", "info"}


def validate_history(ops):
    """Reject malformed operation sequences before converting to Elle EDN."""
    pending = {}
    for expected_index, data in enumerate(ops):
        if data.get("index") != expected_index:
            raise ValueError(
                f"operation index {data.get('index')} is not dense; expected {expected_index}"
            )
        op_type = data.get("type")
        process = data.get("process")
        if op_type not in OP_TYPES:
            raise ValueError(f"operation {expected_index} has unsupported type {op_type!r}")
        if not isinstance(process, int):
            raise ValueError(f"operation {expected_index} has non-integer process")
        if op_type == "invoke":
            if process in pending:
                raise ValueError(f"process {process} invoked twice without completion")
            pending[process] = expected_index
        elif process not in pending:
            raise ValueError(f"operation {expected_index} has no matching invoke")
        else:
            del pending[process]

        value = data.get("value", [])
        if not isinstance(value, list):
            raise ValueError(f"operation {expected_index} value is not a list")
        for mop in value:
            if not isinstance(mop, list) or len(mop) != 3:
                raise ValueError(f"operation {expected_index} has malformed micro-op {mop!r}")
            if mop[0] in ("append", "w", "write"):
                continue
            if mop[0] in ("r", "read"):
                continue
            raise ValueError(f"operation {expected_index} has unknown micro-op {mop[0]!r}")

    if pending:
        raise ValueError(f"history ends with uncompleted invokes for processes {sorted(pending)}")


def mop_to_edn(mop) -> str:
    """Convert a single micro-op tuple/list to EDN representation."""
    op_type = mop[0]
    key = mop[1]
    arg = mop[2]

    if op_type in ("append", "w", "write"):
        return f"[:append {key} {arg}]"
    elif op_type in ("r", "read"):
        if arg is None:
            return f"[:r {key} nil]"
        elif isinstance(arg, list):
            vals_str = " ".join(str(v) for v in arg)
            return f"[:r {key} [{vals_str}]]"
        else:
            return f"[:r {key} {arg}]"
    else:
        raise ValueError(f"Unknown micro-op type: {op_type}")


def json_op_to_edn(data: dict) -> str:
    """Convert an IsoCheck history operation map to an EDN map."""
    idx = data.get("index", 0)
    op_type = data.get("type", "invoke")
    proc = data.get("process", 0)
    f_val = data.get("f", "txn")
    time_val = data.get("time", 0)
    val_list = data.get("value", [])

    edn_mops = [mop_to_edn(mop) for mop in val_list]
    edn_val = "[" + " ".join(edn_mops) + "]"

    return (
        f"{{:index {idx}, :type :{op_type}, :process {proc}, "
        f":f :{f_val}, :value {edn_val}, :time {time_val}}}"
    )


def convert_file(src_path: Path, dst_path: Path):
    """Convert a JSONL history file to an EDN history file."""
    ops = []
    with open(src_path, "r", encoding="utf-8") as in_f:
        for line in in_f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            ops.append(json.loads(line))

    validate_history(ops)
    with open(dst_path, "w", encoding="utf-8") as out_f:
        for data in ops:
            out_f.write(json_op_to_edn(data) + "\n")


def main():
    if len(sys.argv) < 2:
        print("Usage: convert.py <input.jsonl> [output.edn]", file=sys.stderr)
        sys.exit(1)

    src = Path(sys.argv[1])
    if len(sys.argv) >= 3:
        dst = Path(sys.argv[2])
    else:
        dst = src.with_suffix(".edn")

    convert_file(src, dst)
    print(f"Converted {src} -> {dst}")


if __name__ == "__main__":
    main()
