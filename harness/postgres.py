"""
Postgres list-append client harness.
Executes transactions at specified isolation levels (READ COMMITTED, REPEATABLE READ, SERIALIZABLE)
and records history operations (invoke, ok, fail, info).
"""

import time
import json
import logging
from typing import List, Tuple, Optional, Any, Dict

import psycopg
from psycopg import errors

logger = logging.getLogger("isocheck.postgres")

class PostgresHarness:
    def __init__(self, conn_info: Dict[str, Any], isolation_level: str = "READ COMMITTED"):
        self.conn_info = conn_info
        self.isolation_level = isolation_level.upper()
        if self.isolation_level not in ("READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"):
            raise ValueError(f"Invalid isolation level: {isolation_level}")

    def init_schema(self):
        """Create the key-value table if it doesn't exist."""
        with psycopg.connect(**self.conn_info, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS kv (
                        key BIGINT PRIMARY KEY,
                        val JSONB NOT NULL DEFAULT '[]'::jsonb
                    );
                """)

    def reset_table(self):
        """Truncate the table between test runs."""
        with psycopg.connect(**self.conn_info, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute("TRUNCATE TABLE kv;")

    def execute_transaction(
        self,
        conn: psycopg.Connection,
        template: List[Tuple[str, int, Optional[int]]]
    ) -> Tuple[str, List[Any], Optional[str]]:
        """
        Executes a transaction of micro-ops.
        Returns (status, observed_value):
        - status: 'ok', 'fail', or 'info'
        - observed_value: the micro-ops with filled-in read results
        """
        observed: List[Any] = []
        try:
            with conn.transaction():
                with conn.cursor() as cur:
                    cur.execute(f"SET TRANSACTION ISOLATION LEVEL {self.isolation_level};")
                    for op in template:
                        op_type, key, val = op
                        if op_type == "append":
                            cur.execute(
                                """
                                INSERT INTO kv (key, val) VALUES (%s, jsonb_build_array(%s::bigint))
                                ON CONFLICT (key) DO UPDATE SET val = kv.val || jsonb_build_array(EXCLUDED.val->0);
                                """,
                                (key, val)
                            )
                            observed.append(["append", key, val])
                        elif op_type == "r":
                            cur.execute("SELECT val FROM kv WHERE key = %s;", (key,))
                            row = cur.fetchone()
                            if row is None:
                                read_list = None
                            else:
                                raw_val = row[0]
                                if isinstance(raw_val, list):
                                    read_list = raw_val
                                else:
                                    read_list = json.loads(raw_val)
                            observed.append(["r", key, read_list])

            return "ok", observed, None

        except (errors.SerializationFailure, errors.DeadlockDetected) as e:
            # Transaction explicitly aborted by database engine (e.g. 40001 or 40P01)
            # This is a definite fail
            return "fail", observed, e.sqlstate
        except (errors.OperationalError, psycopg.OperationalError) as e:
            # Connection lost, timeout, socket closed mid-flight
            # Indeterminate: might have committed or might have aborted
            return "info", observed, e.sqlstate
        except Exception as e:
            # Check SQLSTATE if available
            sqlstate = getattr(e, "sqlstate", None)
            if sqlstate in ("40001", "40P01"):
                return "fail", observed, sqlstate
            # Any other unknown or connection error -> info
            return "info", observed, sqlstate
