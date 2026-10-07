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

def test_get_computers_endpoint():
    res = client.get("/api/investigations/computers")
    assert res.status_code == 200
    computers = res.json()
    assert len(computers) >= 2
    emp_lt = next((c for c in computers if c["id"] == "EMP-LT-001"), None)
    assert emp_lt is not None
    assert emp_lt["collection_mode"] == "Read-only"
    assert emp_lt["collection_type"] == "Demo Collector"

def test_authorize_investigation_endpoint():
    payload = {
        "computer_id": "EMP-LT-001",
        "case_id": "TRX-001",
        "collection_mode": "read_only",
        "collection_type": "demo",
        "authorized": True
    }
    res = client.post("/api/investigations/authorize", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "Authorized"
    assert data["computer_id"] == "EMP-LT-001"
    assert data["read_only_guarantee"] is True

def test_scan_investigation_endpoint():
    payload = {
        "computer_id": "EMP-LT-001",
        "case_id": "TRX-001",
        "collection_type": "demo"
    }
    res = client.post("/api/investigations/scan", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "Completed"
    assert data["artifacts_collected"] > 100
    assert len(data["stages"]) == 6

def test_results_investigation_endpoint():
    res = client.get("/api/investigations/TRX-001/results")
    assert res.status_code == 200
    data = res.json()
    assert data["has_suspicious_activity"] is True
    assert len(data["findings"]) >= 3
    finding = data["findings"][0]
    assert "why_suspicious" in finding
    assert len(finding["related_events"]) > 0
