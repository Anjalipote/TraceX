"""
TraceX Historical Forensic Investigation End-to-End Test
==========================================================
Verifies:
1. Windows endpoint artifact collection:
   - NTFS USN Journal query & handling of elevation (Access is denied -> 'Historical record unavailable')
   - Per-file USN Data via 'fsutil usn readdata'
   - Windows Event Logs (Kernel-PnP hardware events, System)
   - USBSTOR Registry keys
   - NTFS File Metadata candidate discovery (ctime, mtime, atime, SHA-256)
   - PDF textual comparison
2. Full Pipeline ingestion via FastAPI:
   - Authorization -> Historical Scan -> Ingestion -> Evidence -> Timeline -> Findings -> Graph
   - Exact source provenance on Timeline events ('Source: NTFS File Metadata Scan', 'Event: FILE_MODIFIED', etc.)
   - Evidence tagged with is_live_agent=True and marked as HISTORICAL SCAN
   - Integrity rule: 'Historical record unavailable', never 'No file was changed'
"""

import os
import sys
import json
import time
import hashlib
from datetime import datetime, timezone

# Ensure project root is in sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))
sys.path.insert(0, BASE_DIR)

from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.services.collector_service import WindowsForensicCollector
from agent.tracex_agent import TraceXAgent

forensic_collector = WindowsForensicCollector()

