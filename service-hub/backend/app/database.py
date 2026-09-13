"""
Database setup.

Local dev uses a plain SQLite file. In production, set TURSO_DATABASE_URL
and TURSO_AUTH_TOKEN (from your Turso dashboard) instead — the app will
automatically connect to Turso. If those aren't set, it falls back to
DATABASE_URL (or a local file) for local development.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL")  # e.g. libsql://your-db.turso.io
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN")

if TURSO_DATABASE_URL and TURSO_AUTH_TOKEN:
    engine = create_engine(
        f"sqlite+{TURSO_DATABASE_URL}?secure=true",
        connect_args={"auth_token": TURSO_AUTH_TOKEN},
    )
else:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./service_hub.db")
    connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
    engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
