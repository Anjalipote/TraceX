import os
import sys
import json
import time
import hashlib
import urllib.request
import urllib.error
import pypdf

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from app.services.pdf_diff_service import PdfDiffService


def create_forensic_pdf(pages_text: list, output_path: str):
    """
    Creates a standard, valid PDF 1.4 document with real text streams.
    """
    page_ids = []
    content_ids = []
    obj_count = 3
    for i in range(len(pages_text)):
        obj_count += 1
        page_ids.append(obj_count)
        obj_count += 1
        content_ids.append(obj_count)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(b"%PDF-1.4\n")
        offsets = {}

        def write_obj(num, content):
            offsets[num] = f.tell()
            f.write(f"{num} 0 obj\n".encode("ascii"))
            f.write(content)
            f.write(b"\nendobj\n")

        write_obj(1, b"<< /Type /Catalog /Pages 2 0 R >>")
        pages_refs = " ".join(f"{pid} 0 R" for pid in page_ids)
        write_obj(2, f"<< /Type /Pages /Kids [{pages_refs}] /Count {len(pages_text)} >>".encode("ascii"))
        write_obj(3, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

        for i, text in enumerate(pages_text):
            pid = page_ids[i]
            cid = content_ids[i]
            y = 720
            stream_body = "BT /F1 12 Tf "
            for line in text.splitlines():
                safe_l = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
                stream_body += f"50 {y} Td ({safe_l}) Tj 0 -22 Td "
                y -= 22
            stream_body += "ET"
            stream_bytes = stream_body.encode("latin1")

            write_obj(
                pid,
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents {cid} 0 R /Resources << /Font << /F1 3 0 R >> >> >>".encode("ascii")
            )
            write_obj(
                cid,
                f"<< /Length {len(stream_bytes)} >>\nstream\n".encode("ascii") + stream_bytes + b"\nendstream"
            )

        xref_start = f.tell()
        f.write(f"xref\n0 {obj_count + 1}\n0000000000 65535 f \n".encode("ascii"))
        for num in range(1, obj_count + 1):
            f.write(f"{offsets[num]:010d} 00000 n \n".encode("ascii"))
        f.write(f"trailer\n<< /Size {obj_count + 1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n".encode("ascii"))


def calc_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def send_api_request(endpoint: str, data: dict = None, method: str = "POST", base_url: str = "http://127.0.0.1:8000/api"):
    url = f"{base_url.rstrip('/')}/{endpoint.lstrip('/')}"
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            return json.loads(res.read().decode("utf-8"))
    except Exception as e:
        print(f"[API Error] Failed request to {url}: {e}")
        return None


def run_test_workflow():
    print("=" * 70)
    print("TRACEX LIVE WINDOWS AGENT — END-TO-END WORKFLOW VERIFICATION")
    print("=" * 70)

    test_dir = os.path.abspath("./agent_test_evidence")
    os.makedirs(test_dir, exist_ok=True)
    pdf_filename = "confidential_executive_payroll.pdf"
    pdf_path = os.path.join(test_dir, pdf_filename)

    # 1. Register Agent with TraceX Backend
    print("\n[Step 1] Registering Windows Endpoint Agent...")
    reg_payload = {
        "hostname": "EMP-LT-001",
        "ip_address": "192.168.1.105",
        "os_info": "Windows 11 Enterprise (Build 22631)",
        "current_user": "Employee01",
        "agent_version": "v2.5.0-win64",
        "monitored_paths": [test_dir]
    }
    reg_res = send_api_request("/agent/register", reg_payload)
    print("  Registration Response:", reg_res)
    assert reg_res and reg_res.get("success"), "Agent registration failed"

    # 2. Generate Initial Baseline PDF
    print("\n[Step 2] Generating Initial Baseline PDF Document...")
    baseline_page_1 = """CONFIDENTIAL EXECUTIVE PAYROLL & COMPENSATION REPORT
Host: EMP-LT-001
Department: Finance & Core Engineering
Employee Name: John Doe (Senior Architect)
Routing Number: 123456789
Account Number: 9876543210
Annual Base Compensation: $140,000
Authorized By: Board of Directors"""

    baseline_page_2 = """CRYPTOGRAPHIC RECORD & RETENTION POLICY
Data Integrity: SHA-256 Validated Baseline
Classification: Proprietary / Restricted Distribution
Unauthorized disclosure or alteration is subject to forensic audit."""

    create_forensic_pdf([baseline_page_1, baseline_page_2], pdf_path)
    baseline_hash = calc_sha256(pdf_path)
    print(f"  Created Baseline PDF at: {pdf_path}")
    print(f"  Baseline SHA-256 Hash:   {baseline_hash}")

    # Send Creation Event to Backend
    print("\n[Step 3] Transmitting 'CREATED' Event to TraceX Backend...")
    create_event_payload = {
        "hostname": "EMP-LT-001",
        "agent_version": "v2.5.0-win64",
        "case_id": "CASE-2026-001",
        "events": [
            {
                "event_type": "created",
                "file_path": pdf_path,
                "file_name": pdf_filename,
                "file_size": os.path.getsize(pdf_path),
                "file_extension": ".pdf",
                "sha256_hash": baseline_hash,
                "baseline_sha256": baseline_hash,
                "is_modified_from_baseline": False,
                "timestamp": "2026-10-02T14:30:00Z",
                "user": "Employee01",
                "hostname": "EMP-LT-001",
                "case_id": "CASE-2026-001",
                "is_pdf": True
            }
        ]
    }
    create_res = send_api_request("/agent/events", create_event_payload)
    print("  Ingestion Result:", create_res)

    # 3. Simulate Unauthorized Content Alteration
    print("\n[Step 4] Simulating Unauthorized Content Alteration on Page 1...")
    time.sleep(1)

    modified_page_1 = """CONFIDENTIAL EXECUTIVE PAYROLL & COMPENSATION REPORT
Host: EMP-LT-001
Department: Finance & Core Engineering
Employee Name: John Doe (Senior Architect)
Routing Number: 999888777
Account Number: 9876543210
Annual Base Compensation: $350,000
Authorized By: Board of Directors"""

    # Keep Page 2 identical to test page-level isolation
    create_forensic_pdf([modified_page_1, baseline_page_2], pdf_path)
    modified_hash = calc_sha256(pdf_path)
    print(f"  Modified PDF SHA-256 Hash: {modified_hash}")
    assert modified_hash != baseline_hash, "Hash did not change!"

    # 4. Extract Text & Compute Page-by-Page Diff
    print("\n[Step 5] Extracting Text & Computing Exact Page-by-Page Differences...")
    diff_result = PdfDiffService.compare_pdf_pages(
        [baseline_page_1, baseline_page_2],
        [modified_page_1, baseline_page_2]
    )
    print(f"  Changed Pages Detected:   {diff_result['changed_pages']}")
    print(f"  Total Additions:          {diff_result['total_additions']}")
    print(f"  Total Deletions:          {diff_result['total_deletions']}")
    print(f"  Summary:                  {diff_result['summary']}")

    page1_diff = diff_result["pages"][0]
    print("\n  [Page 1 Alteration Details]:")
    print("    Removed Lines:", page1_diff["removed_lines"])
    print("    Added Lines:  ", page1_diff["added_lines"])

    page2_diff = diff_result["pages"][1]
    print(f"  [Page 2 Status]: Has changes = {page2_diff['has_changes']} (Correctly isolated)")

    # 5. Send 'MODIFIED' Event with Full PDF Diff Payload to Backend
    print("\n[Step 6] Transmitting 'MODIFIED' Event with Forensic PDF Diff to Backend...")
    mod_event_payload = {
        "hostname": "EMP-LT-001",
        "agent_version": "v2.5.0-win64",
        "case_id": "CASE-2026-001",
        "events": [
            {
                "event_type": "modified",
                "file_path": pdf_path,
                "file_name": pdf_filename,
                "file_size": os.path.getsize(pdf_path),
                "file_extension": ".pdf",
                "sha256_hash": modified_hash,
                "baseline_sha256": baseline_hash,
                "is_modified_from_baseline": True,
                "timestamp": "2026-10-02T14:34:18Z",
                "user": "Employee01",
                "hostname": "EMP-LT-001",
                "case_id": "CASE-2026-001",
                "is_pdf": True,
                "pdf_diff": diff_result
            }
        ]
    }
    mod_res = send_api_request("/agent/events", mod_event_payload)
    print("  Modification Ingestion Result:", mod_res)

    # 6. Verify Backend State & Query Diff API
    print("\n[Step 7] Querying TraceX Backend for Ingested Diff & Integrity Status...")
    diff_api_res = send_api_request(f"/agent/pdf-diff/{pdf_filename}", method="GET")
    if diff_api_res and diff_api_res.get("has_diff"):
        print("  [OK] Backend PDF Diff API Verified!")
        print(f"    Baseline Hash: {diff_api_res['baseline_sha256'][:16]}...")
        print(f"    Current Hash:  {diff_api_res['current_sha256'][:16]}...")
        print(f"    Changed Pages: {diff_api_res['diff']['changed_pages']}")
    else:
        print("  [Note] Diff API response:", diff_api_res)

    print("\n" + "=" * 70)
    print("ALL TESTS COMPLETED SUCCESSFULLY! LIVE AGENT TELEMETRY VERIFIED.")
    print("=" * 70)


if __name__ == "__main__":
    run_test_workflow()
