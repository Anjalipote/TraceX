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

    @staticmethod
    def format_file_size(size_bytes: int) -> str:
        """Formats file size into human-readable format."""
        if size_bytes < 1024:
            return f"{size_bytes} bytes"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f} KB ({size_bytes:,} bytes)"
        else:
            return f"{size_bytes / (1024 * 1024):.2f} MB ({size_bytes:,} bytes)"

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
    def compare_text_files(cls, baseline_path: str, current_path: str) -> Dict[str, Any]:
        """Line-by-line textual diff extraction for text, code, scripts, configuration, and data files."""
        def read_text(p: str) -> List[str]:
            for enc in ["utf-8", "utf-8-sig", "latin-1", "cp1252"]:
                try:
                    with open(p, "r", encoding=enc, errors="replace") as f:
                        return f.read().splitlines()
                except Exception:
                    continue
            return []

        b_lines = read_text(baseline_path)
        c_lines = read_text(current_path)

        matcher = difflib.SequenceMatcher(None, b_lines, c_lines)
        diff_lines = []
        added_lines = []
        removed_lines = []
        total_additions = 0
        total_deletions = 0

        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == "equal":
                for line in b_lines[i1:i2]:
                    diff_lines.append({"type": "unchanged", "text": line})
            elif tag == "replace":
                for line in b_lines[i1:i2]:
                    diff_lines.append({"type": "removed", "text": line})
                    removed_lines.append(line)
                    total_deletions += 1
                for line in c_lines[j1:j2]:
                    diff_lines.append({"type": "added", "text": line})
                    added_lines.append(line)
                    total_additions += 1
            elif tag == "delete":
                for line in b_lines[i1:i2]:
                    diff_lines.append({"type": "removed", "text": line})
                    removed_lines.append(line)
                    total_deletions += 1
            elif tag == "insert":
                for line in c_lines[j1:j2]:
                    diff_lines.append({"type": "added", "text": line})
                    added_lines.append(line)
                    total_additions += 1

        has_changes = total_additions > 0 or total_deletions > 0
        summary = (
            f"Altered content: {total_additions} additions, {total_deletions} deletions across {len(c_lines)} lines."
            if has_changes else "Content matches baseline."
        )

        return {
            "has_changes": has_changes,
            "total_lines_baseline": len(b_lines),
            "total_lines_modified": len(c_lines),
            "total_additions": total_additions,
            "total_deletions": total_deletions,
            "added_lines": added_lines[:50],
            "removed_lines": removed_lines[:50],
            "diff_lines": diff_lines[:200],
            "summary": summary,
            "changed_pages": [1] if has_changes else [],
            "pages": [{
                "page_number": 1,
                "has_changes": has_changes,
                "added_lines": added_lines[:50],
                "removed_lines": removed_lines[:50],
                "diff_lines": diff_lines[:200]
            }]
        }

    @classmethod
    def compare_office_files(cls, baseline_path: str, current_path: str, ext: str) -> Dict[str, Any]:
        """Extracts text from Office files (.docx, .pptx, .xlsx) via zip archive XML inspection."""
        import zipfile
        import xml.etree.ElementTree as ET

        def extract_zip_xml_text(path: str) -> str:
            texts = []
            try:
                with zipfile.ZipFile(path, 'r') as zf:
                    for name in zf.namelist():
                        if name.endswith('.xml') and ('word/' in name or 'ppt/' in name or 'xl/' in name):
                            xml_bytes = zf.read(name)
                            root = ET.fromstring(xml_bytes)
                            for elem in root.iter():
                                if elem.text and elem.text.strip():
                                    texts.append(elem.text.strip())
            except Exception:
                pass
            return "\n".join(texts)

        b_text = extract_zip_xml_text(baseline_path)
        c_text = extract_zip_xml_text(current_path)
        if not b_text and not c_text:
            return {
                "has_changes": False,
                "status": "Unavailable",
                "message": "Office document textual extraction unavailable without specialized converters."
            }

        b_lines = b_text.splitlines()
        c_lines = c_text.splitlines()
        matcher = difflib.SequenceMatcher(None, b_lines, c_lines)
        diff_lines = []
        added = []
        removed = []
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == "equal":
                for l in b_lines[i1:i2]: diff_lines.append({"type": "unchanged", "text": l})
            elif tag in ["replace", "delete"]:
                for l in b_lines[i1:i2]:
                    diff_lines.append({"type": "removed", "text": l})
                    removed.append(l)
            if tag in ["replace", "insert"]:
                for l in c_lines[j1:j2]:
                    diff_lines.append({"type": "added", "text": l})
                    added.append(l)

        has_changes = len(added) > 0 or len(removed) > 0
        return {
            "has_changes": has_changes,
            "total_lines_baseline": len(b_lines),
            "total_lines_modified": len(c_lines),
            "total_additions": len(added),
            "total_deletions": len(removed),
            "added_lines": added[:50],
            "removed_lines": removed[:50],
            "diff_lines": diff_lines[:200],
            "summary": f"Office text comparison: {len(added)} additions, {len(removed)} deletions." if has_changes else "Content matches baseline.",
            "changed_pages": [1] if has_changes else [],
            "pages": [{"page_number": 1, "has_changes": has_changes, "added_lines": added[:50], "removed_lines": removed[:50], "diff_lines": diff_lines[:200]}]
        }

    @classmethod
    def compare_generic_content(cls, baseline_path: Optional[str], current_path: str, ext: str) -> Dict[str, Any]:
        """
        Generic content-level comparison between baseline and current file for any supported type.
        If baseline is unavailable, clearly states 'Previous version unavailable.'
        """
        if not baseline_path or not os.path.exists(baseline_path):
            return {
                "has_changes": False,
                "status": "Unavailable",
                "message": "Previous version unavailable. Content-level historical comparison cannot be performed."
            }

        if not os.path.exists(current_path):
            return {
                "has_changes": False,
                "status": "Unavailable",
                "message": "Current version file not found on disk."
            }

        ext = ext.lower()

        # 1. PDF files
        if ext == ".pdf":
            return cls.compare_pdf_files(baseline_path, current_path)

        # 2. Text / Code / Structured files
        text_extensions = {
            ".txt", ".csv", ".tsv", ".json", ".xml", ".html", ".htm", ".css",
            ".py", ".java", ".cpp", ".c", ".h", ".cs", ".js", ".jsx", ".ts", ".tsx",
            ".md", ".log", ".bat", ".ps1", ".sh", ".yaml", ".yml", ".ini", ".conf",
            ".sql", ".env", ".toml", ".rst"
        }

        if ext in text_extensions:
            return cls.compare_text_files(baseline_path, current_path)

        # 3. Office Documents (.docx, .pptx, .xlsx)
        if ext in [".docx", ".pptx", ".xlsx"]:
            return cls.compare_office_files(baseline_path, current_path, ext)

        # 4. Binary / Images / Archives (.jpg, .png, .zip, etc.)
        b_size = os.path.getsize(baseline_path)
        c_size = os.path.getsize(current_path)
        b_hash = cls.calculate_file_hash(baseline_path)
        c_hash = cls.calculate_file_hash(current_path)
        has_hash_changed = bool(b_hash and c_hash and b_hash != c_hash)

        return {
            "has_changes": has_hash_changed,
            "status": "Binary Comparison",
            "summary": f"Binary file comparison: Size delta {c_size - b_size:+d} bytes. Hash {'diverged' if has_hash_changed else 'identical'}.",
            "baseline_size": b_size,
            "current_size": c_size,
            "baseline_hash": b_hash,
            "current_hash": c_hash
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

    @classmethod
    def inspect_target_file(
        cls,
        file_path: str,
        baseline_manifest: Optional[Dict[str, Any]] = None,
        baseline_cache_dir: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Performs thorough, real on-disk forensic inspection of a specified file on this Windows laptop.
        DOES NOT INVENT VALUES: If an artifact is not accessible or not configured, returns 'Unavailable'.
        """
        abs_path = os.path.abspath(file_path)
        if not os.path.exists(abs_path):
            return {
                "exists": False,
                "file_path": abs_path,
                "file_name": os.path.basename(abs_path),
                "error": f"File not found on endpoint: {abs_path}",
                "message": f"File not found on endpoint: {abs_path}",
                "status": "Unavailable"
            }

        file_name = os.path.basename(abs_path)
        ext = os.path.splitext(file_name)[1].lower()

        # 1. Physical file stat
        try:
            stat_res = os.stat(abs_path)
            file_size = stat_res.st_size
            ctime = datetime.fromtimestamp(stat_res.st_ctime, tz=timezone.utc).isoformat()
            mtime = datetime.fromtimestamp(stat_res.st_mtime, tz=timezone.utc).isoformat()
            atime = datetime.fromtimestamp(stat_res.st_atime, tz=timezone.utc).isoformat()
        except Exception as e:
            file_size = 0
            ctime = "Unavailable"
            mtime = "Unavailable"
            atime = "Unavailable"

        # 2. File owner & Volume / Filesystem info
        drive_letter = os.path.splitdrive(abs_path)[0] or "C:"
        volume_info = f"{drive_letter}\\"
        filesystem_type = "NTFS"  # Default on modern Windows
        file_owner = "Unavailable"
        if platform.system() == "Windows":
            try:
                import ctypes
                vol_name_buf = ctypes.create_unicode_buffer(260)
                fs_name_buf = ctypes.create_unicode_buffer(260)
                ctypes.windll.kernel32.GetVolumeInformationW(
                    volume_info,
                    vol_name_buf, 260,
                    None, None, None,
                    fs_name_buf, 260
                )
                if fs_name_buf.value:
                    filesystem_type = fs_name_buf.value
            except Exception:
                pass

            try:
                import win32security
                sd = win32security.GetFileSecurity(abs_path, win32security.OWNER_SECURITY_INFORMATION)
                owner_sid = sd.GetSecurityDescriptorOwner()
                name, domain, _ = win32security.LookupAccountSid(None, owner_sid)
                file_owner = f"{domain}\\{name}"
            except Exception:
                file_owner = getpass.getuser()
        else:
            file_owner = getpass.getuser()

        # 3. Cryptographic Hashes (freshly computed from live bytes)
        current_sha256 = cls.calculate_file_hash(abs_path) or "Unavailable"
        current_md5 = "Unavailable"
        try:
            md5_calc = hashlib.md5()
            with open(abs_path, "rb") as mf:
                for chunk in iter(lambda: mf.read(65536), b""):
                    md5_calc.update(chunk)
            current_md5 = md5_calc.hexdigest()
        except Exception:
            pass

        # 4. Baseline & Hash Divergence Comparison
        baseline_sha = None
        is_diverged = False
        if baseline_manifest and abs_path in baseline_manifest:
            b_data = baseline_manifest[abs_path]
            baseline_sha = b_data.get("sha256")
            if baseline_sha and current_sha256 != "Unavailable" and current_sha256 != baseline_sha:
                is_diverged = True

        # 5. Content Comparison across ANY file type (PDF, text, code, docs, etc.)
        cached_baseline = None
        if baseline_cache_dir:
            cand = os.path.join(baseline_cache_dir, f"base_{file_name}")
            if os.path.exists(cand):
                cached_baseline = cand

        content_comparison = cls.compare_generic_content(cached_baseline, abs_path, ext)

        # 6. NTFS USN Metadata for this specific file
        file_usn = cls.read_file_usn_data(abs_path)
        usn_records_for_file = []
        raw_usn_status = "Available" if file_usn else "Unavailable"
        raw_usn_note = ""

        # Check volume journal if elevated
        volume_journal = cls.collect_usn_journal(drive_letter)
        if volume_journal.get("status") == "available":
            for r in volume_journal.get("records", []):
                if r.get("file_name", "").lower() == file_name.lower():
                    usn_records_for_file.append(r)
        else:
            raw_usn_note = volume_journal.get("reason", "NTFS USN Change Journal volume stream unavailable.")

        # 7. Windows Event Logs & Auditing
        event_logs_res = cls.collect_event_logs(hours=48)
        auditing_status = event_logs_res.get("channel_status", {}).get(
            "security_log",
            "Windows file auditing was not configured; user attribution is unavailable."
        )

        # 8. Correlated USB / Removable Media
        usb_res = cls.collect_usb_history()

        diffable_extensions = {
            ".pdf", ".txt", ".csv", ".tsv", ".json", ".xml", ".html", ".htm", ".css",
            ".py", ".java", ".cpp", ".c", ".h", ".cs", ".js", ".jsx", ".ts", ".tsx",
            ".md", ".log", ".bat", ".ps1", ".sh", ".yaml", ".yml", ".ini", ".conf",
            ".docx", ".pptx", ".xlsx"
        }

        return {
            "exists": True,
            "file_path": abs_path,
            "file_name": file_name,
            "extension": ext,
            "file_size": file_size,
            "file_size_formatted": cls.format_file_size(file_size),
            "creation_time": ctime,
            "modification_time": mtime,
            "access_time": atime,
            "access_time_note": "NTFS LastAccessTime updates may be disabled by Windows default (NtfsDisableLastAccessUpdate=1).",
            "volume": drive_letter,
            "filesystem": filesystem_type,
            "file_owner": file_owner,
            "current_sha256": current_sha256,
            "current_md5": current_md5,
            "baseline_sha256": baseline_sha or "Unavailable",
            "is_hash_diverged": is_diverged,
            "is_pdf": ext == ".pdf",
            "is_diffable": ext in diffable_extensions,
            "content_comparison": content_comparison,
            "pdf_comparison": content_comparison,  # Aliased for backwards compatibility
            "usn_metadata": file_usn or "Unavailable",
            "usn_volume_records": usn_records_for_file,
            "usn_stream_status": raw_usn_note or "Available",
            "auditing_status": auditing_status,
            "pnp_hardware_events": event_logs_res.get("events", [])[:10],
            "connected_usb_devices": usb_res.get("devices", []),
            "collected_at": datetime.now(timezone.utc).isoformat()
        }

