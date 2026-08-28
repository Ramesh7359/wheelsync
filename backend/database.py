import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database URL is configurable via environment variable.
# - Local development: defaults to SQLite (no setup needed)
# - Production / high volume: set DATABASE_URL to a PostgreSQL connection string
#   e.g. postgresql://user:password@host:5432/wheelsync
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./wheelsync.db")

# Render (and some hosts) provide postgres:// but SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # PostgreSQL / other: connection pooling for handling higher concurrent load
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,
        max_overflow=40,
        pool_pre_ping=True,   # verify connections before use
        pool_recycle=1800,    # recycle connections every 30 min
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
