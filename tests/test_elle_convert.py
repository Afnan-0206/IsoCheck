import json
from pathlib import Path

import pytest

from tests.elle.convert import convert_file


def test_converts_paired_fail_history(tmp_path):
    source = tmp_path / "history.jsonl"
    destination = tmp_path / "history.edn"
    source.write_text(
        "\n".join(
            [
                json.dumps({"index": 0, "type": "invoke", "process": 0, "value": [["append", 1, 1]]}),
                json.dumps({"index": 1, "type": "fail", "process": 0, "value": [["append", 1, 1]]}),
                json.dumps({"index": 2, "type": "invoke", "process": 1, "value": [["r", 1, None]]}),
                json.dumps({"index": 3, "type": "ok", "process": 1, "value": [["r", 1, [1]]]}),
            ]
        ),
        encoding="utf-8",
    )

    convert_file(source, destination)

    lines = destination.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 4
    assert ":index 0, :type :invoke" in lines[0]
    assert ":index 1, :type :fail" in lines[1]
    assert ":index 3, :type :ok" in lines[3]


@pytest.mark.parametrize(
    "ops, message",
    [
        ([{"index": 1, "type": "ok", "process": 0, "value": []}], "not dense"),
        ([{"index": 0, "type": "fail", "process": 0, "value": []}], "no matching invoke"),
        ([{"index": 0, "type": "invoke", "process": 0, "value": []}], "uncompleted invokes"),
    ],
)
def test_rejects_malformed_history(tmp_path, ops, message):
    source = tmp_path / "bad.jsonl"
    destination = tmp_path / "bad.edn"
    source.write_text("\n".join(json.dumps(op) for op in ops), encoding="utf-8")

    with pytest.raises(ValueError, match=message):
        convert_file(source, destination)