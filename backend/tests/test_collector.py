import sys
import os
import json
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.main import app
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.investigation_file import InvestigationFile
from app.models.forensic_event import ForensicEvent
from app.models.timeline import TimelineEvent
from app.core.database import SessionLocal

client = TestClient(app)


def test_collector_session_endpoint():
    case_id = "INV-COLLECTOR-TEST-001"
    response = client.post(f"/api/investigations/{case_id}/collector/session")
    assert response.status_code == 200
    data = response.json()
    assert data["case_id"] == case_id
    assert "session_token" in data
    assert data["authorized"] is True


def test_collector_upload_and_correlation():
    case_id = "INV-COLLECTOR-TEST-002"
    payload = {
        "case_id": case_id,
        "computer_id": "TEST-ENDPOINT",
        "manifest": {
            "case_id": case_id,
            "computer_id": "TEST-ENDPOINT",
            "collector_version": "1.0.0",
            "target_path": "C:\\TraceX-Test",
            "overall_evidence_seal_sha256": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            "artifacts": {
                "files.json": {"bytes": 1024, "sha256": "aaa", "record_count": 2}
            }
        },
        "artifacts": {
            "files": {
                "total_files": 2,
                "files": [
                    {
                        "path": "C:\\TraceX-Test\\document1.pdf",
                        "name": "document1.pdf",
                        "size": 10240,
                        "sha256": "1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
                        "mtime": "2026-10-08T10:00:00+00:00",
                        "ctime": "2026-10-08T09:00:00+00:00",
                        "atime": "2026-10-08T10:30:00+00:00",
                        "attributes": ["Archive"],
                        "usn_file_ref": "0x0001"
                    },
                    {
                        "path": "C:\\TraceX-Test\\data.xlsx",
                        "name": "data.xlsx",
                        "size": 2048,
                        "sha256": "222233334444555566667777888899990000aaaabbbbccccddddeeeeffff1111",
                        "mtime": "2026-10-08T10:05:00+00:00",
                        "ctime": "2026-10-08T09:05:00+00:00",
                        "atime": "2026-10-08T10:35:00+00:00",
                        "attributes": ["Archive"],
                        "usn_file_ref": "0x0002"
                    }
                ]
            },
            "usn_journal": {
                "total_events": 1,
                "events": [
                    {
                        "usn": "123456",
                        "file_ref": "0x0001",
                        "change_reason": "USN_REASON_FILE_CREATE",
                        "timestamp": "2026-10-08T09:00:00+00:00",
                        "file_name": "document1.pdf",
                        "volume": "C:"
                    }
                ]
            },
            "usb": {
                "total_devices": 1,
                "devices": [
                    {
                        "name": "SanDisk Ultra USB 3.0",
                        "serial": "4C530001230912098134",
                        "hardware_id": "USB\\VID_0781&PID_5581"
                    }
                ]
            },
            "windows_events": {
                "total_events": 1,
                "events": [
                    {
                        "channel": "System",
                        "event_id": "7036",
                        "time_created": "2026-10-08T09:00:00+00:00",
                        "provider": "Service Control Manager",
                        "description": "The TraceX Service entered the running state."
                    }
                ]
            }
        }
    }

    response = client.post(f"/api/investigations/{case_id}/collector/upload", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["case_id"] == case_id
    assert res_data["artifacts_summary"]["files_ingested"] == 2
    assert res_data["artifacts_summary"]["usn_events_ingested"] == 1
    assert res_data["artifacts_summary"]["usb_devices_ingested"] == 1

    # Check collector status endpoint
    status_resp = client.get(f"/api/investigations/{case_id}/collector/status")
    assert status_resp.status_code == 200
    st_data = status_resp.json()
    assert st_data["total_files"] == 2
    assert st_data["total_forensic_events"] >= 4
    assert st_data["total_evidence_items"] >= 1
    assert st_data["is_real_investigation"] is True

    # Database verification
    db = SessionLocal()
    try:
        inv_files = db.query(InvestigationFile).filter(InvestigationFile.investigation_id == case_id).all()
        assert len(inv_files) == 2
        file_names = {f.file_name for f in inv_files}
        assert "document1.pdf" in file_names
        assert "data.xlsx" in file_names

        # Check that manifest evidence record was registered and sealed
        manifest_ev = db.query(Evidence).filter(
            Evidence.case_id == case_id,
            Evidence.filename == "manifest.json"
        ).first()
        assert manifest_ev is not None
        assert manifest_ev.sha256_hash == "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"

        # Check timeline events generated by correlation engine
        timeline_events = db.query(TimelineEvent).filter(TimelineEvent.case_id == case_id).all()
        assert len(timeline_events) > 0
    finally:
        db.close()
