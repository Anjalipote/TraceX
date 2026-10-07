import os
import sys
import json
import urllib.request

# Add backend to path for token generation
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from app.core.security import create_access_token

def run_test():
    token = create_access_token("user-alex-vance")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    print("==================================================")
    print("TRACEX REAL FORENSIC INVESTIGATION TEST")
    print("==================================================")

    # 1. GET /api/investigations/computers
    req = urllib.request.Request("http://127.0.0.1:8000/api/investigations/computers", headers=headers)
    with urllib.request.urlopen(req) as resp:
        comps = json.loads(resp.read().decode())
        print(f"\n[1] Discovered {len(comps)} Target Computers:")
        for c in comps:
            print(f"    - Host: {c['name']} (ID: {c['id']}) | Type: {c['collection_type']} | Status: {c['status']}")

    target_host = comps[0]["id"]

    # 2. POST /api/investigations/authorize
    auth_data = json.dumps({
        "computer_id": target_host,
        "case_id": "TRX-001",
        "collection_type": "live",
        "authorized": True
    }).encode()
    req = urllib.request.Request("http://127.0.0.1:8000/api/investigations/authorize", data=auth_data, headers=headers)
    with urllib.request.urlopen(req) as resp:
        auth_resp = json.loads(resp.read().decode())
        print(f"\n[2] Authorization Granted:")
        print(f"    - Auth ID: {auth_resp['authorization_id']}")
        print(f"    - Target: {auth_resp['computer_id']}")
        print(f"    - Mode: {auth_resp['collection_mode']} | Guarantee: {auth_resp['read_only_guarantee']}")

    # 3. POST /api/investigations/scan (Real live Windows scan!)
    scan_data = json.dumps({
        "computer_id": target_host,
        "case_id": "TRX-001",
        "collection_type": "live",
        "hours": 24,
        "scan_paths": ["agent_test_evidence"]
    }).encode()
    req = urllib.request.Request("http://127.0.0.1:8000/api/investigations/scan", data=scan_data, headers=headers)
    with urllib.request.urlopen(req) as resp:
        scan_resp = json.loads(resp.read().decode())
        print(f"\n[3] Forensic Scan Execution Complete:")
        print(f"    - Scan ID: {scan_resp['scan_id']}")
        print(f"    - Artifacts Ingested: {scan_resp['artifacts_collected']}")
        for s in scan_resp["stages"]:
            print(f"    - [Stage {s['id']}] {s['name']}: {s['status']} ({s['artifacts_count']} items) -> {s['description']}")

    # 4. GET /api/investigations/TRX-001/results
    req = urllib.request.Request("http://127.0.0.1:8000/api/investigations/TRX-001/results", headers=headers)
    with urllib.request.urlopen(req) as resp:
        results = json.loads(resp.read().decode())
        print(f"\n[4] Investigation Results & Forensic Correlation:")
        print(f"    - Summary: {results['summary']}")
        print(f"    - Suspicious Findings: {results['suspicious_events_count']}")
        print(f"    - USB Devices Identified: {results['usb_devices_count']}")
        print(f"    - Candidate Files Scanned: {results['files_accessed_count']}")
        print(f"    - Collection Type: {results['collection_type']}")
        
        print("\n    Correlated Findings Detail:")
        for idx, f in enumerate(results["findings"], 1):
            print(f"\n    Finding #{idx}: [{f['severity']}] {f['title']}")
            print(f"      Description: {f['description']}")
            print(f"      Why Flagged: {f['why_suspicious']}")
            meta = f.get("metadata", {})
            print(f"      File: {meta.get('file_name')} | SHA-256: {meta.get('sha256', 'N/A')[:16]}... | Status: {meta.get('integrity_status')}")
            print(f"      PDF Diff Available: {meta.get('pdf_diff_available')}")

    print("\n==================================================")
    print("SUCCESS: End-to-End Forensic Investigation Verified!")
    print("==================================================")

if __name__ == "__main__":
    run_test()
