"""Seed an admin user into the database.

Usage:
    cd backend
    python -m scripts.seed_admin
"""
import bcrypt

from app.db.database import SessionLocal
from app.models.user import User



ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"
ADMIN_ROLE = "admin"


def seed_admin():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == ADMIN_USERNAME).first()
        if existing:
            print(f"Admin user '{ADMIN_USERNAME}' already exists — skipping.")
            return

        hashed = bcrypt.hashpw(ADMIN_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        admin = User(
            username=ADMIN_USERNAME,
            hashed_password=hashed,
            role=ADMIN_ROLE,
        )
        db.add(admin)
        db.commit()
        print(f"Admin user '{ADMIN_USERNAME}' created successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
