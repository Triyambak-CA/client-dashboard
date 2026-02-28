"""
Run this once to create your first admin user.

Usage:
    cd backend
    python create_admin.py
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

from database import SessionLocal
from models import User
from auth import hash_password

def main():
    print("=== Create First Admin User ===\n")

    name  = input("Full name  : ").strip()
    email = input("Email      : ").strip().lower()
    pwd   = input("Password   : ").strip()

    if not name or not email or not pwd:
        print("\nERROR: All fields are required.")
        sys.exit(1)

    if len(pwd) < 8:
        print("\nERROR: Password must be at least 8 characters.")
        sys.exit(1)

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"\nERROR: A user with email '{email}' already exists.")
            sys.exit(1)

        user = User(
            name=name,
            email=email,
            password_hash=hash_password(pwd),
            role="admin",
            is_active=True,
        )
        db.add(user)
        db.commit()
        print(f"\nAdmin user '{name}' created successfully.")
        print(f"You can now log in at http://localhost:5173 with email: {email}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
