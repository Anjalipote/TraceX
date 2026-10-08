"""
TraceX Forensic Collector - Main Entry Point
CLI tool for local and historical digital forensics on Windows hosts.
"""
import os
import sys
import json
import argparse
import logging
from datetime import datetime, timezone

# Ensure collector directory is on sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if getattr(sys, 'frozen', False):
    EXE_DIR = os.path.dirname(sys.executable)
else:
    EXE_DIR = BASE_DIR

if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from modules.system_info import collect_system_info, check_elevation
from modules.users import collect_users
from modules.files import collect_files_metadata
from modules.usn_journal import collect_usn_journal
from modules.windows_events import collect_windows_events
from modules.usb_history import collect_usb_history
from modules.processes import collect_processes
from modules.network import collect_network
from modules.uploader import package_evidence, upload_evidence

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("TraceXCollector")

VERSION = "1.0.0"


def load_config() -> dict:
    """Load default configuration from config/config.json if available."""
    config_path = os.path.join(EXE_DIR, "config", "config.json")
    if not os.path.isfile(config_path):
        config_path = os.path.join(BASE_DIR, "config", "config.json")
    if os.path.isfile(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Could not parse config.json: {e}")
    return {}


def print_banner(case_id: str, computer_id: str, target_path: str, backend_url: str, is_elevated: bool):
    """Display the forensic authorization banner."""
    print("=" * 72)
    print("               TRACEX DIGITAL FORENSIC COLLECTOR")
    print(f"                       Version {VERSION}")
    print("=" * 72)
    print(f" Investigation ID    : {case_id}")
    print(f" Target Computer     : {computer_id}")
    print(f" Target Path         : {target_path}")
    print(f" Backend Endpoint    : {backend_url}")
    print(f" Privilege Level     : {'ADMINISTRATOR (Elevated)' if is_elevated else 'STANDARD USER (Some logs limited)'}")
    print("=" * 72)
    print(" NOTICE:")
    print(" This program performs read-only collection of system forensic artifacts:")
    print(" - System specifications, user profiles, active sessions")
    print(" - Recursive file metadata, MACB timestamps, and SHA-256 hashes")
    print(" - NTFS USN Change Journal records (creation, modification, rename, deletion)")
    print(" - Windows Event Logs (PnP, System, Application, Security)")
    print(" - USB mass storage connection history (USBSTOR registry)")
    print(" - Running process topology and safe network sockets")
    print(" Integrity: All output artifacts are sealed with SHA-256 cryptographic hashes.")
    print("=" * 72)


def main():
    parser = argparse.ArgumentParser(description="TraceX Windows Forensic Collector")
    parser.add_argument("--case-id", dest="case_id", help="Investigation Case ID")
    parser.add_argument("--path", dest="target_path", help="Target directory to inspect (e.g., C:\\TraceX-Test)")
    parser.add_argument("--backend-url", dest="backend_url", help="TraceX backend URL (e.g., http://127.0.0.1:8000/api)")
    parser.add_argument("--output-dir", dest="output_dir", help="Directory to save evidence artifacts locally")
    parser.add_argument("--auto-confirm", dest="auto_confirm", action="store_true", help="Bypass interactive authorization prompt")
    parser.add_argument("--no-upload", dest="no_upload", action="store_true", help="Skip uploading to backend, save locally only")
    parser.add_argument("--verbose", dest="verbose", action="store_true", help="Enable verbose debug logging")

    args = parser.parse_args()

    if args.verbose:
        logger.setLevel(logging.DEBUG)

    cfg = load_config()

    case_id = args.case_id or cfg.get("case_id") or "INV-2026-LIVE"
    backend_url = args.backend_url or cfg.get("backend_url") or "http://127.0.0.1:8000/api"
    target_path = args.target_path or cfg.get("target_path") or "C:\\TraceX-Test"
    output_dir = args.output_dir or cfg.get("output_dir") or os.path.join(EXE_DIR, "evidence")
    timeout = cfg.get("timeout_sec", 60)

    is_elevated = check_elevation()

    # Pre-gather host name for banner
    try:
        import socket
        computer_id = socket.gethostname()
    except Exception:
        computer_id = "WINDOWS-HOST"

    print_banner(case_id, computer_id, target_path, backend_url, is_elevated)

    # Authorization Check
    if not args.auto_confirm:
        try:
            choice = input("\nDo you authorize this forensic collection on this computer? [Y/N]: ").strip().lower()
            if choice not in ("y", "yes"):
                print("\n[!] Collection aborted by user.")
                sys.exit(1)
        except (KeyboardInterrupt, EOFError):
            print("\n[!] Aborted.")
            sys.exit(1)

    print("\n[*] Initializing forensic acquisition pipeline...")
    start_time = datetime.now(timezone.utc)
    artifacts = {}

    # 1. System Info
    print("[1/8] Collecting System Specifications & OS Information...")
    sys_info = collect_system_info()
    artifacts["system"] = sys_info
    print(f"      Host: {sys_info.get('hostname')} | OS: {sys_info.get('windows_version')} Build {sys_info.get('windows_build')}")

    # 2. Users
    print("[2/8] Enumerating User Profiles & Active Sessions...")
    users_info = collect_users()
    artifacts["users"] = users_info
    print(f"      Active Sessions: {len(users_info.get('active_users', []))} | Profile Dirs: {len(users_info.get('profile_directories', []))}")

    # 3. File Forensics
    print(f"[3/8] Inspecting File System Target: '{target_path}'...")
    files_info = collect_files_metadata(target_path)
    artifacts["files"] = files_info
    print(f"      Files Analyzed: {files_info.get('total_files', 0)} ({files_info.get('total_bytes', 0):,} bytes)")

    # 4. NTFS USN Change Journal
    drive_letter = os.path.splitdrive(os.path.abspath(target_path))[0] or "C:"
    print(f"[4/8] Scanning NTFS USN Change Journal on volume {drive_letter}...")
    usn_info = collect_usn_journal(drive_letter=drive_letter, max_records=250)
    artifacts["usn_journal"] = usn_info
    print(f"      USN Events Recovered: {usn_info.get('total_events', 0)} ({usn_info.get('status')})")

    # 5. Windows Event Logs
    print("[5/8] Querying Windows Event Logs (PnP, System, Application, Security)...")
    events_info = collect_windows_events(max_events_per_channel=100)
    artifacts["windows_events"] = events_info
    print(f"      Event Log Records Collected: {events_info.get('total_events', 0)}")

    # 6. USB Storage History
    print("[6/8] Auditing USB Storage Devices from Registry (USBSTOR)...")
    usb_info = collect_usb_history()
    artifacts["usb"] = usb_info
    print(f"      USB Storage Devices Identified: {usb_info.get('total_devices', 0)}")

    # 7. Processes
    print("[7/8] Enumerating Active Process Topology...")
    proc_info = collect_processes()
    artifacts["processes"] = proc_info
    print(f"      Active Processes Tracked: {proc_info.get('collected_processes', 0)}")

    # 8. Network Sockets
    print("[8/8] Gathering Network Interfaces & Safe Active Sockets...")
    net_info = collect_network()
    artifacts["network"] = net_info
    print(f"      Interfaces: {len(net_info.get('interfaces', {}))} | Active Connections: {net_info.get('active_connections_count', 0)}")

    # Package Evidence
    print("\n[*] Packaging and Cryptographically Sealing Evidence...")
    manifest_path, manifest_data = package_evidence(
        output_dir=output_dir,
        case_id=case_id,
        computer_id=sys_info.get("hostname", computer_id),
        target_path=target_path,
        is_elevated=is_elevated,
        artifacts=artifacts,
        collector_version=VERSION
    )

    print(f"[+] Evidence artifacts saved to: {output_dir}")
    print(f"[+] Manifest path: {manifest_path}")
    print(f"[+] Master Evidence Seal (SHA-256): {manifest_data.get('overall_evidence_seal_sha256')}")

    # Upload Evidence
    if not args.no_upload:
        print(f"\n[*] Uploading evidence package to TraceX Backend ({backend_url})...")
        upload_res = upload_evidence(
            backend_url=backend_url,
            case_id=case_id,
            manifest_data=manifest_data,
            artifacts=artifacts,
            timeout_sec=timeout
        )

        if upload_res.get("success"):
            print(f"[+] SUCCESS: Forensic package ingested into TraceX backend successfully!")
            print(f"    Backend Response: {upload_res.get('data', {}).get('message', 'OK')}")
        else:
            print(f"[!] Upload Notice: Backend ingestion returned status {upload_res.get('status_code')}:")
            print(f"    Error: {upload_res.get('error')}")
            print(f"    The local evidence package remains intact at: {output_dir}")
            print(f"    You can ingest it manually or re-run when the backend is active.")
    else:
        print("\n[*] Skipping backend upload as requested (--no-upload).")

    duration = (datetime.now(timezone.utc) - start_time).total_seconds()
    print("=" * 72)
    print(f" COLLECTION COMPLETE in {duration:.2f} seconds")
    print(f" Master Seal: {manifest_data.get('overall_evidence_seal_sha256')}")
    print("=" * 72)


if __name__ == "__main__":
    main()
