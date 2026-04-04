"""
Migration runner — reads *.sql files from this directory and
attempts to execute them via the Supabase exec_sql RPC.
If that RPC isn't available, prints instructions.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

_backend_dir = Path(__file__).resolve().parent.parent.parent
_root_dir = _backend_dir.parent

load_dotenv(_root_dir / ".env")
load_dotenv(_backend_dir / ".env", override=True)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def run_migrations() -> None:
    migrations_dir = Path(__file__).resolve().parent
    sql_files = sorted(f for f in migrations_dir.iterdir() if f.suffix == ".sql")

    print(f"Found {len(sql_files)} migration files")

    for sql_file in sql_files:
        sql = sql_file.read_text(encoding="utf-8")
        print(f"Running: {sql_file.name}...")

        try:
            result = supabase.rpc("exec_sql", {"sql_query": sql}).execute()
            print(f"  ✓ {sql_file.name} applied")
        except Exception as exc:
            print(f"  Note: RPC exec_sql not available. Run this SQL manually in Supabase SQL Editor.")
            print(f"  File: {sql_file.name}")

    print("\nMigration complete. If RPC failed, paste the SQL files into Supabase SQL Editor.")


if __name__ == "__main__":
    run_migrations()
