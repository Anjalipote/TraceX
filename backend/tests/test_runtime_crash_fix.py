import os
import sys
import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import inspect

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.core.migration import run_schema_migrations, REQUIRED_COLUMNS
from app.core.security import create_access_token
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.finding import Finding
from app.models.timeline import TimelineEvent
from app.models.investigation_file import InvestigationFile
from app.models.forensic_event import ForensicEvent
from app.models.relationship import EvidenceRelationship
from app.services.clustering_service import ClusteringService
from app.services.finding_service import FindingService
from app.services.relationship_service import RelationshipService
from seed import seed_database

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_test_auth():
    run_schema_migrations(engine)
    token = create_access_token(subject="user-alex-vance", role="ADMIN")
    client.headers["Authorization"] = f"Bearer {token}"
    yield

def test_schema_migration_columns_exist():
    """Verify all required columns exist in the database schema."""
    run_schema_migrations(engine)
    inspector = inspect(engine)
    
    for table_name, col_name, _, _ in REQUIRED_COLUMNS:
        assert table_name in inspector.get_table_names(), f"Table {table_name} missing from DB"
        cols = {c["name"] for c in inspector.get_columns(table_name)}
        assert col_name in cols, f"Column {table_name}.{col_name} missing from DB"

def test_evidence_model_attributes_match_table():
    """Verify that SQLAlchemy Evidence model attributes match the actual DB columns."""
    inspector = inspect(engine)
    db_cols = {c["name"] for c in inspector.get_columns("evidence")}
    
    # Model columns that must exist in DB
    model_columns = [
        "id", "case_id", "evidence_number", "filename", "original_filename",
        "file_type", "mime_type", "file_size", "storage_path", "sha256_hash",
        "md5_hash", "integrity_status", "analysis_status", "source_device",
        "category", "notes", "is_live_agent", "baseline_sha256", "pdf_diff_data",
        "file_created_at", "file_modified_at", "file_accessed_at", "uploaded_at"
    ]
    for col in model_columns:
        assert col in db_cols, f"Evidence model attribute '{col}' is not present in PostgreSQL/SQLite evidence table!"

def test_get_missing_evidence_returns_404_no_crash():
    """Verify that querying a non-existent evidence ID returns a clean 404 without crashing FastAPI."""
    bogus_id = f"ev-missing-{uuid.uuid4().hex[:8]}"
    res = client.get(f"/api/evidence/{bogus_id}")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()
    
    # Health check confirms backend is still completely operational
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"

def test_verify_missing_evidence_returns_404_no_crash():
    """Verify that verifying integrity of a non-existent evidence item returns 404 without crashing."""
    bogus_id = f"ev-verify-missing-{uuid.uuid4().hex[:8]}"
    res = client.post(f"/api/evidence/{bogus_id}/verify")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()

def test_real_investigation_isolated_from_ev001():
    """
    Verify that a Real Forensic Investigation does NOT use or depend on
    hardcoded 'ev-001' or predefined demo evidence in findings, clustering, or graph.
    """
    db = SessionLocal()
    real_inv_id = f"REAL-INV-{uuid.uuid4().hex[:8]}"
    
    try:
        # Create a real investigation case
        real_case = Case(
            id=real_inv_id,
            case_number=real_inv_id,
            name="Real Host Live Forensic Seizure",
            description="Forensic investigation on Windows host",
            status="Active",
            priority="High",
            incident_type="Unauthorized Copy",
            target_system="WIN11-EXEC-LAPTOP",
            investigator_id="user-alex-vance",
            is_real_investigation=True,
            collection_type="real",
            computer_id="DESKTOP-WIN11-TEST",
            target_file_path=r"C:\Confidential\financial_q3.xlsx"
        )
        db.add(real_case)
        db.commit()

        # Add real evidence collected by agent (NOT ev-001)
        real_ev_id = f"REAL-EV-{uuid.uuid4().hex[:8]}"
        real_ev = Evidence(
            id=real_ev_id,
            case_id=real_inv_id,
            evidence_number="EV-REAL-001",
            filename="financial_q3.xlsx",
            original_filename=r"C:\Confidential\financial_q3.xlsx",
            file_type="document",
            file_size=84200,
            storage_path=r"C:\TraceX\storage\financial_q3.xlsx",
            sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            integrity_status="Verified",
            analysis_status="Complete",
            source_device="WIN11-EXEC-LAPTOP",
            is_live_agent=True,
            uploaded_at=datetime.now(timezone.utc)
        )
        db.add(real_ev)

        # Add real timeline events
        evt_id = f"REAL-EVT-{uuid.uuid4().hex[:8]}"
        evt = TimelineEvent(
            id=evt_id,
            case_id=real_inv_id,
            evidence_id=real_ev_id,
            event_type="file",
            description="File modified by user Admin in Excel session",
            timestamp=datetime.now(timezone.utc),
            severity="medium",
            is_suspicious=True,
            is_live_agent=True
        )
        db.add(evt)
        db.commit()

        # Run correlation and clustering for real investigation
        findings = FindingService.run_correlation(db, real_inv_id)
        clusters = ClusteringService.cluster_events(db, real_inv_id)
        graph = RelationshipService.get_graph_data(db, real_inv_id)

        # Confirm ZERO hardcoded ev-001 references in findings
        for f in findings:
            assert f.evidence_id != "ev-001", f"Real finding {f.title} leaked hardcoded ev-001!"
            if f.evidence_id:
                assert f.evidence_id == real_ev_id

        # Confirm ZERO hardcoded ev-001 references in clusters
        for cl in clusters:
            if cl.evidence_ids:
                import json
                ev_ids = json.loads(cl.evidence_ids)
                assert "ev-001" not in ev_ids, f"Cluster {cl.title} leaked hardcoded ev-001!"

        # Confirm ZERO hardcoded ev-001 references in graph edges/nodes
        for node in graph["nodes"]:
            assert node["id"] != "ev-001"
            assert node["id"] != "node-usb-device", "Demo Kingston USB node leaked into real investigation graph!"
        for edge in graph["edges"]:
            assert edge["source"] != "ev-001"
            assert edge["target"] != "ev-001"

    finally:
        # Cleanup
        db.query(Finding).filter(Finding.case_id == real_inv_id).delete()
        db.query(TimelineEvent).filter(TimelineEvent.case_id == real_inv_id).delete()
        db.query(Evidence).filter(Evidence.case_id == real_inv_id).delete()
        db.query(Case).filter(Case.id == real_inv_id).delete()
        db.commit()
        db.close()

def test_seed_database_is_safe_and_idempotent():
    """Verify seed_database runs without throwing errors and handles existing data cleanly."""
    seed_database()
    
    # Confirm seeded demo evidence ev-001 is present in demo case CASE-2026-001
    db = SessionLocal()
    try:
        ev1 = db.query(Evidence).filter(Evidence.id == "ev-001").first()
        assert ev1 is not None
        assert ev1.case_id == "CASE-2026-001"
        assert ev1.filename == "confidential.pdf"
    finally:
        db.close()
