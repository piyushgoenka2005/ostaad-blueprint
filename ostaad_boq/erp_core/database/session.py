"""
Database Connection & Session Management
Supports production PostgreSQL (e.g. postgresql://user:pass@host/db) with fallback to SQLite for local tests
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./buildbharat_erp.db")

# SQLite needs connect_args for multithreading
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db_session = scoped_session(SessionLocal)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
