from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

# Configure engine with dialect-specific options
engine_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    engine_args["connect_args"] = {"check_same_thread": False}
else:
    engine_args["pool_size"] = 10
    engine_args["max_overflow"] = 20
    engine_args["pool_pre_ping"] = True

engine = create_engine(settings.DATABASE_URL, **engine_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def ensure_schema_columns():
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            for table, col, col_def in [
                ("evidence", "is_live_agent", "BOOLEAN DEFAULT 0"),
                ("evidence", "baseline_sha256", "VARCHAR(64)"),
                ("evidence", "pdf_diff_data", "TEXT"),
                ("timeline_events", "is_live_agent", "BOOLEAN DEFAULT 0"),
                ("findings", "is_live_agent", "BOOLEAN DEFAULT 0"),
            ]:
                try:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}"))
                    conn.commit()
                except Exception:
                    pass
    except Exception:
        pass

# Run schema check once on import
ensure_schema_columns()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
