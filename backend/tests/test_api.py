import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import Base, engine
from app.core.security import create_access_token

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    token = create_access_token(subject="user-alex-vance", role="ADMIN")
    client.headers["Authorization"] = f"Bearer {token}"
    yield

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["database"] == "connected"

def test_root_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["database"] == "connected"

def test_login_flow():
    # Attempt login with seeded user
    res = client.post("/api/auth/login", json={
        "email": "investigator@tracex.demo",
        "password": "TraceX@123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "investigator@tracex.demo"

def test_get_cases():
    res = client.get("/api/cases")
    assert res.status_code == 200
    cases = res.json()
    assert len(cases) >= 1
    case_1 = next(c for c in cases if c["case_number"] == "CASE-2026-001")
    assert case_1["name"] == "Unauthorized Data Access Investigation"

def test_case_summary():
    res = client.get("/api/cases/CASE-2026-001/summary")
    assert res.status_code == 200
    summary = res.json()
    assert summary["case_number"] == "CASE-2026-001"
    assert summary["risk_score"] == 87
    assert summary["risk_level"] == "CRITICAL"

def test_get_evidence():
    res = client.get("/api/cases/CASE-2026-001/evidence")
    assert res.status_code == 200
    evidence_items = res.json()
    assert len(evidence_items) >= 7
    filenames = [e["filename"] for e in evidence_items]
    assert "confidential.pdf" in filenames
    assert "suspicious.exe" in filenames

def test_timeline_chronology():
    res = client.get("/api/cases/CASE-2026-001/timeline")
    assert res.status_code == 200
    events = res.json()
    assert len(events) >= 9
    # Verify chronological ascending order
    timestamps = [e["timestamp"] for e in events]
    assert timestamps == sorted(timestamps)

def test_risk_assessment_explainability():
    res = client.get("/api/cases/CASE-2026-001/risk")
    assert res.status_code == 200
    risk = res.json()
    assert risk["overall_score"] == 87
    assert risk["risk_level"] == "CRITICAL"
    assert len(risk["factors"]) == 5
    # Verify sum of factor points matches 87
    factor_sum = sum(f["score"] for f in risk["factors"])
    assert factor_sum == 87

def test_investigation_story():
    res = client.get("/api/cases/CASE-2026-001/story")
    assert res.status_code == 200
    story = res.json()
    assert "narrative" in story["incident_narrative"].lower() or len(story["incident_narrative"]) > 20
    assert story["risk_assessment"]["score"] == 87
    assert len(story["timeline_milestones"]) > 0

def test_evidence_graph_nodes_and_edges():
    res = client.get("/api/cases/CASE-2026-001/relationships")
    assert res.status_code == 200
    graph = res.json()
    assert "nodes" in graph
    assert "edges" in graph
    assert len(graph["nodes"]) >= 7
    assert len(graph["edges"]) >= 6

def test_upload_evidence_inert():
    # Test uploading a forensic file
    file_content = b"Mock event log entry 2026-10-05 09:45:10 USBSTOR Kingston inserted\n"
    res = client.post(
        "/api/cases/CASE-2026-001/evidence/upload",
        files={"file": ("test_usb_capture.log", file_content, "text/plain")},
        data={"source_device": "WORKSTATION-CORP-FIN09", "category": "Log", "notes": "Test forensic ingestion"}
    )
    assert res.status_code == 201
    ev_data = res.json()
    assert ev_data["filename"] == "test_usb_capture.log"
    assert ev_data["integrity_status"] == "Verified"
    assert len(ev_data["sha256_hash"]) == 64
