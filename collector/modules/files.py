import os
import stat
import platform
import subprocess
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from .hashing import calculate_sha256

def get_file_attributes(file_path: str) -> List[str]:
    """Retrieves human-readable Windows file attributes."""
    attrs: List[str] = []
    try:
        st = os.stat(file_path)
        mode = st.st_mode
        if not (mode & stat.S_IWRITE):
            attrs.append("ReadOnly")
        if stat.S_ISDIR(mode):
            attrs.append("Directory")
        else:
            attrs.append("Archive")
        # On Windows, check system/hidden bits
        if hasattr(st, "st_file_attributes"):
            raw_attrs = st.st_file_attributes
            if raw_attrs & 0x02:
                attrs.append("Hidden")
            if raw_attrs & 0x04:
                attrs.append("System")
            if raw_attrs & 0x800:
                attrs.append("Compressed")
            if raw_attrs & 0x4000:
                attrs.append("Encrypted")
    except Exception:
        pass
    return attrs

def read_per_file_usn(file_path: str) -> Optional[Dict[str, str]]:
    """
    Attempts to read NTFS USN metadata for a specific file via 'fsutil usn readData'.
    Succeeds under standard Windows permissions without requiring elevated Administrator rights.
    """
    if platform.system() != "Windows" or not os.path.isfile(file_path):
        return None
    try:
        res = subprocess.run(
            ["fsutil", "usn", "readData", file_path],
            capture_output=True,
            text=True,
            timeout=4
        )
        if res.returncode == 0:
            usn_data: Dict[str, str] = {}
            for line in res.stdout.splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    clean_k = k.strip().replace("#", "").replace(" ", "_").lower()
                    usn_data[clean_k] = v.strip()
            return usn_data
    except Exception:
        pass
    return None

def collect_file_forensics(target_directory: str) -> Dict[str, Any]:
    """
    Recursively inspects the authorized investigation directory.
    Collects path, filename, extension, size, MACB timestamps, attributes, and SHA-256.
    """
    abs_target = os.path.abspath(target_directory)
    if not os.path.exists(abs_target):
        return {
            "status": "not_found",
            "target_directory": abs_target,
            "message": f"Target directory '{abs_target}' does not exist on this machine.",
            "file_count": 0,
            "files": []
        }

    collected_files: List[Dict[str, Any]] = []
    total_bytes = 0

    # Walk directory safely
    for root, dirs, files in os.walk(abs_target):
        # Ignore version control or agent internal folders
        dirs[:] = [d for d in dirs if d not in [".git", "node_modules", ".tracex_baseline", "__pycache__"]]
        
        for fname in files:
            full_path = os.path.join(root, fname)
            norm_path = os.path.abspath(full_path)
            
            try:
                st = os.stat(norm_path)
                size_bytes = st.st_size
                total_bytes += size_bytes
                
                ctime_iso = datetime.fromtimestamp(st.st_ctime, timezone.utc).isoformat()
                mtime_iso = datetime.fromtimestamp(st.st_mtime, timezone.utc).isoformat()
                atime_iso = datetime.fromtimestamp(st.st_atime, timezone.utc).isoformat()
                
                _, ext = os.path.splitext(fname)
                ext_clean = ext.lower()
                
                # Cryptographic SHA-256
                sha256_hash = calculate_sha256(norm_path) or "UNAVAILABLE_FILE_LOCKED"
                attrs = get_file_attributes(norm_path)
                
                # Check NTFS per-file USN
                usn_info = read_per_file_usn(norm_path)
                
                # Determine file category
                cat = "Document"
                if ext_clean in [".exe", ".dll", ".bat", ".cmd", ".ps1", ".vbs", ".msi"]:
                    cat = "Executable"
                elif ext_clean in [".log", ".evtx", ".txt"]:
                    cat = "Log"
                elif ext_clean in [".zip", ".tar", ".gz", ".7z", ".rar"]:
                    cat = "Archive"
                elif ext_clean in [".jpg", ".jpeg", ".png", ".gif", ".bmp"]:
                    cat = "Media"
                elif ext_clean in [".xlsx", ".xls", ".csv", ".tsv"]:
                    cat = "Spreadsheet"

                collected_files.append({
                    "path": norm_path,
                    "filename": fname,
                    "extension": ext_clean,
                    "category": cat,
                    "name": fname,
                    "size": size_bytes,
                    "size_bytes": size_bytes,
                    "size_formatted": f"{size_bytes} B" if size_bytes < 1024 else (f"{size_bytes / 1024:.1f} KB" if size_bytes < 1048576 else f"{size_bytes / 1048576:.2f} MB"),
                    "ctime": ctime_iso,
                    "mtime": mtime_iso,
                    "atime": atime_iso,
                    "creation_time": ctime_iso,
                    "modification_time": mtime_iso,
                    "access_time": atime_iso,
                    "attributes": attrs,
                    "sha256": sha256_hash,
                    "usn_record": usn_info,
                    "usn_fileref": usn_info.get("fileref") if usn_info else None,
                    "usn_file_ref": usn_info.get("fileref") if usn_info else None,
                    "usn_reason": usn_info.get("reason") if usn_info else None
                })
            except Exception as e:
                collected_files.append({
                    "path": norm_path,
                    "filename": fname,
                    "name": fname,
                    "error": str(e),
                    "sha256": "ERROR_READING_FILE"
                })

    return {
        "status": "success",
        "target_directory": abs_target,
        "total_files": len(collected_files),
        "file_count": len(collected_files),
        "total_bytes": total_bytes,
        "files": collected_files,
        "collected_at": datetime.now(timezone.utc).isoformat()
    }

collect_files_metadata = collect_file_forensics
