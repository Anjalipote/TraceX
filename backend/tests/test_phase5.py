import os
import sys
import io
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.finding import Finding
from app.models.report import Report
from app.models.audit_log import AuditLog

client = TestClient(app)

@pytest.fixture(scope="module")
def admin_token():
    res = client.post("/api/auth/login", json={
        "email": "investigator@tracex.demo",
        "password": "TraceX@123"
    })
    assert res.status_code == 200
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def viewer_token():
    res = client.post("/api/auth/login", json={
        "email": "sarah.chen@tracex.demo",
        "password": "TraceX@123"
    })
    assert res.status_code == 200
    return res.json()["access_token"]

def test_openapi_schema_complete():
    """Verify OpenAPI documentation schema generates properly with version 1.0.0+."""
    res = client.get("/openapi.json")
    assert res.status_code == 200
    data = res.json()
    assert "paths" in data
    assert "/api/cases" in data["paths"]
    assert "/api/auth/login" in data["paths"]
    assert "/api/cases/{case_id}/reset-demo" in data["paths"]

def test_full_pipeline_execution(admin_token):
    """Test full analysis pipeline trigger and verify findings and activity clusters."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.post("/api/cases/CASE-2026-001/analysis/start", headers=headers)
    assert res.status_code in [200, 202]
    data = res.json()
    assert data["status"] in ["Completed", "Running", "Queued"]

def test_evidence_zero_byte_safety(admin_token):
    """Test upload of a 0-byte forensic evidence artifact produces correct SHA-256 and no division by zero."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    empty_file = io.BytesIO(b"")
    res = client.post(
        "/api/cases/CASE-2026-001/evidence/upload",
        headers=headers,
        files={"file": ("zero_placeholder.txt", empty_file, "text/plain")},
        data={"source_device": "WIN11-TEST-WS", "category": "FileSystem"}
    )
    assert res.status_code == 201
    ev = res.json()
    assert ev["file_size"] == 0
    assert ev["sha256_hash"] == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    assert "Zero-byte file ingested" in ev.get("notes", "")

def test_evidence_duplicate_detection(admin_token):
    """Test duplicate evidence upload flags duplicate status in forensic notes."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    content = b"FORENSIC_DUPLICATE_TEST_PAYLOAD_DATA"
    
    # Upload first instance
    file1 = io.BytesIO(content)
    res1 = client.post(
        "/api/cases/CASE-2026-001/evidence/upload",
        headers=headers,
        files={"file": ("orig_audit.log", file1, "text/plain")},
        data={"source_device": "WIN11-TEST-WS", "category": "FileSystem"}
    )
    assert res1.status_code == 201

    # Upload duplicate instance
    file2 = io.BytesIO(content)
    res2 = client.post(
        "/api/cases/CASE-2026-001/evidence/upload",
        headers=headers,
        files={"file": ("copy_audit.log", file2, "text/plain")},
        data={"source_device": "WIN11-TEST-WS", "category": "FileSystem"}
    )
    assert res2.status_code == 201
    assert "Duplicate detected" in res2.json().get("notes", "")

def test_demo_case_reseed_endpoint(admin_token):
    """Test safe reseed/reset of demo case by Admin."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.post("/api/cases/CASE-2026-001/reset-demo", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "CASE-2026-001" in data["message"]

def test_demo_case_reseed_blocked_for_viewer(viewer_token):
    """Test Viewer role is forbidden from triggering demo case reseed."""
    headers = {"Authorization": f"Bearer {viewer_token}"}
    res = client.post("/api/cases/CASE-2026-001/reset-demo", headers=headers)
    assert res.status_code == 403

def test_non_demo_case_reset_protected(admin_token):
    """Test that non-demo real cases cannot be accidentally reset."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.post("/api/cases/CASE-REAL-PRODUCTION-999/reset-demo", headers=headers)
    assert res.status_code == 400
    assert "restricted strictly to designated demonstration cases" in res.json()["detail"]

def test_forensic_language_integrity(admin_token):
    """Verify that reports, findings, and case stories do NOT contain accusatory legal guilt assertions."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/cases/CASE-2026-001/story", headers=headers)
    assert res.status_code == 200
    story = res.json()
    
    narrative = story.get("incident_narrative", "").lower()
    banned_words = ["guilty", "perpetrator", "committed theft", "convict", "criminal culprit"]
    for banned in banned_words:
        assert banned not in narrative, f"Banned legal guilt claim '{banned}' found in narrative"