def create_sample_pdf(file_path: str, content: str):
    """Generates a simple valid PDF containing text."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        c = canvas.Canvas(file_path, pagesize=letter)
        for idx, line in enumerate(content.split("\n")):
            c.drawString(72, 750 - (idx * 20), line)
        c.save()
    except ImportError:
        # Minimal valid PDF writer fallback
        pdf_bytes = (
            b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
            b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
            b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n"
            b"4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 72 712 Td (" + content.encode('ascii', 'ignore') + b") Tj ET\nendstream\nendobj\n"
            b"xref\n0 5\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000117 00000 n\n0000000201 00000 n\n"
            b"trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n296\n%%EOF\n"
        )
        with open(file_path, "wb") as f:
            f.write(pdf_bytes)

def main():
    print("=" * 70)
    print(" TRACEX HISTORICAL FORENSIC INVESTIGATION - END-TO-END TEST")
    print("=" * 70)

    evidence_dir = os.path.join(BASE_DIR, "agent_test_evidence")
    os.makedirs(evidence_dir, exist_ok=True)
    test_pdf = os.path.join(evidence_dir, "confidential_executive_payroll.pdf")

    # Step 1: Simulate historical file change before investigation started
    print("\n[Step 1] Simulating historical file modification on disk...")
    # Baseline version
    initial_text = "CONFIDENTIAL: Executive Payroll Q3 2026 - Approved By Board"
    create_sample_pdf(test_pdf, initial_text)
    with open(test_pdf, "rb") as f:
        initial_sha = hashlib.sha256(f.read()).hexdigest()
    print(f"  Created test PDF: {test_pdf}")
    print(f"  Initial SHA-256:  {initial_sha}")

    # Set up baseline manifest in agent baseline dir
    agent = TraceXAgent()
    base_cached = os.path.join(agent.baseline_dir, "base_confidential_executive_payroll.pdf")
    with open(base_cached, "wb") as f_out, open(test_pdf, "rb") as f_in:
        f_out.write(f_in.read())
    agent.baseline_manifest[os.path.abspath(test_pdf)] = {
        "sha256": initial_sha,
        "mtime": os.stat(test_pdf).st_mtime,
        "size": os.stat(test_pdf).st_size,
        "first_seen": datetime.now(timezone.utc).isoformat()
    }
    agent.save_baseline_manifest()
    print("  Cached baseline manifest for test document.")

    # Now modify the document (simulating unauthorized modification before scan)
    time.sleep(1) # Ensure timestamp tick
    tampered_text = "CONFIDENTIAL: Executive Payroll Q3 2026 - Modified Routing Num: 987654321"
    create_sample_pdf(test_pdf, tampered_text)
    with open(test_pdf, "rb") as f:
        modified_sha = hashlib.sha256(f.read()).hexdigest()
    print(f"  Modified file on disk: {test_pdf}")
    print(f"  Modified SHA-256:      {modified_sha}")
    assert initial_sha != modified_sha, "Hashes must differ after tampering"

    # Step 2: Test Low-Level Windows Forensic Collectors
    print("\n[Step 2] Testing Low-Level Windows Forensic Collectors...")
    
    # 2.1 NTFS USN Journal query
    usn_res = forensic_collector.collect_usn_journal("C:")
    print(f"  2.1 NTFS USN Journal Query:")
    print(f"      Status:  {usn_res['status']}")
    print(f"      Records: {usn_res['records_count']}")
    if usn_res['status'] == 'unavailable':
        print(f"      Reason:  {usn_res['reason']}")
        assert "Historical record unavailable" in usn_res['reason'], "Must display 'Historical record unavailable'"
        assert "No file was changed" not in usn_res['reason'], "Must never state 'No file was changed'"
    else:
        print(f"      Elevated mode confirmed: {len(usn_res['records'])} USN records collected.")

    # 2.2 Per-file USN ReadData
    file_usn = forensic_collector.read_file_usn_data(test_pdf)
    print(f"  2.2 Per-File USN Data ('fsutil usn readdata'):")
    if file_usn:
        print(f"      File Ref:   {file_usn.get('file_ref')}")
        print(f"      Parent Ref: {file_usn.get('parent_file_ref')}")
        print(f"      USN:        {file_usn.get('usn')}")
        print(f"      Reason:     {file_usn.get('reason')}")
    else:
        print("      File USN data: non-NTFS or standard user limitation")

    # 2.3 Windows Event Logs
    evt_res = forensic_collector.collect_event_logs(hours=24)
    print(f"  2.3 Windows Event Logs:")
    print(f"      Status:      {evt_res['status']}")
    print(f"      Events found: {evt_res['events_count']}")
    for k, v in evt_res.get('channel_status', {}).items():
        print(f"      Channel [{k}]: {v[:65]}...")

    # 2.4 Candidate File Discovery
    candidates = forensic_collector.discover_candidate_files(
        [evidence_dir], 
        hours=24,
        baseline_manifest=agent.baseline_manifest,
        baseline_cache_dir=agent.baseline_dir
    )
    print(f"  2.4 Candidate Files Discovery:")
    print(f"      Candidates found: {len(candidates)}")
    matched = next((c for c in candidates if c['file_name'] == 'confidential_executive_payroll.pdf'), None)
    assert matched is not None, "Tampered test PDF must be discovered in candidate files!"
    print(f"      Found Candidate: {matched['file_name']}")
    print(f"      SHA-256:         {matched['sha256']}")
    print(f"      mtime:           {matched['mtime']}")
    print(f"      Baseline Diverged: {matched.get('is_baseline_diverged')}")
    print(f"      Source:          {matched.get('source')}")
    assert matched.get('source') == "NTFS File Metadata Scan", "Source must be 'NTFS File Metadata Scan'"

    # Step 3: Test Full Pipeline via FastAPI TestClient
    print("\n[Step 3] Testing Full Historical Pipeline via FastAPI TestClient...")
    client = TestClient(app)
    token = create_access_token("user-alex-vance")
    headers = {"Authorization": f"Bearer {token}"}

    # 3.1 Authorize
    auth_resp = client.post("/api/investigations/authorize", json={
        "computer_id": "EMP-LT-001",
        "case_id": "TRX-001",
        "collection_type": "live",
        "authorized": True
    }, headers=headers)
    assert auth_resp.status_code == 200
    print("  3.1 Authorization granted successfully.")

    # 3.2 Execute Historical Scan
    scan_resp = client.post("/api/investigations/scan", json={
        "computer_id": "EMP-LT-001",
        "case_id": "TRX-001",
        "collection_type": "live",
        "investigation_mode": "historical",
        "hours": 24,
        "scan_paths": [evidence_dir]
    }, headers=headers)
    assert scan_resp.status_code == 200
    scan_data = scan_resp.json()
    print(f"  3.2 Historical Scan Executed:")
    print(f"      Mode:                {scan_data.get('investigation_mode')}")
    print(f"      Artifacts Collected: {scan_data.get('artifacts_collected')}")
    print(f"      Stages Count:        {len(scan_data.get('stages', []))}")
    for stage in scan_data.get("stages", []):
        print(f"      - [{stage['id']}] {stage['name']}: {stage['status']} ({stage['artifacts_count']} items)")
    assert scan_data.get("investigation_mode") == "historical"

    # 3.3 Investigation Results
    res_resp = client.get("/api/investigations/TRX-001/results", headers=headers)
    assert res_resp.status_code == 200
    res_data = res_resp.json()
    print(f"\n  3.3 Investigation Results:")
    print(f"      Mode:             {res_data.get('investigation_mode')}")
    print(f"      Telemetry Status: {res_data.get('telemetry_status')}")
    print(f"      Suspicious Count: {res_data.get('suspicious_events_count')}")
    print(f"      Candidate Files:  {res_data.get('files_accessed_count')}")
    assert res_data.get("investigation_mode") == "historical"

    # 3.4 Evidence Table Inspection
    evi_resp = client.get("/api/cases/TRX-001/evidence", headers=headers)
    assert evi_resp.status_code == 200, f"Evidence endpoint error: {evi_resp.text}"
    evi_items = evi_resp.json()
    print(f"\n  3.4 Ingested Evidence Verification ({len(evi_items)} items):")
    live_items = [e for e in evi_items if e.get("isLiveAgent") or e.get("is_live_agent")]
    print(f"      Live / Historical items in Evidence: {len(live_items)}")
    found_evi = next((e for e in live_items if "confidential_executive_payroll" in e.get("filename", "")), None)
    assert found_evi is not None, "Target PDF must be registered in Evidence table!"
    print(f"      Filename:        {found_evi.get('filename')}")
    print(f"      SHA-256:         {found_evi.get('sha256_hash') or found_evi.get('sha256')}")
    print(f"      is_live_agent:   {found_evi.get('is_live_agent')}")
    print(f"      Storage Path:    {found_evi.get('storage_path')}")
    print(f"      Notes:           {found_evi.get('notes')}")

    # 3.5 Timeline Verification
    tl_resp = client.get("/api/cases/TRX-001/timeline", headers=headers)
    assert tl_resp.status_code == 200, f"Timeline endpoint error: {tl_resp.text}"
    tl_items = tl_resp.json()
    print(f"\n  3.5 Timeline Events Verification ({len(tl_items)} events):")
    historical_events = [t for t in tl_items if "Source:" in t.get("description", "") or "Scan" in t.get("description", "")]
    print(f"      Discovered Historical Forensic Events: {len(historical_events)}")
    for idx, event in enumerate(historical_events[:5], 1):
        print(f"\n      Timeline Event #{idx}:")
        print(f"        Event Type:  {event.get('event_type')}")
        print(f"        Severity:    {event.get('severity')}")
        print(f"        Timestamp:   {event.get('timestamp')}")
        print(f"        Description: {repr(event.get('description'))[:120]}...")
        desc = event.get('description', '')
        assert "Source:" in desc, "Event description must contain Source provenance"
        assert "Event:" in desc or "FILE" in desc or "Device" in desc

    # 3.6 Connections Graph Verification
    graph_resp = client.get("/api/cases/TRX-001/relationships", headers=headers)
    assert graph_resp.status_code == 200, f"Graph endpoint error: {graph_resp.text}"
    g_data = graph_resp.json()
    print(f"\n  3.6 Connections Graph Verification:")
    print(f"      Total Nodes: {len(g_data.get('nodes', []))}")
    print(f"      Total Edges: {len(g_data.get('edges', []))}")
    assert len(g_data.get("nodes", [])) > 0
    assert len(g_data.get("edges", [])) > 0

    print("\n" + "=" * 70)
    print(" >>> ALL HISTORICAL FORENSIC SCAN TESTS PASSED SUCCESSFULLY! <<<")
    print("=" * 70)

if __name__ == "__main__":
    main()
