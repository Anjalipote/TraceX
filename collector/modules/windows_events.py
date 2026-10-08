import os
import platform
import subprocess
from datetime import datetime, timezone
from typing import Dict, Any, List
from .system_info import is_admin

def parse_wevtutil_text_block(block: str, channel_name: str) -> Dict[str, Any]:
    """Parses a text block formatted by 'wevtutil qe /f:text' into structured event metadata."""
    event_data: Dict[str, str] = {}
    desc_lines: List[str] = []
    in_desc = False

    for line in block.splitlines():
        line_s = line.strip()
        if not line_s:
            continue
        if in_desc:
            desc_lines.append(line_s)
        elif line_s.startswith("Description:"):
            in_desc = True
            desc_lines.append(line_s.replace("Description:", "").strip())
        elif ":" in line_s:
            k, v = line_s.split(":", 1)
            event_data[k.strip()] = v.strip()

    eid = event_data.get("Event ID", "UNKNOWN")
    ts = event_data.get("Date", "")
    provider = event_data.get("Source", event_data.get("Provider Name", channel_name))
    level = event_data.get("Level", "Information")
    user = event_data.get("User Name", event_data.get("User", "SYSTEM"))
    msg = " ".join(desc_lines).strip() or event_data.get("Task", "Windows Event Record")

    return {
        "event_id": eid,
        "timestamp": ts,
        "provider": provider,
        "level": level,
        "user": user,
        "source_log": channel_name,
        "message": msg[:400],
        "computer": event_data.get("Computer", "")
    }

def collect_windows_events(max_events_per_channel: int = 25) -> Dict[str, Any]:
    """
    Collects real Windows Event Logs from available system channels.
    Preserves event ID, timestamp, provider, level, and message without fabrication.
    """
    if platform.system() != "Windows":
        return {
            "status": "unavailable",
            "reason": "Windows Event Logs are Windows-specific.",
            "channels": {},
            "events_count": 0,
            "events": []
        }

    collected_events: List[Dict[str, Any]] = []
    channel_status: Dict[str, str] = {}

    # 1. Microsoft-Windows-Kernel-PnP/Configuration (Device Plug & Play / USB)
    try:
        proc = subprocess.run(
            ["wevtutil", "qe", "Microsoft-Windows-Kernel-PnP/Configuration", f"/c:{max_events_per_channel}", "/rd:true", "/f:text"],
            capture_output=True,
            text=True,
            timeout=8
        )
        if proc.returncode == 0 and proc.stdout.strip():
            channel_status["Kernel-PnP"] = "available"
            blocks = proc.stdout.split("Event[")
            for b in blocks:
                if not b.strip():
                    continue
                evt = parse_wevtutil_text_block(b, "Kernel-PnP")
                eid = evt["event_id"]
                if eid in ["400", "410", "420", "430"]:
                    evt["action"] = "Device Configured" if eid == "400" else ("Device Started" if eid == "410" else ("Device Deleted" if eid == "420" else "PnP Event"))
                    collected_events.append(evt)
        else:
            channel_status["Kernel-PnP"] = "No recent records"
    except Exception as e:
        channel_status["Kernel-PnP"] = f"Error: {str(e)}"

    # 2. System Log
    try:
        proc = subprocess.run(
            ["wevtutil", "qe", "System", f"/c:{max_events_per_channel}", "/rd:true", "/f:text"],
            capture_output=True,
            text=True,
            timeout=8
        )
        if proc.returncode == 0 and proc.stdout.strip():
            channel_status["System"] = "available"
            blocks = proc.stdout.split("Event[")
            for b in blocks:
                if not b.strip():
                    continue
                evt = parse_wevtutil_text_block(b, "System")
                if evt["event_id"] != "UNKNOWN":
                    collected_events.append(evt)
        else:
            channel_status["System"] = "No recent records"
    except Exception as e:
        channel_status["System"] = f"Error: {str(e)}"

    # 3. Security Log (Audit & Object Access)
    if is_admin():
        try:
            proc = subprocess.run(
                ["wevtutil", "qe", "Security", f"/c:{max_events_per_channel}", "/rd:true", "/f:text"],
                capture_output=True,
                text=True,
                timeout=8
            )
            if proc.returncode == 0 and proc.stdout.strip():
                channel_status["Security"] = "available"
                blocks = proc.stdout.split("Event[")
                for b in blocks:
                    if not b.strip():
                        continue
                    evt = parse_wevtutil_text_block(b, "Security")
                    if evt["event_id"] in ["4624", "4634", "4663", "1102", "4672", "4688"]:
                        collected_events.append(evt)
            else:
                channel_status["Security"] = "No matching security events"
        except Exception as e:
            channel_status["Security"] = f"Error: {str(e)}"
    else:
        channel_status["Security"] = "Administrator privileges are required to collect Windows Security Event Log."

    # 4. Application Log
    try:
        proc = subprocess.run(
            ["wevtutil", "qe", "Application", f"/c:{max_events_per_channel}", "/rd:true", "/f:text"],
            capture_output=True,
            text=True,
            timeout=8
        )
        if proc.returncode == 0 and proc.stdout.strip():
            channel_status["Application"] = "available"
            blocks = proc.stdout.split("Event[")
            for b in blocks:
                if not b.strip():
                    continue
                evt = parse_wevtutil_text_block(b, "Application")
                if evt["event_id"] != "UNKNOWN":
                    collected_events.append(evt)
        else:
            channel_status["Application"] = "No recent records"
    except Exception as e:
        channel_status["Application"] = f"Error: {str(e)}"

    return {
        "status": "available" if collected_events else "empty",
        "channels": channel_status,
        "events_count": len(collected_events),
        "events": collected_events,
        "collected_at": datetime.now(timezone.utc).isoformat()
    }
