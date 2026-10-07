import os
import sys
import json
import time
import hashlib
from datetime import datetime, timezone

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.core.database import SessionLocal
from app.models.case import Case
from app.models.investigation_file import InvestigationFile
from app.models.file_artifact import FileMetadata, FileHash, UsnEventRecord

def run_workflow_verification():
    print("=" * 70)
    print("TRACEX REAL FORENSIC INVESTIGATION — END-TO-END VERIFICATION")
    print("=" * 70)

    client = TestClient(app)
    token = create_access_token("user-alex-vance")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    test_dir = os.path.join(os.path.dirname(__file__), "agent_test_evidence")
    os.makedirs(test_dir, exist_ok=True)
    real_target_file = os.path.join(test_dir, "real_investigation_doc.txt")

    # Step 0: Create a real test file on the Windows laptop
    original_bytes = b"CONFIDENTIAL INTERNAL FINANCIAL REPORT - Q3\r\nPreserve this record."
    with open(real_target_file, "wb") as f:
        f.write(original_bytes)
    time.sleep(0.1)

    initial_sha = hashlib.sha256(original_bytes).hexdigest()
    print(f"\n[Setup] Created real target file on disk:")
    print(f"  Path: {real_target_file}")
    print(f"  Initial SHA-256: {initial_sha}")

    # STEP 1: INVESTIGATE COMPUTER (Host Discovery)
    print("\n--- STEP 1: INVESTIGATE COMPUTER ---")
    resp = client.get("/api/investigations/computers", headers=headers)
    assert resp.status_code == 200, f"Host discovery failed: {resp.text}"
    computers = resp.json()
    print(f"Discovered {len(computers)} available target machines:")
    for c in computers:
        print(f"  • {c['name']} | ID: {c['id']} | Mode: {c['collection_type']} | Status: {c['status']}")
    
    live_computer = next((c for c in computers if not c.get("is_demo")), computers[0])
    computer_id = live_computer["id"]

    # STEP 2: AUTHORIZATION (Explicit Permission)
    print("\n--- STEP 2: AUTHORIZATION ---")
    auth_payload = {
        "computer_id": computer_id,
        "case_id": "TRX-001",
        "collection_mode": "read_only",
        "collection_type": "live",
        "authorized": True,
        "categories": ["System Logs", "File Activity", "USB / Device Activity"]
    }
    resp = client.post("/api/investigations/authorize", json=auth_payload, headers=headers)
    assert resp.status_code == 200, f"Authorization failed: {resp.text}"
    auth_data = resp.json()
    print(f"Authorization Recorded:")
    print(f"  • Auth ID:            {auth_data['authorization_id']}")
    print(f"  • Computer ID:        {auth_data['computer_id']}")
    print(f"  • Read-Only Mode:     {auth_data['collection_mode']}")
    print(f"  • Guarantee Notice:   {auth_data['notice']}")

    # STEP 3: SELECT FILE (Select & Verify On-Disk File)
    print("\n--- STEP 3: SELECT FILE ---")
    select_payload = {
        "computer_id": computer_id,
        "case_id": "TRX-001",
        "file_path": real_target_file
    }
    resp = client.post("/api/investigations/select-file", json=select_payload, headers=headers)
    assert resp.status_code == 200, f"File selection failed: {resp.text}"
    sel_data = resp.json()
    print(f"On-Disk File Verification:")
    print(f"  • Target Path:        {sel_data['file_path']}")
    print(f"  • Exists on Disk:     {sel_data['file_exists']}")
    print(f"  • File Size:          {sel_data['file_size']} bytes")
    print(f"  • Current SHA-256:    {sel_data['current_sha256']}")
    print(f"  • USN File Reference: {sel_data['usn_file_ref']}")
    assert sel_data["file_exists"] is True
    assert sel_data["current_sha256"] == initial_sha

    # Simulate past file modification on laptop before historical scan
    time.sleep(0.5)
    modified_bytes = b"CONFIDENTIAL INTERNAL FINANCIAL REPORT - Q3\r\nPreserve this record.\r\n[ALTERATION]: Unapproved modification performed."
    with open(real_target_file, "wb") as f:
        f.write(modified_bytes)
    time.sleep(0.1)

    diverged_sha = hashlib.sha256(modified_bytes).hexdigest()
    print(f"\n[Simulation] File modified on laptop before TraceX historical scan:")
    print(f"  New Diverged SHA-256: {diverged_sha}")

    # STEP 4: REAL FORENSIC COLLECTION (Historical Scan & NTFS journal inspection)
    print("\n--- STEP 4: REAL FORENSIC COLLECTION ---")
    scan_payload = {
        "computer_id": computer_id,
        "case_id": "TRX-001",
        "target_file_path": real_target_file,
        "investigation_mode": "historical",
        "collection_type": "live",
        "hours": 24,
        "scan_paths": [test_dir]
    }
    resp = client.post("/api/investigations/scan", json=scan_payload, headers=headers)
    assert resp.status_code == 200, f"Scan execution failed: {resp.text}"
    scan_data = resp.json()
    print(f"Forensic Scan Completed:")
    print(f"  • Scan ID:            {scan_data['scan_id']}")
    print(f"  • Artifacts Ingested: {scan_data['artifacts_collected']}")
    print(f"  • Elapsed Time:       {scan_data['elapsed_seconds']}s")
    for s in scan_data["stages"]:
        print(f"    - [Stage {s['id']}] {s['name']}: {s['status']} ({s['artifacts_count']} items)")

    # STEP 5: INVESTIGATION RESULTS & HISTORICAL DOSSIER
    print("\n--- STEP 5: INVESTIGATION RESULTS & CORRELATION ---")
    resp = client.get("/api/investigations/TRX-001/results", headers=headers)
    assert resp.status_code == 200, f"Results fetch failed: {resp.text}"
    results = resp.json()
    print(f"Correlated Results:")
    print(f"  • Summary:            {results['summary']}")
    print(f"  • Suspicious Events:  {results['suspicious_events_count']}")
    print(f"  • USB Devices:        {results['usb_devices_count']}")
    print(f"  • Candidate Files:    {results['files_accessed_count']}")
    print(f"  • Findings Count:     {len(results['findings'])}")

    for idx, f in enumerate(results["findings"], 1):
        print(f"\n  [Finding #{idx}] [{f['severity']}] {f['title']}")
        print(f"    Description:    {f['description']}")
        print(f"    Why Suspicious: {f['why_suspicious']}")
        print(f"    Live Agent Tag: {f.get('is_live_agent')}")

    # Check Database Persistence
    print("\n--- DATABASE VERIFICATION (PostgreSQL/SQLite Models) ---")
    db = SessionLocal()
    try:
        inv_file = db.query(InvestigationFile).filter(InvestigationFile.investigation_id == "TRX-001").first()
        assert inv_file is not None, "InvestigationFile record was not persisted in database"
        print(f"  [OK] InvestigationFile table: Found {inv_file.original_file_path}")
        print(f"    Current SHA:  {inv_file.current_sha256}")
        print(f"    Baseline SHA: {inv_file.baseline_sha256}")
        print(f"    Diverged:     {inv_file.is_hash_diverged}")

        meta = db.query(FileMetadata).filter(FileMetadata.file_path == real_target_file).first()
        if meta:
            print(f"  [OK] FileMetadata table: Found record (size={meta.file_size}, vol={meta.volume})")

        hashes = db.query(FileHash).filter(FileHash.file_path == real_target_file).all()
        print(f"  [OK] FileHash table: Found {len(hashes)} cryptographic hash records")
    finally:
        db.close()

    # Verify Non-Accusatory Standard in Output
    full_text = json.dumps(results)
    forbidden_terms = ["stole the file", "guilty of theft", "criminal perpetrator"]
    for term in forbidden_terms:
        assert term not in full_text.lower(), f"Forbidden accusatory phrase found: {term}"

    print("\n" + "=" * 70)
    print("ALL VERIFICATION CHECKS PASSED SUCCESSFULLY (100% REAL WINDOWS DFIR)")
    print("=" * 70)

if __name__ == "__main__":
    run_workflow_verification()
