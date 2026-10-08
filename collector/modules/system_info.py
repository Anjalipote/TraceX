import os
import platform
import getpass
import ctypes
from datetime import datetime, timezone
from typing import Dict, Any
import psutil

def is_admin() -> bool:
    """Determines whether current execution has Administrator elevation."""
    if platform.system() != "Windows":
        return False
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False

check_elevation = is_admin

def collect_system_info() -> Dict[str, Any]:
    """
    Collects real operating system and hardware forensic metadata directly from Windows host.
    """
    hostname = platform.node() or "WINDOWS-ENDPOINT"
    win_ver = f"{platform.system()} {platform.release()}"
    win_build = platform.version()
    arch = platform.machine()
    current_user = getpass.getuser()
    
    # Timezone metadata
    local_now = datetime.now().astimezone()
    tz_name = local_now.tzname() or "UTC"
    tz_offset_hours = local_now.utcoffset().total_seconds() / 3600 if local_now.utcoffset() else 0.0
    tz_str = f"{tz_name} (UTC{'+' if tz_offset_hours >= 0 else ''}{tz_offset_hours:.1f})"

    # Boot time
    boot_timestamp = psutil.boot_time()
    boot_time_iso = datetime.fromtimestamp(boot_timestamp, timezone.utc).isoformat()
    
    # RAM and CPU
    vm = psutil.virtual_memory()
    total_ram_gb = round(vm.total / (1024 ** 3), 2)
    available_ram_gb = round(vm.available / (1024 ** 3), 2)
    cpu_cores = psutil.cpu_count(logical=True)

    admin_status = is_admin()

    return {
        "hostname": hostname,
        "windows_version": win_ver,
        "windows_build": win_build,
        "architecture": arch,
        "current_user": current_user,
        "user_domain": os.environ.get("USERDOMAIN", hostname),
        "timezone": tz_str,
        "timezone_offset_hours": tz_offset_hours,
        "boot_time": boot_time_iso,
        "boot_timestamp": boot_timestamp,
        "cpu_logical_cores": cpu_cores,
        "total_ram_gb": total_ram_gb,
        "available_ram_gb": available_ram_gb,
        "is_admin": admin_status,
        "privilege_level": "Administrator (Elevated)" if admin_status else "Standard User",
        "collected_at": datetime.now(timezone.utc).isoformat()
    }
