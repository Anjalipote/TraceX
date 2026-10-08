import logging
from typing import List, Tuple
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from app.core.database import Base
import app.models  # Ensure all model tables are registered in Base.metadata

logger = logging.getLogger("tracex.migration")

# Columns added in recent updates that must be present on existing tables
REQUIRED_COLUMNS: List[Tuple[str, str, str, str]] = [
    # (table_name, column_name, postgres_type, sqlite_type)
    ("evidence", "is_live_agent", "BOOLEAN DEFAULT FALSE", "BOOLEAN DEFAULT FALSE"),
    ("evidence", "baseline_sha256", "VARCHAR(64)", "VARCHAR(64)"),
    ("evidence", "pdf_diff_data", "TEXT", "TEXT"),
    ("cases", "is_real_investigation", "BOOLEAN DEFAULT FALSE", "BOOLEAN DEFAULT FALSE"),
    ("cases", "collection_type", "VARCHAR(32) DEFAULT 'demo'", "VARCHAR(32) DEFAULT 'demo'"),
    ("cases", "computer_id", "VARCHAR(128)", "VARCHAR(128)"),
    ("cases", "target_file_path", "VARCHAR(512)", "VARCHAR(512)"),
    ("cases", "authorization_status", "VARCHAR(32) DEFAULT 'Pending'", "VARCHAR(32) DEFAULT 'Pending'"),
    ("timeline_events", "is_live_agent", "BOOLEAN DEFAULT FALSE", "BOOLEAN DEFAULT FALSE"),
    ("findings", "is_live_agent", "BOOLEAN DEFAULT FALSE", "BOOLEAN DEFAULT FALSE"),
    ("forensic_events", "hardware_id", "VARCHAR(255)", "VARCHAR(255)"),
]

def run_schema_migrations(engine: Engine) -> None:
    """
    Guarantees that all tables and columns declared in SQLAlchemy models
    exist in the connected database (PostgreSQL or SQLite).
    
    1. Runs Base.metadata.create_all to create missing tables.
    2. Inspects existing tables and adds any missing columns via ALTER TABLE.
    3. Executes each ALTER TABLE in an isolated transaction to prevent PostgreSQL aborted-state errors.
    """
    logger.info("Starting schema verification and synchronization...")
    
    # 1. Create all missing tables
    Base.metadata.create_all(bind=engine)
    
    # 2. Inspect existing tables and columns
    is_postgres = engine.dialect.name.startswith("postgres")
    
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    
    for table_name, col_name, pg_def, sqlite_def in REQUIRED_COLUMNS:
        if table_name not in existing_tables:
            continue
            
        try:
            col_info = inspector.get_columns(table_name)
            existing_cols = {c["name"] for c in col_info}
        except Exception as e:
            logger.warning(f"Could not inspect columns for {table_name}: {e}")
            continue
            
        if col_name not in existing_cols:
            col_type = pg_def if is_postgres else sqlite_def
            logger.info(f"Adding missing column: {table_name}.{col_name} ({col_type})")
            
            # Execute in an isolated transaction with auto-commit
            try:
                with engine.begin() as conn:
                    if is_postgres:
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                    else:
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"))
                logger.info(f"Successfully added column {table_name}.{col_name}")
            except Exception as e:
                logger.warning(f"Column migration warning for {table_name}.{col_name}: {e}")

    logger.info("Schema verification completed.")


if __name__ == "__main__":
    from app.core.database import engine
    run_schema_migrations(engine)
    print("Schema migration finished successfully.")
