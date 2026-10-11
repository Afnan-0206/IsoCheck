/// samples.js - Built-in JSONL sample histories for the playground.

export const samples = [
  {
    id: 'clean',
    label: 'Clean (Valid)',
    description: 'A clean serial history with no anomalies.',
    content: `{"index": 0, "type": "invoke", "process": 0, "f": "txn", "value": [["append", 1, 1], ["append", 2, 2]], "time": 0}
{"index": 1, "type": "ok", "process": 0, "f": "txn", "value": [["append", 1, 1], ["append", 2, 2]], "time": 100}
{"index": 2, "type": "invoke", "process": 1, "f": "txn", "value": [["append", 1, 3], ["r", 2, null]], "time": 200}
{"index": 3, "type": "ok", "process": 1, "f": "txn", "value": [["append", 1, 3], ["r", 2, [2]]], "time": 300}
{"index": 4, "type": "invoke", "process": 0, "f": "txn", "value": [["r", 1, null], ["r", 2, null]], "time": 400}
{"index": 5, "type": "ok", "process": 0, "f": "txn", "value": [["r", 1, [1, 3]], ["r", 2, [2]]], "time": 500}`,
  },
  {
    id: 'g0',
    label: 'G0 (Write Cycle)',
    description: 'A dirty write / write cycle anomaly. Two transactions overwrite each other in conflicting orders on different keys.',
    content: `# G0: T1 writes key1=1, key2=3. T2 writes key1=2, key2=4.
# Reader sees key1=[1,2] (T1 before T2) but key2=[4,3] (T2 before T1).
# This creates a ww-only cycle: T1 -> T2 -> T1
{"index": 0, "type": "invoke", "process": 0, "f": "txn", "value": [["append", 1, 1], ["append", 2, 3]], "time": 0}
{"index": 1, "type": "ok", "process": 0, "f": "txn", "value": [["append", 1, 1], ["append", 2, 3]], "time": 100}
{"index": 2, "type": "invoke", "process": 1, "f": "txn", "value": [["append", 1, 2], ["append", 2, 4]], "time": 200}
{"index": 3, "type": "ok", "process": 1, "f": "txn", "value": [["append", 1, 2], ["append", 2, 4]], "time": 300}
{"index": 4, "type": "invoke", "process": 2, "f": "txn", "value": [["r", 1, null], ["r", 2, null]], "time": 400}
{"index": 5, "type": "ok", "process": 2, "f": "txn", "value": [["r", 1, [1, 2]], ["r", 2, [4, 3]]], "time": 500}`,
  },
  {
    id: 'g1a',
    label: 'G1a (Aborted Read)',
    description: 'A committed transaction reads data written by a transaction that was aborted.',
    content: `# G1a: Process 0 appends value 1 to key 1 then aborts.
# Process 1 reads key 1 and sees [1], the aborted value.
{"index": 0, "type": "invoke", "process": 0, "f": "txn", "value": [["append", 1, 1]], "time": 0}
{"index": 1, "type": "fail", "process": 0, "f": "txn", "value": [["append", 1, 1]], "time": 100}
{"index": 2, "type": "invoke", "process": 1, "f": "txn", "value": [["r", 1, null]], "time": 50}
{"index": 3, "type": "ok", "process": 1, "f": "txn", "value": [["r", 1, [1]]], "time": 200}`,
  },
  {
    id: 'g1b',
    label: 'G1b (Intermediate Read)',
    description: 'A transaction observes an intermediate (non-final) state of another active transaction.',
    content: `# G1b: T1 appends 1 then 2 to key 1 (multi-append).
# T2 reads key 1 and sees [1] but not [1, 2].
# T2 saw the intermediate state after T1's first append but before T1's second.
{"index": 0, "type": "invoke", "process": 0, "f": "txn", "value": [["append", 1, 1], ["append", 1, 2]], "time": 0}
{"index": 1, "type": "ok", "process": 0, "f": "txn", "value": [["append", 1, 1], ["append", 1, 2]], "time": 200}
{"index": 2, "type": "invoke", "process": 1, "f": "txn", "value": [["r", 1, null]], "time": 50}
{"index": 3, "type": "ok", "process": 1, "f": "txn", "value": [["r", 1, [1]]], "time": 150}`,
  },
  {
    id: 'garbage',
    label: 'Garbage Read',
    description: 'A read returns a value that was never appended by any transaction in the history.',
    content: `# Garbage Read: T1 appends 1 to key 1. T2 reads key 1 and sees [1, 999].
# Value 999 was never written by any transaction.
{"index": 0, "type": "invoke", "process": 0, "f": "txn", "value": [["append", 1, 1]], "time": 0}
{"index": 1, "type": "ok", "process": 0, "f": "txn", "value": [["append", 1, 1]], "time": 100}
{"index": 2, "type": "invoke", "process": 1, "f": "txn", "value": [["r", 1, null]], "time": 200}
{"index": 3, "type": "ok", "process": 1, "f": "txn", "value": [["r", 1, [1, 999]]], "time": 300}`,
  },
  {
    id: 'internal',
    label: 'Internal Inconsistency',
    description: 'A transaction fails to observe its own prior write within the same transaction.',
    content: `# Internal Inconsistency: T1 appends 1 to key 1, then reads key 1
# but the read result does not include value 1.
{"index": 0, "type": "invoke", "process": 0, "f": "txn", "value": [["append", 1, 1], ["r", 1, null]], "time": 0}
{"index": 1, "type": "ok", "process": 0, "f": "txn", "value": [["append", 1, 1], ["r", 1, []]], "time": 100}`,
  },
];
