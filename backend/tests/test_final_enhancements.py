import os
import sys
# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import subprocess
from fastapi.testclient import TestClient
from app.main import app
from app.services.merkle_service import MerkleService
from app.services.custody_service import CustodyService
from app.services.metadata_service import MetadataService
from app.services.anomaly_service import AnomalyService
from app.services.clustering_service import ClusteringService
from app.services.report_service import ReportService
from app.core.database import SessionLocal

client = TestClient(app)

def get_auth_token():
    res = client.post("/api/auth/login", json={"email": "investigator@tracex.demo", "password": "TraceX@123"})
    assert res.status_code == 200
    return res.json()["access_token"]

def test_merkle_root_deterministic_and_sensitivity():
    """Verify deterministic Merkle root calculation and single-bit alteration sensitivity."""
    leaves = [
        "8a3f7c92d5e683b1a40f8e91cd2a34bb7219e8cf1032948bb37e6f81a7d45e90",
        "c4b123fe9082a5124db899018e4726bf738012658921dfbbca20173645920194",
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    ]
    root1 = MerkleService.calculate_merkle_root(leaves)
    root2 = MerkleService.calculate_merkle_root(list(reversed(leaves)))
    # Deterministic order-invariance
    assert root1 == root2
    assert len(root1) == 64

    # Single-byte alteration alters the entire Merkle Root
    tampered_leaves = [
        "8a3f7c92d5e683b1a40f8e91cd2a34bb7219e8cf1032948bb37e6f81a7d45e91",  # 0 -> 1
        "c4b123fe9082a5124db899018e4726bf738012658921dfbbca20173645920194",
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    ]
    tampered_root = MerkleService.calculate_merkle_root(tampered_leaves)
    assert tampered_root != root1

def test_chain_of_custody_hash_linkage():
    """Test cryptographic hash linkage of chain of custody entries."""
    db = SessionLocal()
    try:
        case_id = "CASE-2026-001"
        CustodyService.seed_case_custody_if_empty(db, case_id)
        chain = CustodyService.get_custody_chain(db, case_id)
        assert len(chain) >= 8

        # Block 1 previous hash must be genesis
        assert chain[0].previous_hash == ("0" * 64)

        # Every subsequent block previous_hash must match predecessor record_hash
        for i in range(1, len(chain)):
            assert chain[i].previous_hash == chain[i - 1].record_hash

        # Chain verification must pass
        res = CustodyService.verify_chain_integrity(db, case_id)
        assert res["is_valid"] is True
        assert res["status"] == "VERIFIED"
    finally:
        db.close()

def test_merkle_and_custody_api_endpoints():
    """Test REST API endpoints for Merkle Root and Chain of Custody."""
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Merkle endpoint
    res = client.get("/api/cases/CASE-2026-001/merkle", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "merkle_root" in data
    assert len(data["merkle_root"]) == 64
    assert data["is_valid"] is True

    # Custody chain endpoint
    res = client.get("/api/cases/CASE-2026-001/custody", headers=headers)
    assert res.status_code == 200
    chain = res.json()
    assert isinstance(chain, list)
    assert len(chain) >= 8

    # Custody verify endpoint
    res = client.get("/api/cases/CASE-2026-001/custody/verify", headers=headers)
    assert res.status_code == 200
    v = res.json()
    assert v["is_valid"] is True
    assert v["status"] == "VERIFIED"

def test_magic_byte_mismatch_detection(tmp_path):
    """Test detection of disguised executables disguised as image/document."""
    # Write PE header (MZ) into a .jpg file
    fake_jpg = tmp_path / "invoice_photo.jpg"
    fake_jpg.write_bytes(b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00" + b"A" * 100)

    meta = MetadataService.extract_metadata(str(fake_jpg), "invoice_photo.jpg")
    assert meta["is_type_mismatch"] is True
    assert "Windows Portable Executable" in meta["mismatch_details"]

def test_activity_phases_endpoint():
    """Test activity phase grouping API."""
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/cases/CASE-2026-001/clusters/phases", headers=headers)
    assert res.status_code == 200
    phases = res.json()
    assert len(phases) == 5
    assert phases[0]["phase_name"] == "Phase 1: Potential Staging Activity"
    assert phases[1]["phase_name"] == "Phase 2: Potential Access Activity"
    assert phases[2]["phase_name"] == "Phase 3: Potential Collection Activity"
    assert phases[3]["phase_name"] == "Phase 4: Potential Transfer Activity"
    assert phases[4]["phase_name"] == "Phase 5: Potential Cleanup Activity"

def test_self_verifying_report_integrity():
    """Test report generation and cryptographic self-verification."""
    db = SessionLocal()
    try:
        story = ReportService.generate_investigation_story(db, "CASE-2026-001")
        assert "case_merkle_root" in story
        assert len(story["case_merkle_root"]) == 64
        assert story["custody_verified"] is True

        v = ReportService.verify_report_integrity(db, "CASE-2026-001")
        assert v["is_valid"] is True
        assert "case_merkle_root" in v
        assert v["merkle_root_verified"] is True
        assert v["custody_chain_verified"] is True
    finally:
        db.close()

def test_standalone_verify_script():
    """Test standalone verify.py script execution."""
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    verify_script = os.path.join(root_dir, "verify.py")
    assert os.path.exists(verify_script)

    result = subprocess.run(
        [sys.executable, verify_script, "--case", "CASE-2026-001"],
        capture_output=True,
        text=True,
        cwd=root_dir
    )
    assert result.returncode == 0
    assert "TRACE-X INDEPENDENT FORENSIC INTEGRITY VERIFIER" in result.stdout
    assert "EVIDENCE SET MERKLE ROOT CALCULATION" in result.stdout
    assert "TAMPER-EVIDENT CHAIN OF CUSTODY VERIFICATION" in result.stdout
    assert "OVERALL CASE INTEGRITY AUDIT:  [VERIFIED]" in result.stdout
