import os
import getpass
from datetime import datetime, timezone
from typing import Dict, Any, List
import psutil

def collect_user_sessions() -> Dict[str, Any]:
    """
    Collects real active user sessions and user profile directories on the host.
    """
    current_user = getpass.getuser()
    domain = os.environ.get("USERDOMAIN", "")
    user_profile = os.environ.get("USERPROFILE", "")
    
    # Active psutil sessions
    active_sessions: List[Dict[str, Any]] = []
    try:
        for u in psutil.users():
            active_sessions.append({
                "name": u.name,
                "terminal": u.terminal or "Console",
                "host": u.host or "Local",
                "started": datetime.fromtimestamp(u.started, timezone.utc).isoformat() if u.started else None
            })
    except Exception:
        pass

    # Inspect C:\Users directory for known user accounts
    discovered_profiles: List[Dict[str, Any]] = []
    users_root = r"C:\Users" if os.path.exists(r"C:\Users") else os.path.dirname(user_profile)
    if os.path.exists(users_root):
        try:
            for entry in os.scandir(users_root):
                if entry.is_dir() and not entry.name.startswith((".", "$")):
                    try:
                        stat = entry.stat()
                        discovered_profiles.append({
                            "username": entry.name,
                            "profile_path": entry.path,
                            "created_at": datetime.fromtimestamp(stat.st_ctime, timezone.utc).isoformat(),
                            "last_modified": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat()
                        })
                    except Exception:
                        continue
        except Exception:
            pass

    return {
        "current_user": current_user,
        "domain": domain,
        "user_profile_dir": user_profile,
        "active_sessions_count": len(active_sessions),
        "active_sessions": active_sessions,
        "active_users": active_sessions,
        "discovered_profiles": discovered_profiles,
        "profile_directories": discovered_profiles,
        "collected_at": datetime.now(timezone.utc).isoformat()
    }

collect_users = collect_user_sessions
