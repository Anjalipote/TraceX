import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import Base, engine, ensure_schema_columns
from app.core.security import create_access_token
from app.services.pdf_diff_service import PdfDiffService

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    ensure_schema_columns()
    token = create_access_token(subject="user-alex-vance", role="ADMIN")
    client.headers["Authorization"] = f"Bearer {token}"
    yield

def test_register_agent():
    payload = {
        "hostname": "TEST-WIN11-HOST",
        "ip_address": "10.0.0.42",
        "os_info": "Windows 11 Pro 23H2",
        "current_user": "TestInvestigator",
        "agent_version": "v2.5.0-win64",
        "monitored_paths": ["C:\\InvestigationVault"]
    }
    res = client.post("/api/agent/register", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "Online"

def test_agent_heartbeat():
    payload = {
        "hostname": "TEST-WIN11-HOST",
        "monitored_paths": ["C:\\InvestigationVault"],
        "events_count": 3
    }
    res = client.post("/api/agent/heartbeat", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "acknowledged"

def test_get_agent_status():
    res = client.get("/api/agent/status")
    assert res.status_code == 200
    data = res.json()
    assert data["total_agents"] >= 1
    host = next((a for a in data["agents"] if a["hostname"] == "TEST-WIN11-HOST"), None)
    assert host is not None
    assert host["status"] == "Online"

def test_pdf_diff_service_unit():
    baseline_pages = [
        "CONFIDENTIAL AUDIT REPORT\nRouting Number: 123456789\nAnnual Compensation: $120,000",
        "Page 2 terms and conditions identical"
    ]
    modified_pages = [
        "CONFIDENTIAL AUDIT REPORT\nRouting Number: 999888777\nAnnual Compensation: $250,000",
        "Page 2 terms and conditions identical"
    ]

    result = PdfDiffService.compare_pdf_pages(baseline_pages, modified_pages)
    assert result["has_changes"] is True
    assert result["changed_pages"] == [1]
    assert result["total_pages_baseline"] == 2
    assert result["total_pages_modified"] == 2
    assert len(result["pages"][0]["added_lines"]) > 0
    assert len(result["pages"][0]["removed_lines"]) > 0
    assert result["pages"][1]["has_changes"] is False

def test_ingest_live_agent_events_with_pdf_diff():
    diff_data = {
        "has_changes": True,
        "total_pages_baseline": 2,
        "total_pages_modified": 2,
        "changed_pages": [1],
        "total_additions": 2,
        "total_deletions": 2,
        "summary": "Altered 1 of 2 pages (2 additions, 2 deletions)",
        "pages": [
            {
                "page_number": 1,
                "has_changes": True,
                "added_lines": ["Routing Number: 999888777", "Annual Compensation: $250,000"],
                "removed_lines": ["Routing Number: 123456789", "Annual Compensation: $120,000"],
                "diff_lines": [
                    {"type": "removed", "text": "Routing Number: 123456789"},
                    {"type": "added", "text": "Routing Number: 999888777"},
                    {"type": "removed", "text": "Annual Compensation: $120,000"},
                    {"type": "added", "text": "Annual Compensation: $250,000"}
                ]
            }
        ]
    }

    payload = {
        "hostname": "TEST-WIN11-HOST",
        "agent_version": "v2.5.0-win64",
        "case_id": "CASE-2026-001",
        "events": [
            {
                "event_type": "created",
                "file_path": "C:\\InvestigationVault\\payroll_audit.pdf",
                "file_name": "payroll_audit.pdf",
                "file_size": 1024,
                "file_extension": ".pdf",
                "sha256_hash": "aaaabbbbcccc1111222233334444555566667777888899990000aaaabbbbcccc",
                "baseline_sha256": "aaaabbbbcccc1111222233334444555566667777888899990000aaaabbbbcccc",
                "is_modified_from_baseline": False,
                "timestamp": "2026-10-02T14:30:00Z",
                "user": "Employee01",
                "hostname": "TEST-WIN11-HOST",
                "case_id": "CASE-2026-001",
                "is_pdf": True
            },
            {
                "event_type": "modified",
                "file_path": "C:\\InvestigationVault\\payroll_audit.pdf",
                "file_name": "payroll_audit.pdf",
                "file_size": 1150,
                "file_extension": ".pdf",
                "sha256_hash": "dddd1111222233334444555566667777888899990000aaaabbbbccccdddd1111",
                "baseline_sha256": "aaaabbbbcccc1111222233334444555566667777888899990000aaaabbbbcccc",
                "is_modified_from_baseline": True,
                "timestamp": "2026-10-02T14:34:00Z",
                "user": "Employee01",
                "hostname": "TEST-WIN11-HOST",
                "case_id": "CASE-2026-001",
                "is_pdf": True,
                "pdf_diff": diff_data
            }
        ]
    }

    res = client.post("/api/agent/events", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["ingested_events"] == 2
    assert data["findings_created"] >= 1

    # Verify PDF diff endpoint
    diff_res = client.get("/api/agent/pdf-diff/payroll_audit.pdf")
    assert diff_res.status_code == 200
    diff_data_res = diff_res.json()
    assert diff_data_res["has_diff"] is True
    assert diff_data_res["baseline_sha256"].startswith("aaaabbbb")
    assert diff_data_res["current_sha256"].startswith("dddd1111")
    assert diff_data_res["diff"]["changed_pages"] == [1]
