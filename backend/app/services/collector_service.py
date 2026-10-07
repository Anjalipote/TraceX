import os
import sys
import json
import time
import hashlib
import platform
import getpass
import difflib
import subprocess
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

try:
    import pypdf
except ImportError:
    pypdf = None


class WindowsForensicCollector:
    """
    Authorized Windows Endpoint Forensic Collector.
    Collects historical and live forensic artifacts:
    - Filesystem metadata & Candidate file discovery
    - USBSTOR Removable Device Registry
    - Windows Event Logs (System & Security)
    - NTFS USN Change Journal (with elevation detection)
    - In-depth PDF textual diffing
    """

    @staticmethod
    def is_admin() -> bool:
        """Determines whether current execution has Administrator elevation."""
        try:
            import ctypes
            return ctypes.windll.shell32.IsUserAnAdmin() != 0
        except Exception:
            return False

    @staticmethod
    def calculate_file_hash(file_path: str, max_retries: int = 3) -> Optional[str]:
        """Calculates SHA-256 hash of a file with retry backoff for Windows file locks."""
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
                time.sleep(0.1 * (attempt + 1))
        return None

    @classmethod
    def compare_pdf_files(cls, baseline_pdf_path: str, modified_pdf_path: str) -> Dict[str, Any]:
        """Page-by-page PDF textual diff extraction."""
        if not pypdf or not os.path.exists(baseline_pdf_path) or not os.path.exists(modified_pdf_path):
            return {"has_changes": False, "summary": "PDF diff unavailable or files not found."}

        def get_pages(p: str) -> List[str]:
            pages = []
            try:
                reader = pypdf.PdfReader(p)
                for page in reader.pages:
                    pages.append(page.extract_text() or "")
            except Exception:
                pass
            return pages

        base_pages = get_pages(baseline_pdf_path)
        mod_pages = get_pages(modified_pdf_path)
        max_pages = max(len(base_pages), len(mod_pages))
        changed_pages = []
        pages_diff = []
        total_additions = 0
        total_deletions = 0

        for i in range(max_pages):
            page_num = i + 1
            b_text = base_pages[i] if i < len(base_pages) else ""
            m_text = mod_pages[i] if i < len(mod_pages) else ""
            b_lines = [l.strip() for l in b_text.splitlines() if l.strip()]
            m_lines = [l.strip() for l in m_text.splitlines() if l.strip()]

            matcher = difflib.SequenceMatcher(None, b_lines, m_lines)
            diff_lines = []
            added = []
            removed = []

            for tag, i1, i2, j1, j2 in matcher.get_opcodes():
                if tag == "equal":
                    for line in b_lines[i1:i2]:
                        diff_lines.append({"type": "unchanged", "text": line})
                elif tag == "replace":
                    for line in b_lines[i1:i2]:
                        diff_lines.append({"type": "removed", "text": line})
                        removed.append(line)
                        total_deletions += 1
                    for line in m_lines[j1:j2]:
                        diff_lines.append({"type": "added", "text": line})
                        added.append(line)
                        total_additions += 1
                elif tag == "delete":
                    for line in b_lines[i1:i2]:
                        diff_lines.append({"type": "removed", "text": line})
                        removed.append(line)
                        total_deletions += 1
                elif tag == "insert":
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

    @classmethod
    def collect_usb_history(cls) -> Dict[str, Any]:
        """
        Extracts USB Storage devices from Windows Registry:
        HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR
        """
        if platform.system() != "Windows":
            return {
                "status": "unavailable",
                "reason": "USBSTOR registry is Windows-specific.",
                "devices": []
            }

        devices = []
        try:
            import winreg
            base_key_path = r"SYSTEM\CurrentControlSet\Enum\USBSTOR"
            try:
                usbstor_key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, base_key_path)
            except FileNotFoundError:
                return {
                    "status": "available",
                    "reason": "No USBSTOR key found (no historical USB storage devices attached).",
                    "devices": []
                }

            num_subkeys = winreg.QueryInfoKey(usbstor_key)[0]
            for i in range(num_subkeys):
                device_type = winreg.EnumKey(usbstor_key, i)
                dev_key = winreg.OpenKey(usbstor_key, device_type)
                num_instances = winreg.QueryInfoKey(dev_key)[0]
                
                for j in range(num_instances):
                    instance_id = winreg.EnumKey(dev_key, j)
                    inst_key = winreg.OpenKey(dev_key, instance_id)
                    
                    # Extract values
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

            return {
                "status": "available",
                "count": len(devices),
                "devices": devices
            }
        except Exception as e:
            return {
                "status": "error",
                "reason": f"Failed reading USBSTOR: {str(e)}",
                "devices": []
            }

    @classmethod
    def read_file_usn_data(cls, file_path: str) -> Optional[Dict[str, Any]]:
        """
        Reads per-file USN metadata using 'fsutil usn readData'.
        Succeeds under standard user permissions without administrator elevation.
        """
        if platform.system() != "Windows" or not os.path.isfile(file_path):
            return None
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

    @classmethod
    def collect_usn_journal(cls, volume: str = "C:") -> Dict[str, Any]:
        """
        Inspects NTFS USN Change Journal.
        Accurately reports privilege limitation if non-elevated.
        When elevated, parses CSV records (created, modified, deleted, renamed, reason, file reference).
        """
        if platform.system() != "Windows":
            return {
                "status": "unavailable",
                "reason": "Historical record unavailable: NTFS USN Journal is Windows-specific.",
                "records": []
            }

        # Check if journal query works
        try:
            res = subprocess.run(
                ["fsutil", "usn", "queryjournal", volume],
                capture_output=True,
                text=True,
                timeout=5
            )
            if res.returncode != 0:
                return {
                    "status": "unavailable",
                    "reason": f"Historical record unavailable: USN journal query failed ({res.stderr.strip() or 'Volume may not be NTFS'}).",
                    "records": []
                }
            
            journal_output = res.stdout
            journal_metadata = {}
            for line in journal_output.splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    journal_metadata[k.strip().replace(" ", "_").lower()] = v.strip()
            
            # Check if reading raw volume journal stream is allowed (requires elevation)
            if not cls.is_admin():
                return {
                    "status": "unavailable",
                    "reason": "Historical record unavailable: Reading raw NTFS USN Journal records requires Windows Administrator elevation (Error 5: Access is denied). Running under standard user privileges.",
                    "journal_metadata": journal_metadata,
                    "records_count": 0,
                    "records": []
                }

            # Elevated: read recent journal entries
            read_res = subprocess.run(
                ["fsutil", "usn", "readjournal", volume, "csv"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if read_res.returncode == 0:
                records = []
                lines = [l.strip() for l in read_res.stdout.splitlines() if l.strip()]
                # CSV Format: Usn,FileRef#,ParentFileRef#,Reason,ReasonName,TimeStamp,FileAttributes,FileNameLength,FileNameOffset,FileName
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

                        # Map event type
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
                    "reason": f"Historical record unavailable: Reading USN journal stream failed ({read_res.stderr.strip() or 'Journal record range not found'}).",
                    "records": []
                }
        except Exception as e:
            return {
                "status": "unavailable",
                "reason": f"Historical record unavailable: fsutil execution failed ({str(e)}).",
                "records": []
            }

    @classmethod
    def collect_event_logs(cls, hours: int = 24) -> Dict[str, Any]:
        """
        Collects Windows System, Kernel-PnP, and Security event logs using wevtutil.
        """
        if platform.system() != "Windows":
            return {
                "status": "unavailable",
                "reason": "Historical record unavailable: Windows Event Log is Windows-specific.",
                "events": []
            }

        events = []
        status_info = {
            "pnp_log": "available",
            "system_log": "available",
            "security_log": "unknown"
        }

        # 1. Microsoft-Windows-Kernel-PnP/Configuration (Device Configuration & Removal)
        try:
            pnp_res = subprocess.run(
                ["wevtutil", "qe", "Microsoft-Windows-Kernel-PnP/Configuration", "/c:30", "/rd:true", "/f:text"],
                capture_output=True,
                text=True,
                timeout=10
            )
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
                    action_name = "Device Configured" if eid == "400" else "Device Started" if eid == "410" else "Device Deleted" if eid == "420" else "Device PnP Event"
                    desc_text = " ".join(desc_lines)[:250] if desc_lines else "PnP configuration event"
                    
                    if eid in ["400", "410", "420", "430"]:
                        events.append({
                            "log": "Kernel-PnP",
                            "event_id": eid,
                            "source": "Windows Event Log (Kernel-PnP)",
                            "timestamp": event_dict.get("Date", ""),
                            "user": event_dict.get("User Name", "SYSTEM"),
                            "action": action_name,
                            "description": f"{action_name}: {desc_text}"
                        })
            else:
                status_info["pnp_log"] = f"Failed: {pnp_res.stderr.strip()}"
        except Exception as e:
            status_info["pnp_log"] = f"Error: {str(e)}"

        # 2. System Log (Accessible to standard users)
        try:
            res = subprocess.run(
                ["wevtutil", "qe", "System", "/c:30", "/rd:true", "/f:text"],
                capture_output=True,
                text=True,
                timeout=10
            )
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
            else:
                status_info["system_log"] = f"Failed: {res.stderr.strip()}"
        except Exception as e:
            status_info["system_log"] = f"Error: {str(e)}"

        # 3. Security Log (Audit 4663 / 4624)
        try:
            sec_res = subprocess.run(
                ["wevtutil", "qe", "Security", "/c:15", "/rd:true", "/f:text"],
                capture_output=True,
                text=True,
                timeout=10
            )
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

    @classmethod
    def discover_candidate_files(
        cls,
        search_paths: List[str],
        hours: int = 24,
        extensions: Optional[List[str]] = None,
        baseline_manifest: Optional[Dict[str, Any]] = None,
        baseline_cache_dir: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Discovers candidate files across target directory paths without
        requiring pre-known filenames. Searches by recent mtime/ctime window.
        """
        cutoff_time = time.time() - (hours * 3600)
        candidate_files = []
        extensions_lower = [ext.lower() for ext in extensions] if extensions else None

        for search_path in search_paths:
            if not os.path.exists(search_path):
                continue

            for root, _, files in os.walk(search_path):
                # Skip .git, node_modules, .tracex_baseline
                if any(ignored in root for ignored in [".git", "node_modules", ".tracex_baseline", "__pycache__"]):
                    continue

                for file in files:
                    full_path = os.path.join(root, file)
                    ext = os.path.splitext(file)[1].lower()

                    if extensions_lower and ext not in extensions_lower:
                        continue

                    try:
                        stat = os.stat(full_path)
                    except Exception:
                        continue

                    # Check if modified or created within time window, or if in targeted evidence folder
                    is_targeted_folder = any(tf in full_path.replace("\\", "/") for tf in ["agent_test_evidence", "monitored_evidence"])
                    is_within_window = (stat.st_mtime >= cutoff_time) or (stat.st_ctime >= cutoff_time) or is_targeted_folder
                    
                    # Always include if present in baseline manifest and changed
                    sha256 = None
                    baseline_sha256 = None
                    is_baseline_diverged = False
                    pdf_diff = None

                    if baseline_manifest and full_path in baseline_manifest:
                        b_info = baseline_manifest[full_path]
                        baseline_sha256 = b_info.get("sha256")
                        sha256 = cls.calculate_file_hash(full_path)
                        if baseline_sha256 and sha256 and sha256 != baseline_sha256:
                            is_baseline_diverged = True
                            is_within_window = True  # force include diverged files

                            # Check for PDF diff
                            if ext == ".pdf" and baseline_cache_dir:
                                cached_baseline = os.path.join(baseline_cache_dir, f"base_{file}")
                                if os.path.exists(cached_baseline):
                                    pdf_diff = cls.compare_pdf_files(cached_baseline, full_path)

                    if not is_within_window:
                        continue

                    if not sha256:
                        sha256 = cls.calculate_file_hash(full_path)

                    mtime_dt = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
                    ctime_dt = datetime.fromtimestamp(stat.st_ctime, tz=timezone.utc)
                    atime_dt = datetime.fromtimestamp(stat.st_atime, tz=timezone.utc)
                    usn_meta = cls.read_file_usn_data(full_path)

                    candidate_files.append({
                        "file_name": file,
                        "file_path": full_path,
                        "file_size": stat.st_size,
                        "extension": ext,
                        "sha256": sha256,
                        "baseline_sha256": baseline_sha256,
                        "is_baseline_diverged": is_baseline_diverged,
                        "mtime": mtime_dt.isoformat(),
                        "ctime": ctime_dt.isoformat(),
                        "atime": atime_dt.isoformat(),
                        "usn_data": usn_meta,
                        "source": "NTFS File Metadata Scan",
                        "pdf_diff": pdf_diff
                    })

        # Sort candidate files by mtime descending
        candidate_files.sort(key=lambda x: x.get("mtime", ""), reverse=True)
        return candidate_files
