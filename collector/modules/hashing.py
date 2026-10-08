import os
import time
import json
import hashlib
from typing import Optional, Any

def calculate_sha256(file_path: str, max_retries: int = 5) -> Optional[str]:
    """
    Calculates the cryptographic SHA-256 hash of a file on disk.
    Includes retry backoff to cleanly handle transient Windows file locks.
    """
    if not os.path.isfile(file_path):
        return None

    for attempt in range(max_retries):
        try:
            hasher = hashlib.sha256()
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(65536), b""):
                    hasher.update(chunk)
            return hasher.hexdigest().lower()
        except (PermissionError, IOError):
            time.sleep(0.1 * (attempt + 1))
        except Exception:
            break
    return None

hash_file = calculate_sha256

def hash_bytes(data: bytes) -> str:
    """Calculates SHA-256 hash of raw byte payload."""
    return hashlib.sha256(data).hexdigest().lower()

def hash_string(text: str) -> str:
    """Calculates SHA-256 hash of a string encoded in UTF-8."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest().lower()

def hash_dict(obj: Any) -> str:
    """Calculates deterministic SHA-256 hash of a JSON-serializable dictionary."""
    canonical_json = json.dumps(obj, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest().lower()
