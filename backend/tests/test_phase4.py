import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

client = TestClient(app)

# Helper tokens for RBAC tests
admin_token = create_access_token(subject="user-alex-vance", role="ADMIN")
investigator_token = create_access_token(subject="user-marcus-thorne", role="INVESTIGATOR")
viewer_token = create_access_token(subject="user-sarah-chen", role="VIEWER")

def test_rbac_admin_user_management():
    """Admin has exclusive authority to view users and change roles."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/users", headers=headers)
    assert res.status_code == 200
    users = res.json()
    assert len(users) >= 3
    # Password hashes must never be exposed
    for u in users:
        assert "password_hash" not in u
        assert "password" not in u

def test_rbac_viewer_blocked_from_admin_actions():
    """Viewer role must receive 403 Forbidden on user management."""
    headers = {"Authorization": f"Bearer {viewer_token}"}
    res = client.get("/api/users", headers=headers)
    assert res.status_code == 403
    assert "Access Denied" in res.json()["detail"]

def test_rbac_viewer_blocked_from_evidence_upload():
    """Viewer role must receive 403 Forbidden when attempting to upload evidence."""
    headers = {"Authorization": f"Bearer {viewer_token}"}
    files = {"file": ("test.txt", b"inert evidence stream", "text/plain")}
    res = client.post("/api/cases/CASE-2026-001/evidence/upload", files=files, headers=headers)
    assert res.status_code == 403
    assert "Access Denied" in res.json()["detail"]

def test_case_access_control_restricted():
    """Non-admin user attempting to access restricted case must receive 403 Forbidden."""
    headers = {"Authorization": f"Bearer {viewer_token}"}
    res = client.get("/api/cases/CASE-RESTRICTED-099/evidence", headers=headers)
    assert res.status_code == 403
    assert "restricted" in res.json()["detail"].lower()

def test_case_access_control_admin_override():
    """Administrator has full clearance to access restricted cases."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/cases/CASE-RESTRICTED-099/evidence", headers=headers)
    assert res.status_code == 200

def test_audit_logs_endpoints():
    """Audit logs must return paginated records and chronological activity feed."""
    headers = {"Authorization": f"Bearer {investigator_token}"}
    
    # Case audit logs
    res = client.get("/api/cases/CASE-2026-001/audit", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "logs" in data
    assert data["total"] >= 1

    # Case activity feed
    res_feed = client.get("/api/cases/CASE-2026-001/activity", headers=headers)
    assert res_feed.status_code == 200
    feed = res_feed.json()
    assert isinstance(feed, list)
    assert len(feed) >= 1

def test_evidence_gaps_endpoint():
    """Evidence gap detection must identify missing telemetry and explain why it matters."""
    headers = {"Authorization": f"Bearer {investigator_token}"}
    res = client.get("/api/cases/CASE-2026-001/gaps", headers=headers)
    assert res.status_code == 200
    gaps = res.json()
    assert len(gaps) >= 2
    for g in gaps:
        assert "whyItMatters" in g
        assert "suggestedStep" in g
        assert g["severity"] in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

def test_explainability_center_endpoint():
    """Explainability Center must return audit traces with Input Evidence -> Analysis Rule -> Result -> Confidence."""
    headers = {"Authorization": f"Bearer {investigator_token}"}
    res = client.get("/api/cases/CASE-2026-001/explainability", headers=headers)
    assert res.status_code == 200
    traces = res.json()
    assert len(traces) >= 5
    first = traces[0]
    assert "inputEvidence" in first
    assert "analysisRule" in first
    assert "detectedPattern" in first
    assert "result" in first
    assert "confidence" in first

def test_case_comparison_endpoint():
    """Comparing two cases must produce side-by-side metric deltas and comparative insights."""
    headers = {"Authorization": f"Bearer {investigator_token}"}
    res = client.get("/api/cases/compare?case1=CASE-2026-001&case2=CASE-2026-002", headers=headers)
    assert res.status_code == 200
    comp = res.json()
    assert "caseA" in comp
    assert "caseB" in comp
    assert "deltas" in comp
    assert "riskScoreDelta" in comp["deltas"]
    assert len(comp["insights"]) >= 1

def test_report_generation_integrity_and_export():
    """Generating a report must produce a valid SHA-256 digest verifiable via the integrity API."""
    headers = {"Authorization": f"Bearer {investigator_token}"}
    
    # 1. Generate report
    gen_res = client.post(
        "/api/cases/CASE-2026-001/reports",
        json={"title": "Phase 4 Dossier", "report_type": "Full Forensic Dossier", "case_id": "CASE-2026-001"},
        headers=headers
    )
    assert gen_res.status_code == 201
    rep = gen_res.json()
    assert rep["report_hash"] is not None
    assert len(rep["report_hash"]) == 64  # SHA-256 length

    # 2. Verify report integrity
    verify_res = client.get(f"/api/reports/{rep['id']}/verify", headers=headers)
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["is_valid"] is True
    assert v_data["status"] == "VERIFIED_MATCH"

    # 3. Test tamper detection
    tamper_res = client.get(f"/api/reports/{rep['id']}/verify?claimed_hash=0000000000000000000000000000000000000000000000000000000000000000", headers=headers)
    assert tamper_res.status_code == 200
    assert tamper_res.json()["is_valid"] is False

    # 4. CSV Export
    csv_res = client.get("/api/cases/CASE-2026-001/reports/export/csv", headers=headers)
    assert csv_res.status_code == 200
    assert "=== TRACEX INVESTIGATION EVIDENCE EXPORT ===" in csv_res.text

def test_security_path_traversal_prevention():
    """Filenames with directory traversal sequences must be rejected with 400 Bad Request."""
    headers = {"Authorization": f"Bearer {investigator_token}"}
    files = {"file": ("../../etc/passwd", b"malicious content", "text/plain")}
    res = client.post("/api/cases/CASE-2026-001/evidence/upload", files=files, headers=headers)
    assert res.status_code == 400
    assert "Path traversal sequences prohibited" in res.json()["detail"]

def test_security_headers_present():
    """Security hardening headers must be present in API responses."""
    res = client.get("/api/health")
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert res.headers.get("X-XSS-Protection") == "1; mode=block"
