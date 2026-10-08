# TraceX Windows Forensic Collector

The **TraceX Windows Forensic Collector** is a standalone, local endpoint forensic acquisition utility for Microsoft Windows. It performs non-destructive, read-only collection of real system, file, NTFS USN Change Journal, Windows Event Log, and USB device artifacts from a target endpoint and securely transmits sealed evidence bundles to the TraceX Investigation Platform.

---

## Capabilities & Forensic Sources

1. **System Specifications & OS Information**
   - Hostname, OS edition, Windows build number, architecture, local timezone, boot time, memory, CPU specs, and privilege/token elevation status.

2. **User Profiles & Sessions**
   - Active interactive user sessions and local Windows user profile directory catalog (`C:\Users`).

3. **Target Directory File Forensics**
   - Recursive scan of investigator-designated path (e.g. `C:\TraceX-Test`).
   - File size, MACB timestamps (Creation, Last Modified, Last Accessed), file attributes (ReadOnly, Hidden, System, Archive).
   - Cryptographic **SHA-256** hash per file (with file lock retry logic).
   - Per-file NTFS USN (Update Sequence Number) via `fsutil usn readData`.

4. **NTFS USN Change Journal Scan**
   - Volume-level journal query (`fsutil usn queryjournal` / `readjournal csv`).
   - Parses historical changes: `FILE_CREATED`, `FILE_MODIFIED`, `FILE_RENAMED`, `FILE_DELETED`.
   - Records change reasons, file references, and journal timestamps.

5. **Windows Event Logs**
   - Native query via Windows `wevtutil` utility.
   - Channels: `Microsoft-Windows-Kernel-PnP/Configuration` (device discovery), `System`, `Application`, and `Security` (when elevated).

6. **USB Storage Device Audit**
   - Queries `HKLM\SYSTEM\CurrentControlSet\Enum\USBSTOR` registry keys.
   - Extracts device vendor, product model, serial number, and hardware instance IDs.

7. **Process Topology**
   - Active process PIDs, parent PIDs, process names, executable paths, command lines, and start times.

8. **Network Topography (Safe)**
   - Network adapters, IPv4/IPv6 addresses, MAC addresses, and active TCP/UDP socket tuples.
   - Strictly metadata only: does NOT inspect packet payloads, credentials, or session cookies.

---

## Directory Structure

```text
collector/
├── collector.py           # CLI entrypoint and orchestrator
├── requirements.txt       # Dependencies (psutil, pyinstaller)
├── README.md              # Documentation
├── config/
│   └── config.json        # Default endpoints and target settings
├── modules/
│   ├── hashing.py         # SHA-256 cryptographic hashing & streaming
│   ├── system_info.py     # System specs & elevation check
│   ├── users.py           # User profiles & active sessions
│   ├── files.py           # Recursive file MACB & per-file USN
│   ├── usn_journal.py     # NTFS USN Change Journal parser
│   ├── windows_events.py  # Windows Event Log extractor
│   ├── usb_history.py     # USBSTOR registry auditor
│   ├── processes.py       # Active process topology
│   ├── network.py         # Network adapters & active sockets
│   └── uploader.py        # Sealed packaging & backend uploader
└── evidence/              # Generated on execution (JSON artifacts & manifest)
```

---

## Usage

### 1. Run Directly with Python

```powershell
# Install dependencies
pip install -r collector/requirements.txt

# Run interactive collection (prompts for authorization)
python collector/collector.py

# Or pass specific parameters
python collector/collector.py --case-id INV-2026-LIVE --path C:\TraceX-Test --backend-url http://127.0.0.1:8000/api
```

### 2. Command Line Arguments

| Argument | Description | Default |
|---|---|---|
| `--case-id <ID>` | Investigation ID / Case ID | `INV-2026-LIVE` |
| `--path <DIR>` | Target directory to analyze | `C:\TraceX-Test` |
| `--backend-url <URL>` | TraceX Backend API URL | `http://127.0.0.1:8000/api` |
| `--output-dir <DIR>` | Directory to save evidence JSON files | `collector/evidence` |
| `--auto-confirm` | Non-interactive mode (skips `[Y/N]` prompt) | `False` |
| `--no-upload` | Generates local evidence artifacts without uploading | `False` |
| `--verbose` | Output detailed debug logs | `False` |

---

## Packaging into Standalone Windows Executable (`TraceXCollector.exe`)

You can compile the collector into a single standalone `.exe` that requires no Python installation:

```powershell
pyinstaller --onefile `
    --name TraceXCollector `
    --clean `
    --distpath collector/dist `
    --workpath collector/build `
    collector/collector.py
```

The resulting executable will be at `collector/dist/TraceXCollector.exe`.

---

## Privilege & Elevation Guidance

- **Standard User**: Collects system specifications, user profiles, file metadata, per-file USN data (`readData`), USBSTOR history, running processes, network connections, and unprivileged Windows Event Logs (PnP, System, Application).
- **Administrator (Elevated)**: Run in an elevated PowerShell/Command Prompt ("Run as Administrator") to enable volume-wide NTFS USN Journal streaming (`fsutil usn queryjournal` / `readjournal csv`) and the `Security` Event Log channel. If run without Administrator rights, the collector notes the permission boundary gracefully and continues acquiring all other available artifacts.
