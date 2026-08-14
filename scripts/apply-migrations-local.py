"""
Apply migrations/*.sql to the local SQLite dev database.

Idempotent — relies on each migration using IF NOT EXISTS. Tracks which
migrations have run via a _migrations_applied table so re-runs skip the
already-applied ones.

Usage:
  python scripts/apply-migrations-local.py [--db PATH] [--reset]
"""

import argparse
import os
import sqlite3
import sys

sys.stdout.reconfigure(encoding="utf-8")

DEFAULT_DB = os.path.join(os.path.dirname(__file__), "..", "data", "shivworks-network.db")
MIG_DIR = os.path.join(os.path.dirname(__file__), "..", "migrations")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=DEFAULT_DB, help="Path to SQLite DB")
    ap.add_argument(
        "--reset",
        action="store_true",
        help="Delete the DB file and re-create from scratch",
    )
    args = ap.parse_args()

    db_path = os.path.abspath(args.db)
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    if args.reset and os.path.exists(db_path):
        os.remove(db_path)
        print(f"DELETED {db_path}")

    db = sqlite3.connect(db_path)
    db.execute(
        """CREATE TABLE IF NOT EXISTS _migrations_applied (
              filename TEXT PRIMARY KEY,
              applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
            )"""
    )

    applied = {
        row[0] for row in db.execute("SELECT filename FROM _migrations_applied")
    }

    mig_files = sorted(
        f for f in os.listdir(os.path.abspath(MIG_DIR)) if f.endswith(".sql")
    )
    if not mig_files:
        print("no migrations found")
        return

    print(f"DB: {db_path}")
    print(f"Migrations dir: {os.path.abspath(MIG_DIR)}")
    print(f"Found {len(mig_files)} migrations; {len(applied)} already applied")
    print()

    for fn in mig_files:
        if fn in applied:
            print(f"SKIP  {fn} (already applied)")
            continue
        path = os.path.join(MIG_DIR, fn)
        with open(path, encoding="utf-8") as fh:
            sql = fh.read()
        try:
            db.executescript(sql)
            db.execute(
                "INSERT INTO _migrations_applied (filename) VALUES (?)", (fn,)
            )
            db.commit()
            print(f"OK    {fn}")
        except Exception as e:
            print(f"FAIL  {fn}: {e}")
            db.rollback()
            sys.exit(1)

    print()
    print("Done. Tables in DB:")
    for row in db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ):
        print(f"  - {row[0]}")


if __name__ == "__main__":
    main()
