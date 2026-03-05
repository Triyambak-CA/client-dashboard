"""
Run once at startup to ensure the DB schema and default admin exist.
Safe to re-run — skips anything that already exists.
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

from database import engine, SessionLocal
from models import Base
from sqlalchemy import text
from auth import hash_password

ADMIN_NAME  = os.environ.get("ADMIN_NAME",  "Admin")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@ca.com")
ADMIN_PASS  = os.environ.get("ADMIN_PASS",  "admin@123")


def run_schema_sql():
    """Create enums and tables from schema.sql if they don't exist yet."""
    schema_path = os.path.join(os.path.dirname(__file__), "..", "database", "schema.sql")
    if not os.path.exists(schema_path):
        print("schema.sql not found — skipping DDL step")
        return
    with open(schema_path) as f:
        sql = f.read()
    with engine.connect() as conn:
        # Execute statement by statement so we can ignore "already exists" errors
        for stmt in sql.split(";"):
            stmt = stmt.strip()
            if not stmt:
                continue
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                conn.rollback()  # enum/table already exists — safe to skip


def seed_admin():
    from models import User
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == ADMIN_EMAIL).first():
            print(f"Admin '{ADMIN_EMAIL}' already exists — skipping seed")
            return
        user = User(
            name=ADMIN_NAME,
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASS),
            role="admin",
            is_active=True,
        )
        db.add(user)
        db.commit()
        print(f"Admin user '{ADMIN_EMAIL}' created")
    finally:
        db.close()


if __name__ == "__main__":
    print("Running DB seed...")
    run_schema_sql()
    seed_admin()
    print("Seed complete")
