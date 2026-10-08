"""
TraceX Forensic Collector - Process Enumeration Module
Collects active processes, PIDs, paths, parent PIDs, start times, and user context.
"""
from datetime import datetime, timezone
from typing import Dict, Any, List
import logging
import psutil

logger = logging.getLogger("TraceXCollector.Processes")


def collect_processes() -> Dict[str, Any]:
    """
    Enumerate all running processes safely on the Windows host.
    Extracts PID, name, path, cmdline, ppid, create_time, username, and status.
    """
    processes: List[Dict[str, Any]] = []
    denied_count = 0
    total_count = 0

    for proc in psutil.process_iter(['pid', 'name', 'ppid', 'status', 'create_time', 'username', 'exe']):
        total_count += 1
        try:
            p_info = proc.info
            create_ts = p_info.get('create_time')
            created_iso = ""
            if create_ts:
                try:
                    created_iso = datetime.fromtimestamp(create_ts, tz=timezone.utc).isoformat()
                except Exception:
                    created_iso = str(create_ts)

            # Safe retrieval of command line
            cmdline = []
            try:
                cmdline = proc.cmdline()
            except (psutil.AccessDenied, psutil.NoSuchProcess, Exception):
                cmdline = []

            processes.append({
                "pid": p_info.get("pid"),
                "name": p_info.get("name") or "Unknown",
                "ppid": p_info.get("ppid"),
                "exe": p_info.get("exe") or "",
                "cmdline": cmdline,
                "username": p_info.get("username") or "",
                "status": p_info.get("status") or "",
                "created_at": created_iso
            })
        except (psutil.NoSuchProcess, psutil.ZombieProcess):
            continue
        except psutil.AccessDenied:
            denied_count += 1
            try:
                processes.append({
                    "pid": proc.pid,
                    "name": proc.name() if hasattr(proc, 'name') else "AccessDenied",
                    "ppid": None,
                    "exe": "[Access Denied - System/Protected Process]",
                    "cmdline": [],
                    "username": "",
                    "status": "access_denied",
                    "created_at": ""
                })
            except Exception:
                pass
        except Exception as e:
            logger.debug(f"Error enumerating process: {e}")

    return {
        "total_processes": total_count,
        "collected_processes": len(processes),
        "access_denied_count": denied_count,
        "processes": processes,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
