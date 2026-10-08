import os
import platform
import subprocess
from datetime import datetime, timezone
from typing import Dict, Any, List
from .system_info import is_admin

def collect_usn_journal(volume: str = "C:", max_records: int = 250, drive_letter: str = None) -> Dict[str, Any]:
    """
    Collects real NTFS USN (Update Sequence Number) Change Journal records.
    Explicitly reports elevation limitations if executed under standard user permissions.
    Does NOT invent or fabricate any USN records.
    """
    if drive_letter:
        volume = drive_letter
    if not volume.endswith(":"):
        volume = f"{volume}:"
    if platform.system() != "Windows":
        return {
            "status": "unavailable",
            "source": "USN Journal",
            "reason": "USN Journal unavailable: Host operating system is not Windows.",
            "records_count": 0,
            "records": []
        }

    # Verify fsutil is available and check volume USN status
    try:
        query_proc = subprocess.run(
            ["fsutil", "usn", "queryjournal", volume],
            capture_output=True,
            text=True,
            timeout=5
        )
        if query_proc.returncode != 0:
            return {
                "status": "unavailable",
                "source": "USN Journal",
                "reason": f"USN Journal unavailable: Query failed on volume {volume} ({query_proc.stderr.strip() or 'Volume not formatted as NTFS'}).",
                "records_count": 0,
                "records": []
            }

        journal_metadata: Dict[str, str] = {}
        for line in query_proc.stdout.splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                journal_metadata[k.strip().replace(" ", "_").lower()] = v.strip()

        # Check Administrator elevation
        if not is_admin():
            return {
                "status": "unavailable",
                "source": "USN Journal",
                "reason": "Administrator privileges are required to collect raw NTFS USN Journal records (Error 5: Access is denied). Running under standard user privileges.",
                "journal_metadata": journal_metadata,
                "records_count": 0,
                "records": []
            }

        # Elevated execution: read raw USN journal records in CSV format
        read_proc = subprocess.run(
            ["fsutil", "usn", "readjournal", volume, "csv"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if read_proc.returncode != 0:
            return {
                "status": "unavailable",
                "source": "USN Journal",
                "reason": f"USN Journal unavailable: Read failed ({read_proc.stderr.strip()}).",
                "journal_metadata": journal_metadata,
                "records_count": 0,
                "records": []
            }

        records: List[Dict[str, Any]] = []
        lines = [l.strip() for l in read_proc.stdout.splitlines() if l.strip()]
        
        for line in lines:
            parts = [p.strip() for p in line.split(",")]
            # Standard fsutil USN CSV format: Usn, FileRef, ParentFileRef, ReasonCode, ReasonName, TimeStamp, FileName
            if len(parts) >= 6 and not parts[0].lower().startswith("usn"):
                usn_val = parts[0]
                file_ref = parts[1]
                parent_ref = parts[2]
                reason_code = parts[3]
                reason_name = parts[4] if len(parts) > 4 else "DATA_MODIFIED"
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
                    "change_reason": reason_name,
                    "timestamp": ts,
                    "file_name": fname,
                    "volume": volume,
                    "event_type": evt_type,
                    "source": "USN Journal"
                })

        limited_records = records[:max_records]
        return {
            "status": "available",
            "source": "USN Journal",
            "records_count": len(records),
            "total_events": len(records),
            "records": limited_records,
            "events": limited_records,
            "journal_metadata": journal_metadata,
            "collected_at": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        return {
            "status": "unavailable",
            "source": "USN Journal",
            "reason": f"USN Journal unavailable: {str(e)}",
            "records_count": 0,
            "total_events": 0,
            "records": [],
            "events": []
        }
