"""
IsoCheck Workload Generator
Generates list-append transactions with configurable skew and parameters,
following the Jepsen/Elle list-append workload model.
"""

from dataclasses import dataclass, field
import random
import threading
from typing import List, Tuple, Optional, Any, Dict

@dataclass
class WorkloadConfig:
    num_keys: int = 10
    ops_per_txn: int = 3
    read_ratio: float = 0.5      # Proportion of micro-ops that are reads
    key_skew: float = 0.8        # Zipfian skew parameter (0.0 = uniform, 1.0+ = heavy skew)
    seed: int = 42

class UniqueValueGenerator:
    """Thread-safe generator producing globally unique integer values for appends."""
    def __init__(self, process_id: int):
        self.process_id = process_id
        self._counter = 0
        self._lock = threading.Lock()

    def next_value(self) -> int:
        with self._lock:
            self._counter += 1
            # 32 bits process ID, 32 bits local counter
            return (self.process_id << 32) | self._counter

def sample_zipfian(n: int, s: float, rng: random.Random) -> int:
    """Sample an integer in [0, n - 1] according to a Zipfian distribution."""
    if s <= 0.0 or n <= 1:
        return rng.randint(0, n - 1)
    # Rejection inversion sampling for Zipf
    weights = [1.0 / ((i + 1) ** s) for i in range(n)]
    total = sum(weights)
    r = rng.random() * total
    acc = 0.0
    for i, w in enumerate(weights):
        acc += w
        if acc >= r:
            return i
    return n - 1

class WorkloadGenerator:
    """Generates transactions for a specific client process."""
    def __init__(self, process_id: int, config: WorkloadConfig):
        self.process_id = process_id
        self.config = config
        self.rng = random.Random(config.seed + process_id * 10007)
        self.val_gen = UniqueValueGenerator(process_id)

    def next_transaction_template(self) -> List[Tuple[str, int, Optional[int]]]:
        """
        Generate a list of planned micro-ops:
        - ('append', key, unique_val)
        - ('r', key, None)
        """
        ops: List[Tuple[str, int, Optional[int]]] = []
        for _ in range(self.config.ops_per_txn):
            key = sample_zipfian(self.config.num_keys, self.config.key_skew, self.rng)
            is_read = self.rng.random() < self.config.read_ratio
            if is_read:
                ops.append(('r', key, None))
            else:
                val = self.val_gen.next_value()
                ops.append(('append', key, val))
        return ops
