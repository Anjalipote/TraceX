import os
import sys
import time
import json
import hashlib
import platform
import getpass
import argparse
import difflib
import threading
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import urllib.request
import urllib.error

# Watchdog for Windows Filesystem Monitoring
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# PDF Text Extraction
try:
    import pypdf
except ImportError:
    pypdf = None


class TraceXAgent:
    def __init__(self, config_path: str = "config.json"):
        # Resolve config path
        if not os.path.isabs(config_path):
            base_dir = os.path.dirname(os.path.abspath(__file__))
            config_path = os.path.join(base_dir, config_path)
            
        self.config_path = config_path
        self.config = self.load_config()
        
        self.backend_url = self.config.get("backend_url", "http://127.0.0.1:8000/api")
        self.case_id = self.config.get("case_id", "CASE-2026-001")
        self.monitored_paths = self.config.get("monitored_paths", ["./monitored_evidence"])
        self.heartbeat_interval = self.config.get("heartbeat_interval_sec", 5)
        self.agent_version = self.config.get("agent_version", "v2.5.0-win64")
        
        # Local baseline cache
        baseline_dir = self.config.get("baseline_cache_dir", "./.tracex_baseline")
        if not os.path.isabs(baseline_dir):
            baseline_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), baseline_dir)
        self.baseline_dir = baseline_dir
        os.makedirs(self.baseline_dir, exist_ok=True)
        self.baseline_file = os.path.join(self.baseline_dir, "baseline_manifest.json")
        self.baseline_manifest = self.load_baseline_manifest()
        
        # Host metadata
        self.hostname = platform.node() or "WINDOWS-ENDPOINT"
        self.os_info = f"{platform.system()} {platform.release()} ({platform.version()})"
        self.user = getpass.getuser()
        
        self.is_running = False
        self.event_queue: List[Dict[str, Any]] = []
        self.lock = threading.Lock()
        self.total_events_sent = 0

    def load_config(self) -> Dict[str, Any]:
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[Agent Warning] Failed to read {self.config_path}: {e}. Using defaults.")
        return {}

    def load_baseline_manifest(self) -> Dict[str, Any]:
        if os.path.exists(self.baseline_file):
            try:
                with open(self.baseline_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

    def save_baseline_manifest(self):
        try:
            with open(self.baseline_file, "w", encoding="utf-8") as f:
                json.dump(self.baseline_manifest, f, indent=2)
        except Exception as e:
            print(f"[Agent Warning] Failed to persist baseline manifest: {e}")

    def calculate_file_hash(self, file_path: str, max_retries: int = 5) -> Optional[str]:
        """
        Calculates SHA-256 hash of a file with retry backoff to handle Windows file locks.
        """
        if not os.path.isfile(file_path):
            return None
        
        for attempt in range(max_retries):
            try:
                sha256 = hashlib.sha256()
                with open(file_path, "rb") as f:
                    for chunk in iter(lambda: f.read(65536), b""):
                        sha256.update(chunk)
                return sha256.hexdigest()
            except (PermissionError, IOError):
                time.sleep(0.15 * (attempt + 1))
        return None

    def extract_pdf_pages_text(self, pdf_path: str) -> List[str]:
        """
        Extracts text page by page from a PDF file using pypdf.
        """
        if not pypdf or not os.path.exists(pdf_path):
            return []
        pages_text: List[str] = []
        try:
            reader = pypdf.PdfReader(pdf_path)
            for page in reader.pages:
                text = page.extract_text() or ""
                pages_text.append(text)
        except Exception as e:
            print(f"[Agent Warning] Error extracting text from {pdf_path}: {e}")
        return pages_text

    def compare_pdf_content(self, baseline_pdf_path: str, modified_pdf_path: str) -> Dict[str, Any]:
        """
        Compares baseline and modified PDF files page by page using difflib.
        """
        base_pages = self.extract_pdf_pages_text(baseline_pdf_path)
        mod_pages = self.extract_pdf_pages_text(modified_pdf_path)
        
        max_pages = max(len(base_pages), len(mod_pages))
        changed_pages: List[int] = []
        pages_diff: List[Dict[str, Any]] = []
        total_additions = 0
        total_deletions = 0
        
        for i in range(max_pages):
            page_num = i + 1
            b_text = base_pages[i] if i < len(base_pages) else ""
            m_text = mod_pages[i] if i < len(mod_pages) else ""
            
            b_lines = [l.strip() for l in b_text.splitlines() if l.strip()]
            m_lines = [l.strip() for l in m_text.splitlines() if l.strip()]
            
            matcher = difflib.SequenceMatcher(None, b_lines, m_lines)
            diff_lines: List[Dict[str, Any]] = []
            added: List[str] = []
            removed: List[str] = []
            
            for tag, i1, i2, j1, j2 in matcher.get_opcodes():
                if tag == 'equal':
                    for line in b_lines[i1:i2]:
                        diff_lines.append({"type": "unchanged", "text": line})
                elif tag == 'replace':
                    for line in b_lines[i1:i2]:
                        diff_lines.append({"type": "removed", "text": line})
                        removed.append(line)
                        total_deletions += 1
                    for line in m_lines[j1:j2]:
                        diff_lines.append({"type": "added", "text": line})
                        added.append(line)
                        total_additions += 1
                elif tag == 'delete':
                    for line in b_lines[i1:i2]:
                        diff_lines.append({"type": "removed", "text": line})
                        removed.append(line)
                        total_deletions += 1
                elif tag == 'insert':
                    for line in m_lines[j1:j2]:
                        diff_lines.append({"type": "added", "text": line})
                        added.append(line)
                        total_additions += 1
                        
            page_has_changes = len(added) > 0 or len(removed) > 0 or (b_text != m_text)
            if page_has_changes:
                changed_pages.append(page_num)
                
            pages_diff.append({
                "page_number": page_num,
                "has_changes": page_has_changes,
                "baseline_text": b_text,
                "modified_text": m_text,
                "added_lines": added,
                "removed_lines": removed,
                "diff_lines": diff_lines
            })
            
        has_overall_changes = len(changed_pages) > 0 or (len(base_pages) != len(mod_pages))
        summary = (
            f"Altered {len(changed_pages)} of {max_pages} pages ({total_additions} additions, {total_deletions} deletions)"
            if has_overall_changes else "Content matches baseline."
        )
        
        return {
            "has_changes": has_overall_changes,
            "total_pages_baseline": len(base_pages),
            "total_pages_modified": len(mod_pages),
            "changed_pages": changed_pages,
            "total_additions": total_additions,
            "total_deletions": total_deletions,
            "pages": pages_diff,
            "summary": summary
        }

    def process_file_event(self, event_type: str, file_path: str, original_path: Optional[str] = None):
        """
        Normalizes a filesystem event, calculates hashes, checks baseline,
        and generates the event payload.
        """
        norm_path = os.path.abspath(file_path)
        file_name = os.path.basename(norm_path)
        
        # Ignore agent baseline directory itself to prevent feedback loop
        if ".tracex_baseline" in norm_path or "baseline_manifest" in file_name:
            return
            
        ext = os.path.splitext(file_name)[1].lower()
        is_pdf = ext == ".pdf"
        file_size = 0
        sha256 = ""
        
        if event_type != "deleted" and os.path.exists(norm_path):
            try:
                file_size = os.path.getsize(norm_path)
            except Exception:
                pass
            sha256 = self.calculate_file_hash(norm_path) or ""
            
        now_iso = datetime.now(timezone.utc).isoformat()
        
        # Baseline tracking
        baseline_info = self.baseline_manifest.get(norm_path)
        baseline_sha256 = baseline_info.get("sha256") if baseline_info else None
        is_modified_from_baseline = False
        pdf_diff = None
        
        cached_baseline_copy = os.path.join(self.baseline_dir, f"base_{file_name}")
        
        if event_type == "created":
            if not baseline_info and sha256:
                # Capture baseline
                self.baseline_manifest[norm_path] = {
                    "file_name": file_name,
                    "sha256": sha256,
                    "first_seen": now_iso,
                    "cached_copy": cached_baseline_copy
                }
                self.save_baseline_manifest()
                baseline_sha256 = sha256
                # Save snapshot copy for diffing
                try:
                    with open(norm_path, "rb") as src, open(cached_baseline_copy, "wb") as dst:
                        dst.write(src.read())
                except Exception:
                    pass
                    
        elif event_type == "modified":
            if baseline_sha256 and sha256 and sha256 != baseline_sha256:
                is_modified_from_baseline = True
                
                # If PDF, perform deep content diffing against baseline copy
                if is_pdf and os.path.exists(cached_baseline_copy):
                    pdf_diff = self.compare_pdf_content(cached_baseline_copy, norm_path)
            elif not baseline_info and sha256:
                # Discovered existing file modified
                self.baseline_manifest[norm_path] = {
                    "file_name": file_name,
                    "sha256": sha256,
                    "first_seen": now_iso,
                    "cached_copy": cached_baseline_copy
                }
                self.save_baseline_manifest()
                baseline_sha256 = sha256
                try:
                    with open(norm_path, "rb") as src, open(cached_baseline_copy, "wb") as dst:
                        dst.write(src.read())
                except Exception:
                    pass
                    
        elif event_type == "deleted":
            if baseline_info:
                baseline_sha256 = baseline_info.get("sha256")
                is_modified_from_baseline = True

        event_payload = {
            "event_type": event_type,
            "file_path": norm_path,
            "original_path": os.path.abspath(original_path) if original_path else None,
            "file_name": file_name,
            "file_size": file_size,
            "file_extension": ext,
            "sha256_hash": sha256,
            "baseline_sha256": baseline_sha256,
            "is_modified_from_baseline": is_modified_from_baseline,
            "timestamp": now_iso,
            "user": self.user,
            "hostname": self.hostname,
            "case_id": self.case_id,
            "is_pdf": is_pdf,
            "pdf_diff": pdf_diff
        }

        print(f"[TraceX Agent] Event: {event_type.upper():<8} | File: {file_name} | SHA-256: {sha256[:12] if sha256 else 'N/A'}")
        if is_modified_from_baseline:
            print(f"  [!] BASELINE DIVERGENCE DETECTED on {file_name}")
            if is_pdf and pdf_diff:
                print(f"  [PDF DIFF] Changed Pages: {pdf_diff.get('changed_pages')} | {pdf_diff.get('summary')}")

        with self.lock:
            self.event_queue.append(event_payload)

    def send_http_request(self, endpoint: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Sends an HTTP POST request to the TraceX backend.
        """
        url = f"{self.backend_url.rstrip('/')}/{endpoint.lstrip('/')}"
        json_data = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=json_data,
            headers={"Content-Type": "application/json", "Accept": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status in [200, 201, 202]:
                    return json.loads(response.read().decode("utf-8"))
        except urllib.error.URLError as e:
            return None
        except Exception:
            return None
        return None

    def register(self) -> bool:
        """
        Registers this agent endpoint with TraceX backend.
        """
        data = {
            "hostname": self.hostname,
            "ip_address": "127.0.0.1",
            "os_info": self.os_info,
            "current_user": self.user,
            "agent_version": self.agent_version,
            "monitored_paths": self.monitored_paths
        }
        res = self.send_http_request("/agent/register", data)
        if res and res.get("success"):
            print(f"[TraceX Agent] Connected to TraceX Backend: {self.backend_url}")
            print(f"  Host: {self.hostname} | User: {self.user} | OS: {self.os_info}")
            return True
        else:
            print(f"[TraceX Agent] Backend registration at {self.backend_url} was not acknowledged (Backend offline or starting up).")
            return False

    def heartbeat_worker(self):
        """
        Background heartbeat thread to maintain online status.
        """
        while self.is_running:
            self.send_http_request("/agent/heartbeat", {
                "hostname": self.hostname,
                "monitored_paths": self.monitored_paths,
                "events_count": self.total_events_sent
            })
            time.sleep(self.heartbeat_interval)

    def flush_events_worker(self):
        """
        Background flusher thread to securely transmit queued events to backend.
        """
        while self.is_running:
            events_to_send = []
            with self.lock:
                if self.event_queue:
                    events_to_send = list(self.event_queue)
                    self.event_queue.clear()

            if events_to_send:
                payload = {
                    "hostname": self.hostname,
                    "agent_version": self.agent_version,
                    "case_id": self.case_id,
                    "events": events_to_send
                }
                res = self.send_http_request("/agent/events", payload)
                if res and res.get("success"):
                    self.total_events_sent += len(events_to_send)
                    print(f"[TraceX Agent] Ingested {len(events_to_send)} events into Case {self.case_id}.")
                else:
                    # Put events back on queue if transmission failed
                    with self.lock:
                        self.event_queue = events_to_send + self.event_queue

            time.sleep(1.0)

    def start(self):
        """
        Starts filesystem observer on all configured monitored paths.
        """
        self.is_running = True
        self.register()

        # Start background threads
        hb_thread = threading.Thread(target=self.heartbeat_worker, daemon=True)
        hb_thread.start()

        flush_thread = threading.Thread(target=self.flush_events_worker, daemon=True)
        flush_thread.start()

        # Initialize filesystem observer
        observer = Observer()
        handler = AgentEventHandler(self)

        for path in self.monitored_paths:
            abs_p = os.path.abspath(path)
            os.makedirs(abs_p, exist_ok=True)
            observer.schedule(handler, abs_p, recursive=True)
            print(f"[TraceX Agent] Monitoring directory: {abs_p}")

        observer.start()
        print("[TraceX Agent] FileSystemWatcher active. Recording create/modify/delete/rename events...")

        try:
            while self.is_running:
                time.sleep(0.5)
        except KeyboardInterrupt:
            print("\n[TraceX Agent] Stopping agent...")
            self.is_running = False
            observer.stop()
        observer.join()

    def is_admin(self) -> bool:
        """Determines whether current execution has Administrator elevation."""
        try:
            import ctypes
            return ctypes.windll.shell32.IsUserAnAdmin() != 0
        except Exception:
            return False

    def collect_usb_history(self) -> Dict[str, Any]:
        """Reads historical USB removable storage artifacts from HKLM\\...\\USBSTOR."""
        if platform.system() != "Windows":
            return {"status": "unavailable", "reason": "USBSTOR registry is Windows-specific.", "devices": []}
        devices = []
        try:
            import winreg
            base_key_path = r"SYSTEM\CurrentControlSet\Enum\USBSTOR"
            try:
                usbstor_key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, base_key_path)
            except FileNotFoundError:
                return {"status": "available", "reason": "No USBSTOR key found.", "devices": []}

            num_subkeys = winreg.QueryInfoKey(usbstor_key)[0]
            for i in range(num_subkeys):
                device_type = winreg.EnumKey(usbstor_key, i)
                dev_key = winreg.OpenKey(usbstor_key, device_type)
                num_instances = winreg.QueryInfoKey(dev_key)[0]
                for j in range(num_instances):
                    instance_id = winreg.EnumKey(dev_key, j)
                    inst_key = winreg.OpenKey(dev_key, instance_id)
                    values = {}
                    num_values = winreg.QueryInfoKey(inst_key)[1]
                    for k in range(num_values):
                        v_name, v_data, _ = winreg.EnumValue(inst_key, k)
                        values[v_name] = v_data
                    friendly_name = values.get("FriendlyName", values.get("DeviceDesc", device_type))
                    hardware_id = values.get("HardwareID", [])
                    if isinstance(hardware_id, list):
                        hardware_id = hardware_id[0] if hardware_id else "N/A"
                    devices.append({
                        "device_type": device_type,
                        "serial_number": instance_id,
                        "friendly_name": friendly_name,
                        "hardware_id": hardware_id,
                        "registry_path": f"HKLM\\{base_key_path}\\{device_type}\\{instance_id}"
                    })
                    winreg.CloseKey(inst_key)
                winreg.CloseKey(dev_key)
            winreg.CloseKey(usbstor_key)
            return {"status": "available", "count": len(devices), "devices": devices}
        except Exception as e:
            return {"status": "error", "reason": f"Failed reading USBSTOR: {str(e)}", "devices": []}

    def read_file_usn_data(self, file_path: str) -> Optional[Dict[str, Any]]:
        """
        Reads per-file USN metadata using 'fsutil usn readData'.
        Succeeds under standard user permissions without administrator elevation.
        """
        if platform.system() != "Windows" or not os.path.isfile(file_path):
            return None
        import subprocess
        try:
            res = subprocess.run(
                ["fsutil", "usn", "readData", file_path],
                capture_output=True,
                text=True,
                timeout=5
            )
            if res.returncode == 0:
                data: Dict[str, str] = {}
                for line in res.stdout.splitlines():
                    if ":" in line:
                        k, v = line.split(":", 1)
                        data[k.strip().replace("#", "").replace(" ", "_").lower()] = v.strip()
                return {
                    "major_version": data.get("major_version"),
                    "file_ref": data.get("fileref"),
                    "parent_file_ref": data.get("parent_fileref"),
                    "usn": data.get("usn"),
                    "reason": data.get("reason"),
                    "file_attributes": data.get("file_attributes"),
                    "file_name": data.get("filename") or os.path.basename(file_path)
                }
        except Exception:
            pass
        return None

    def collect_usn_journal(self, volume: str = "C:") -> Dict[str, Any]:
        """
        Inspects NTFS USN Change Journal, cleanly handling elevation limitations.
        When elevated, parses CSV records (created, modified, deleted, renamed, reason, file reference).
        """
        if platform.system() != "Windows":
            return {
                "status": "unavailable",
                "reason": "Historical record unavailable: NTFS USN Journal is Windows-specific.",
                "records": []
            }
        import subprocess
        try:
            res = subprocess.run(["fsutil", "usn", "queryjournal", volume], capture_output=True, text=True, timeout=5)
            if res.returncode != 0:
                return {
                    "status": "unavailable",
                    "reason": f"Historical record unavailable: USN query failed ({res.stderr.strip() or 'Volume may not be NTFS'}).",
                    "records": []
                }
            
            journal_output = res.stdout
            journal_metadata = {}
            for line in journal_output.splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    journal_metadata[k.strip().replace(" ", "_").lower()] = v.strip()

            if not self.is_admin():
                return {
                    "status": "unavailable",
                    "reason": "Historical record unavailable: Reading raw NTFS USN Journal records requires Windows Administrator elevation (Error 5: Access is denied). Running under standard user privileges.",
                    "journal_metadata": journal_metadata,
                    "records_count": 0,
                    "records": []
                }
            
            read_res = subprocess.run(["fsutil", "usn", "readjournal", volume, "csv"], capture_output=True, text=True, timeout=10)
            if read_res.returncode == 0:
                records = []
                lines = [l.strip() for l in read_res.stdout.splitlines() if l.strip()]
                for line in lines:
                    parts = [p.strip() for p in line.split(",")]
                    if len(parts) >= 6 and not parts[0].lower().startswith("usn"):
                        usn_val = parts[0]
                        file_ref = parts[1]
                        parent_ref = parts[2]
                        reason_code = parts[3]
                        reason_name = parts[4] if len(parts) > 4 else ""
                        ts = parts[5] if len(parts) > 5 else ""
                        fname = parts[-1] if len(parts) > 6 else ""

                        r_upper = reason_name.upper()
                        evt_type = "FILE_MODIFIED"
                        if "CREATE" in r_upper:
                            evt_type = "FILE_CREATED"
                        elif "DELETE" in r_upper:
                            evt_type = "FILE_DELETED"
                        elif "RENAME" in r_upper:
                            evt_type = "FILE_RENAMED"

                        records.append({
                            "usn": usn_val,
                            "file_ref": file_ref,
                            "parent_file_ref": parent_ref,
                            "reason_code": reason_code,
                            "change_reason": reason_name or "DATA_MODIFIED",
                            "timestamp": ts,
                            "file_name": fname,
                            "volume": volume,
                            "event_type": evt_type,
                            "source": "NTFS USN Change Journal"
                        })

                return {
                    "status": "available",
                    "records_count": len(records),
                    "records": records[:100],
                    "journal_metadata": journal_metadata
                }
            else:
                return {
                    "status": "unavailable",
                    "reason": f"Historical record unavailable: Reading USN stream failed ({read_res.stderr.strip()}).",
                    "records": []
                }
        except Exception as e:
            return {"status": "unavailable", "reason": f"Historical record unavailable: fsutil error ({str(e)}).", "records": []}

    def collect_event_logs(self, hours: int = 24) -> Dict[str, Any]:
        """Queries Windows System, Kernel-PnP, and Security logs via wevtutil."""
        if platform.system() != "Windows":
            return {"status": "unavailable", "reason": "Historical record unavailable: Windows Event Log is Windows-specific.", "events": []}
        import subprocess
        events = []
        status_info = {"pnp_log": "available", "system_log": "available", "security_log": "unknown"}

        # 1. Kernel-PnP Logs (Device Configured / Started / Deleted)
        try:
            pnp_res = subprocess.run(["wevtutil", "qe", "Microsoft-Windows-Kernel-PnP/Configuration", "/c:30", "/rd:true", "/f:text"], capture_output=True, text=True, timeout=10)
            if pnp_res.returncode == 0:
                raw_events = pnp_res.stdout.split("Event[")
                for raw in raw_events:
                    if not raw.strip():
                        continue
                    event_dict = {}
                    desc_lines = []
                    in_desc = False
                    for line in raw.splitlines():
                        if in_desc:
                            desc_lines.append(line.strip())
                        elif line.strip().startswith("Description:"):
                            in_desc = True
                            desc_lines.append(line.replace("Description:", "").strip())
                        elif ":" in line:
                            k, v = line.split(":", 1)
                            event_dict[k.strip()] = v.strip()
                    
                    eid = event_dict.get("Event ID", "")
                    if eid in ["400", "410", "420", "430"]:
                        action_name = "Device Configured" if eid == "400" else "Device Started" if eid == "410" else "Device Deleted" if eid == "420" else "Device PnP Event"
                        events.append({
                            "log": "Kernel-PnP",
                            "event_id": eid,
                            "source": "Windows Event Log (Kernel-PnP)",
                            "timestamp": event_dict.get("Date", ""),
                            "user": event_dict.get("User Name", "SYSTEM"),
                            "action": action_name,
                            "description": f"{action_name}: {' '.join(desc_lines)[:250]}"
                        })
        except Exception:
            pass

        # 2. System Log
        try:
            res = subprocess.run(["wevtutil", "qe", "System", "/c:30", "/rd:true", "/f:text"], capture_output=True, text=True, timeout=10)
            if res.returncode == 0:
                raw_events = res.stdout.split("Event[")
                for raw in raw_events:
                    if not raw.strip():
                        continue
                    event_dict = {}
                    for line in raw.splitlines():
                        if ":" in line:
                            k, v = line.split(":", 1)
                            event_dict[k.strip()] = v.strip()
                    if "Date" in event_dict or "Event ID" in event_dict:
                        events.append({
                            "log": "System",
                            "event_id": event_dict.get("Event ID", "N/A"),
                            "source": f"Windows Event Log (System - {event_dict.get('Source', 'System')})",
                            "timestamp": event_dict.get("Date", ""),
                            "user": event_dict.get("User Name", "SYSTEM"),
                            "action": "System Event",
                            "description": event_dict.get("Description", "")[:200]
                        })
        except Exception:
            pass

        # 3. Security Log
        try:
            sec_res = subprocess.run(["wevtutil", "qe", "Security", "/c:15", "/rd:true", "/f:text"], capture_output=True, text=True, timeout=10)
            if sec_res.returncode == 0 and sec_res.stdout.strip():
                status_info["security_log"] = "available"
            else:
                status_info["security_log"] = "Historical record unavailable: Windows Security Event Log requires Administrator elevation or Object Access Auditing policy enabled."
        except Exception:
            status_info["security_log"] = "Historical record unavailable"

        return {
            "status": "available" if events else "unavailable",
            "events_count": len(events),
            "events": events,
            "channel_status": status_info
        }

    def discover_candidate_files(self, search_paths: List[str], hours: int = 24, extensions: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Discovers candidate files modified/accessed within time window without requiring pre-known filenames."""
        cutoff_time = time.time() - (hours * 3600)
        candidates = []
        ext_lower = [e.lower() for e in extensions] if extensions else None

        for sp in search_paths:
            abs_sp = os.path.abspath(sp)
            if not os.path.exists(abs_sp):
                continue
            for root, _, files in os.walk(abs_sp):
                if any(ignored in root for ignored in [".git", "node_modules", ".tracex_baseline", "__pycache__"]):
                    continue
                for file in files:
                    full_p = os.path.join(root, file)
                    ext = os.path.splitext(file)[1].lower()
                    if ext_lower and ext not in ext_lower:
                        continue
                    try:
                        stat = os.stat(full_p)
                    except Exception:
                        continue
                    is_within = (stat.st_mtime >= cutoff_time) or (stat.st_ctime >= cutoff_time)
                    b_info = self.baseline_manifest.get(full_p)
                    b_sha = b_info.get("sha256") if b_info else None
                    sha256 = None
                    is_diverged = False
                    pdf_diff = None

                    if b_sha:
                        sha256 = self.calculate_file_hash(full_p)
                        if sha256 and sha256 != b_sha:
                            is_diverged = True
                            is_within = True
                            if ext == ".pdf":
                                cached = os.path.join(self.baseline_dir, f"base_{file}")
                                if os.path.exists(cached):
                                    pdf_diff = self.compare_pdf_content(cached, full_p)

                    if not is_within:
                        continue

                    if not sha256:
                        sha256 = self.calculate_file_hash(full_p)

                    mtime_dt = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
                    ctime_dt = datetime.fromtimestamp(stat.st_ctime, tz=timezone.utc).isoformat()
                    atime_dt = datetime.fromtimestamp(stat.st_atime, tz=timezone.utc).isoformat()
                    usn_meta = self.read_file_usn_data(full_p)

                    candidates.append({
                        "file_name": file,
                        "file_path": full_p,
                        "file_size": stat.st_size,
                        "extension": ext,
                        "sha256": sha256,
                        "baseline_sha256": b_sha,
                        "is_baseline_diverged": is_diverged,
                        "mtime": mtime_dt,
                        "ctime": ctime_dt,
                        "atime": atime_dt,
                        "usn_data": usn_meta,
                        "source": "NTFS File Metadata Scan",
                        "pdf_diff": pdf_diff
                    })

        candidates.sort(key=lambda x: x.get("mtime", ""), reverse=True)
        return candidates

    def run_historical_collection(self, hours: int = 24, case_id: Optional[str] = None) -> Dict[str, Any]:
        """Runs full historical artifact collection and transmits normalized events to backend."""
        cid = case_id or self.case_id
        print(f"[TraceX Agent] Running Historical Forensic Collection for Case: {cid} (Window: {hours}h)")
        self.register()

        # 1. Candidate Files
        print("  -> Scanning candidate files...")
        candidate_files = self.discover_candidate_files(self.monitored_paths, hours=hours)
        print(f"     Discovered {len(candidate_files)} candidate files.")

        # 2. USB Registry
        print("  -> Querying USBSTOR registry...")
        usb_result = self.collect_usb_history()
        print(f"     Found {len(usb_result.get('devices', []))} historical USB storage devices.")

        # 3. Event Logs
        print("  -> Querying Windows event logs...")
        event_result = self.collect_event_logs(hours=hours)
        print(f"     Collected {event_result.get('events_count', 0)} system event records.")

        # 4. USN Journal
        print("  -> Inspecting NTFS USN Change Journal...")
        usn_result = self.collect_usn_journal()
        if usn_result.get("status") == "unavailable":
            print(f"     [Note] {usn_result.get('reason')}")
        else:
            print(f"     Retrieved {usn_result.get('records_count', 0)} USN records.")

        # Build Normalized Events
        events_to_send = []
        now_dt = datetime.now(timezone.utc).isoformat()

        for cf in candidate_files:
            events_to_send.append({
                "timestamp": cf.get("mtime") or now_dt,
                "event_type": "FILE_MODIFIED" if cf.get("is_baseline_diverged") else "FILE_ACCESSED",
                "category": "File System",
                "severity": "High" if cf.get("is_baseline_diverged") else "Low",
                "computer_id": self.hostname,
                "user": self.user,
                "file_name": cf["file_name"],
                "file_path": cf["file_path"],
                "file_size": cf["file_size"],
                "sha256_hash": cf["sha256"],
                "baseline_sha256": cf.get("baseline_sha256"),
                "source": "NTFS Metadata Scan",
                "details": {
                    "mtime": cf.get("mtime"),
                    "ctime": cf.get("ctime"),
                    "diff_data": json.dumps(cf.get("pdf_diff")) if cf.get("pdf_diff") else None
                }
            })

        for u in usb_result.get("devices", []):
            events_to_send.append({
                "timestamp": now_dt,
                "event_type": "USB_CONNECTED",
                "category": "USB / Removable Storage",
                "severity": "Medium",
                "computer_id": self.hostname,
                "user": self.user,
                "device_name": u.get("friendly_name"),
                "device_serial": u.get("serial_number"),
                "source": "HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR",
                "details": u
            })

        for el in event_result.get("events", [])[:15]:
            events_to_send.append({
                "timestamp": now_dt,
                "event_type": "SYSTEM_EVENT",
                "category": "System Log",
                "severity": "Low",
                "computer_id": self.hostname,
                "user": el.get("user", "SYSTEM"),
                "source": f"Event ID {el.get('event_id')}",
                "details": el
            })

        # 4. Ingest USN journal records if present
        for rec in usn_result.get("records", [])[:30]:
            events_to_send.append({
                "timestamp": rec.get("timestamp") or now_dt,
                "event_type": rec.get("event_type", "FILE_MODIFIED"),
                "category": "File System",
                "severity": "High" if "DELETE" in rec.get("event_type", "") or "RENAME" in rec.get("event_type", "") else "Medium",
                "computer_id": self.hostname,
                "user": self.user,
                "file_name": rec.get("file_name", "Unknown"),
                "file_path": f"{rec.get('volume', 'C:')}\\{rec.get('file_name', 'Unknown')}",
                "source": "NTFS USN Change Journal",
                "details": rec
            })

        # Send to Backend
        if events_to_send:
            print(f"  -> Transmitting {len(events_to_send)} normalized forensic events to TraceX API...")
            res = self.send_http_request(f"/investigations/{cid}/events", events_to_send)
            if res and res.get("success"):
                print(f"     Successfully ingested {len(events_to_send)} events into backend.")
            else:
                print("     [Warning] Failed to transmit events to backend.")

            print("  -> Triggering TraceX Correlation Engine...")
            corr = self.send_http_request(f"/investigations/{cid}/correlate", {})
            if corr:
                print(f"     Correlation Complete: {corr.get('findings_generated', 0)} Findings, {corr.get('timeline_entries_generated', 0)} Timeline Events created.")

        return {
            "candidate_files": candidate_files,
            "usb_devices": usb_result.get("devices", []),
            "usn_journal": usn_result,
            "event_logs": event_result
        }


    def inspect_target_file(self, target_path: str, case_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Performs targeted forensic inspection on an original Windows file.
        Collects on-disk metadata, SHA-256 hash, USN file reference, event logs, and USB activity.
        Transmits inspected file directly to TraceX backend.
        """
        cid = case_id or self.case_id
        abs_path = os.path.abspath(target_path)
        print(f"\n[TraceX Agent] Target File Forensic Inspection: {abs_path}")
        print("=" * 70)

        if not os.path.exists(abs_path):
            print(f"[Error] Target file does not exist on disk: {abs_path}")
            return {"error": "File not found", "path": abs_path}

        # 1. Physical metadata & Hash
        stat = os.stat(abs_path)
        size_bytes = stat.st_size
        ctime = datetime.fromtimestamp(stat.st_ctime, tz=timezone.utc).isoformat()
        mtime = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
        atime = datetime.fromtimestamp(stat.st_atime, tz=timezone.utc).isoformat()
        sha256_hash = self.calculate_file_hash(abs_path) or "Unavailable"

        print(f"  • Absolute Path: {abs_path}")
        print(f"  • File Size:     {size_bytes:,} bytes")
        print(f"  • SHA-256 Digest:{sha256_hash}")
        print(f"  • Created Time:  {ctime}")
        print(f"  • Modified Time: {mtime}")
        print(f"  • Accessed Time: {atime}")

        # 2. Per-file USN Journal FileRef
        usn_data = self.read_file_usn_data(abs_path)
        usn_fileref = usn_data.get("file_ref", "Unavailable") if usn_data else "Unavailable"
        print(f"  • USN File Ref:  {usn_fileref}")

        # 3. Baseline comparison
        baseline_record = self.baseline_manifest.get(abs_path)
        baseline_sha = baseline_record.get("sha256") if baseline_record else None
        is_diverged = bool(baseline_sha and baseline_sha != sha256_hash)
        if baseline_sha:
            print(f"  • Baseline Hash: {baseline_sha}")
            print(f"  • Divergence:    {'DIVERGED (Altered)' if is_diverged else 'MATCHING (Intact)'}")
        else:
            print("  • Baseline Hash: Unavailable (Initial observation)")

        # 4. Notify Backend / Select-File API
        payload = {
            "computer_id": self.hostname,
            "case_id": cid,
            "file_path": abs_path
        }
        res = self.send_http_request(f"/investigations/{cid}/select-file", payload)
        if res:
            print(f"  ✓ Associated with TraceX Case {cid}: File verified.")
        else:
            print("  [Warning] Backend select-file endpoint returned no response.")

        # 5. Run Targeted Historical Scan
        print("\n[TraceX Agent] Running targeted historical forensic correlation...")
        scan_payload = {
            "computer_id": self.hostname,
            "case_id": cid,
            "target_file_path": abs_path,
            "investigation_mode": "historical",
            "collection_type": "live",
            "hours": 24
        }
        scan_res = self.send_http_request("/investigations/scan", scan_payload)
        if scan_res:
            print(f"  ✓ Historical Scan Completed: {scan_res.get('artifacts_collected', 0)} artifacts collected.")
            print(f"    Scan ID: {scan_res.get('scan_id')}")

        return {
            "path": abs_path,
            "size": size_bytes,
            "sha256": sha256_hash,
            "ctime": ctime,
            "mtime": mtime,
            "atime": atime,
            "usn_fileref": usn_fileref,
            "is_diverged": is_diverged
        }


class AgentEventHandler(FileSystemEventHandler):
    def __init__(self, agent: TraceXAgent):
        super().__init__()
        self.agent = agent
        self.debounce_cache: Dict[str, float] = {}

    def is_debounced(self, path: str, threshold: float = 0.5) -> bool:
        now = time.time()
        last = self.debounce_cache.get(path, 0)
        if now - last < threshold:
            return True
        self.debounce_cache[path] = now
        return False

    def on_created(self, event):
        if event.is_directory or self.is_debounced(event.src_path):
            return
        self.agent.process_file_event("created", event.src_path)

    def on_modified(self, event):
        if event.is_directory or self.is_debounced(event.src_path):
            return
        self.agent.process_file_event("modified", event.src_path)

    def on_deleted(self, event):
        if event.is_directory:
            return
        self.agent.process_file_event("deleted", event.src_path)

    def on_moved(self, event):
        if event.is_directory:
            return
        self.agent.process_file_event("renamed", event.dest_path, original_path=event.src_path)


def main():
    parser = argparse.ArgumentParser(description="TraceX Windows Endpoint Collection Agent")
    parser.add_argument("command", choices=["start", "collect", "historical", "status", "simulate-pdf", "inspect"], help="Agent command")
    parser.add_argument("--config", default="config.json", help="Path to config.json")
    parser.add_argument("--file", default=None, help="Target file path to inspect/monitor")
    parser.add_argument("--dir", default=None, help="Directory to monitor/scan")
    parser.add_argument("--hours", type=int, default=24, help="Historical time window in hours")
    parser.add_argument("--case-id", default=None, help="Case ID to assign collection to")
    args = parser.parse_args()

    agent = TraceXAgent(config_path=args.config)
    if args.dir:
        agent.monitored_paths = [args.dir]
    elif args.file:
        file_dir = os.path.dirname(os.path.abspath(args.file))
        if os.path.exists(file_dir):
            agent.monitored_paths = [file_dir]
    if args.case_id:
        agent.case_id = args.case_id

    if args.command == "start":
        agent.start()
    elif args.command in ["collect", "historical"]:
        agent.run_historical_collection(hours=args.hours, case_id=args.case_id)
    elif args.command == "inspect":
        target = args.file or (args.dir if os.path.isfile(args.dir) else None)
        if not target:
            print("[Error] Please specify a file to inspect using --file <filepath>")
            sys.exit(1)
        agent.inspect_target_file(target, case_id=args.case_id)
    elif args.command == "status":
        res = agent.send_http_request("/agent/status", {})
        if res:
            print(json.dumps(res, indent=2))
        else:
            print(f"Could not connect to TraceX backend at {agent.backend_url}.")
    elif args.command == "simulate-pdf":
        print("[TraceX Simulation] Running PDF baseline and modification test...")
        from test_agent_workflow import run_test_workflow
        run_test_workflow()


if __name__ == "__main__":
    main()
