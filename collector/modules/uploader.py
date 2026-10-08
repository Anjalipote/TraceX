"""
TraceX Forensic Collector - Evidence Packaging & Upload Module
Writes evidence artifacts to disk, seals manifest with SHA-256 hashes,
and securely uploads the forensic package to the TraceX Backend API.
"""
import os
import json
import urllib.request
import urllib.error
import ssl
from datetime import datetime, timezone
from typing import Dict, Any, Tuple
import logging
from .hashing import hash_file, hash_string

logger = logging.getLogger("TraceXCollector.Uploader")


def package_evidence(
    output_dir: str,
    case_id: str,
    computer_id: str,
    target_path: str,
    is_elevated: bool,
    artifacts: Dict[str, Any],
    collector_version: str = "1.0.0"
) -> Tuple[str, Dict[str, Any]]:
    """
    Writes all artifact JSON files into output_dir and generates a sealed manifest.json.
    Returns (manifest_path, manifest_data).
    """
    os.makedirs(output_dir, exist_ok=True)
    manifest_artifacts: Dict[str, Dict[str, Any]] = {}
    artifact_hashes = []

    # Save each individual artifact file
    for name, data in artifacts.items():
        filename = f"{name}.json"
        filepath = os.path.join(output_dir, filename)
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        sha256 = hash_file(filepath)
        size = os.path.getsize(filepath)
        artifact_hashes.append(sha256)

        # Count records if applicable
        record_count = 0
        if isinstance(data, list):
            record_count = len(data)
        elif isinstance(data, dict):
            if "total_files" in data:
                record_count = data["total_files"]
            elif "total_events" in data:
                record_count = data["total_events"]
            elif "total_devices" in data:
                record_count = data["total_devices"]
            elif "total_processes" in data:
                record_count = data["total_processes"]
            elif "active_connections_count" in data:
                record_count = data["active_connections_count"]
            else:
                record_count = len(data)

        manifest_artifacts[filename] = {
            "sha256": sha256,
            "bytes": size,
            "record_count": record_count
        }

    # Combined hash seal of all artifact hashes
    combined_hash_str = "".join(sorted(artifact_hashes))
    overall_seal = hash_string(combined_hash_str)

    manifest_data = {
        "case_id": case_id,
        "computer_id": computer_id,
        "collector_version": collector_version,
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "target_path": target_path,
        "is_elevated": is_elevated,
        "artifacts": manifest_artifacts,
        "overall_evidence_seal_sha256": overall_seal
    }

    manifest_path = os.path.join(output_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2, ensure_ascii=False)

    return manifest_path, manifest_data


def upload_evidence(
    backend_url: str,
    case_id: str,
    manifest_data: Dict[str, Any],
    artifacts: Dict[str, Any],
    session_token: str = "",
    timeout_sec: int = 60
) -> Dict[str, Any]:
    """
    Sends the complete forensic package to the TraceX Backend API.
    Uses standard library urllib to guarantee zero-dependency execution.
    """
    # Normalize endpoint URL
    clean_url = backend_url.rstrip("/")
    if not clean_url.endswith("/api") and not "/api/" in clean_url:
        endpoint = f"{clean_url}/api/investigations/{case_id}/collector/upload"
    elif clean_url.endswith("/api"):
        endpoint = f"{clean_url}/investigations/{case_id}/collector/upload"
    else:
        endpoint = f"{clean_url}/investigations/{case_id}/collector/upload"

    payload = {
        "case_id": case_id,
        "computer_id": manifest_data.get("computer_id", ""),
        "manifest": manifest_data,
        "artifacts": artifacts
    }

    payload_bytes = json.dumps(payload).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "TraceX-Forensic-Collector/1.0"
    }
    if session_token:
        headers["Authorization"] = f"Bearer {session_token}"

    req = urllib.request.Request(endpoint, data=payload_bytes, headers=headers, method="POST")

    # In local testing or intranet environments, bypass strict SSL verify if requested
    ctx = ssl.create_default_context()
    if "127.0.0.1" in endpoint or "localhost" in endpoint:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

    try:
        with urllib.request.urlopen(req, timeout=timeout_sec, context=ctx) as resp:
            resp_code = resp.getcode()
            resp_body = resp.read().decode("utf-8")
            result_json = {}
            if resp_body:
                try:
                    result_json = json.loads(resp_body)
                except Exception:
                    result_json = {"raw": resp_body}
            return {
                "success": 200 <= resp_code < 300,
                "status_code": resp_code,
                "data": result_json
            }
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        logger.error(f"HTTP error during upload: {e.code} - {error_body}")
        return {
            "success": False,
            "status_code": e.code,
            "error": error_body or str(e)
        }
    except urllib.error.URLError as e:
        logger.error(f"Connection error during upload to {endpoint}: {e.reason}")
        return {
            "success": False,
            "status_code": 0,
            "error": f"Failed to connect to backend at {endpoint}: {e.reason}"
        }
    except Exception as e:
        logger.error(f"Unexpected upload failure: {e}")
        return {
            "success": False,
            "status_code": 0,
            "error": str(e)
        }
