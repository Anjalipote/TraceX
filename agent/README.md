# TraceX Windows Endpoint Collection Agent

The **TraceX Agent** is a lightweight, authorized digital forensics endpoint collector for Windows machines. It operates strictly on investigator-configured folders, records filesystem transactions in real-time, maintains a cryptographic baseline, and performs deep page-by-page text comparison for PDF artifacts.

---

## Capabilities

1. **Real-Time Filesystem Monitoring**:
   - Uses native Windows filesystem notification hooks (`watchdog.observers.Observer`).
   - Captures `created`, `modified`, `deleted`, and `renamed` events.
   - Built-in debounce mechanism and file-lock retry backoff to safely handle active processes (e.g. Acrobat Reader, Word, Notepad).

2. **Cryptographic Baseline & Tamper Detection**:
   - Computes bit-for-bit **SHA-256** digests on first discovery and caches baseline snapshots.
   - On subsequent modifications, calculates divergence from baseline and alerts the TraceX platform.

3. **PDF Page-by-Page Content & Text Extraction**:
   - When a baseline and modified PDF are detected, extracts text page-by-page using `pypdf`.
   - Uses `difflib` sequence matching to isolate the exact changed pages and line additions/deletions.
   - Highlights specific altered values (e.g., modified routing numbers, compensation fields, or intellectual property text).

4. **Secure Ingestion Pipeline**:
   - Periodically heartbeats to `http://127.0.0.1:8000/api/agent/heartbeat`.
   - Ingests events into TraceX Case records (`POST /api/agent/events`).
   - Automatically populates **Evidence**, **Timeline**, **Findings**, **Integrity**, and **Reports** modules.
   - Explicitly tags all live data as **`LIVE AGENT`** to distinguish from synthetic demo scenarios.

---

## Quick Start Guide

### 1. Requirements
Ensure Python 3.10+ is installed on the target Windows workstation with required dependencies:
```powershell
pip install watchdog pypdf
```

### 2. Configuration (`config.json`)
Configure your target folder in `config.json`:
```json
{
  "backend_url": "http://127.0.0.1:8000/api",
  "case_id": "CASE-2026-001",
  "monitored_paths": [
    "C:\\Users\\Employee01\\Documents\\Investigation_Vault"
  ],
  "heartbeat_interval_sec": 5,
  "agent_version": "v2.5.0-win64",
  "baseline_cache_dir": "./.tracex_baseline"
}
```

### 3. Launching the Agent
Start the agent monitor:
```powershell
python agent/tracex_agent.py start
```

Or specify a custom directory to watch:
```powershell
python agent/tracex_agent.py start --dir "C:\Users\Employee01\Documents\Investigation_Vault"
```

### 4. Running the Automated Verification Simulation
To verify the complete baseline capture and PDF text comparison workflow end-to-end:
```powershell
python agent/test_agent_workflow.py
```
This generates a test forensic PDF, captures the baseline, modifies lines on Page 1, computes the exact text diff, and transmits the telemetry to the TraceX backend.
