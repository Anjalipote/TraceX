import os
import mimetypes
from datetime import datetime, timezone
from typing import Dict, Any

class MetadataService:
    """
    Forensic metadata extractor.
    SAFETY GUARANTEE: Never executes files, never invokes shell commands or external interpreters.
    Treats all incoming files as inert binary streams.
    """

    MAGIC_SIGNATURES = {
        b"MZ": ("application/x-dosexec", "binary", "Windows Portable Executable (MZ)"),
        b"\x7fELF": ("application/x-executable", "binary", "Linux ELF Binary"),
        b"PK\x03\x04": ("application/zip", "document", "Zip Archive / Compressed File"),
        b"%PDF": ("application/pdf", "document", "PDF Document"),
        b"\xff\xd8\xff": ("image/jpeg", "image", "JPEG Image"),
        b"\x89PNG\r\n\x1a\n": ("image/png", "image", "PNG Image"),
        b"GIF87a": ("image/gif", "image", "GIF Image"),
        b"GIF89a": ("image/gif", "image", "GIF Image"),
        b"\x1f\x8b": ("application/gzip", "document", "Gzip Compressed Archive"),
        b"SQLite format 3": ("application/x-sqlite3", "database", "SQLite Database"),
        b"regf": ("application/octet-stream", "registry", "Windows Registry Hive"),
        b"\xd4\xc3\xb2\xa1": ("application/vnd.tcpdump.pcap", "network", "PCAP Network Capture"),
        b"\x0a\x0d\x0d\x0a": ("application/x-pcapng", "network", "PCAPNG Network Capture"),
    }

    @staticmethod
    def extract_metadata(file_path: str, original_filename: str) -> Dict[str, Any]:
        """
        Safely extract file metadata, size, timestamps, inert type classification,
        and detects magic byte / file extension mismatches.
        """
        stat_info = os.stat(file_path)
        file_size = stat_info.st_size

        # Forensic timestamps (UTC)
        file_created_at = datetime.fromtimestamp(stat_info.st_ctime, tz=timezone.utc)
        file_modified_at = datetime.fromtimestamp(stat_info.st_mtime, tz=timezone.utc)
        file_accessed_at = datetime.fromtimestamp(stat_info.st_atime, tz=timezone.utc)

        # Extension-based MIME
        guessed_type, _ = mimetypes.guess_type(original_filename)
        mime_type = guessed_type or "application/octet-stream"
        file_type = "binary"
        notes = None

        sig_matched = False
        matched_sig_type = None
        matched_sig_desc = None

        # Inspect inert magic bytes (first 16 bytes only)
        try:
            with open(file_path, "rb") as f:
                header = f.read(16)
                for sig, (sig_mime, s_type, sig_notes) in MetadataService.MAGIC_SIGNATURES.items():
                    if header.startswith(sig):
                        mime_type = sig_mime
                        file_type = s_type
                        notes = sig_notes
                        sig_matched = True
                        matched_sig_type = s_type
                        matched_sig_desc = sig_notes
                        break
        except Exception:
            pass

        # Text/log classification heuristics
        ext = original_filename.lower().split(".")[-1] if "." in original_filename else ""
        if not sig_matched:
            if ext in ["log", "txt", "csv", "json", "xml", "evt", "evtx"]:
                file_type = "log"
                mime_type = "text/plain" if ext in ["log", "txt"] else f"application/{ext}"
            elif ext in ["exe", "dll", "bin", "sys", "scr"]:
                file_type = "binary"
            elif ext in ["pcap", "cap", "pcapng"]:
                file_type = "network"
            elif ext in ["reg", "hiv", "hive"]:
                file_type = "registry"
            elif ext in ["dd", "img", "raw", "e01", "vmdk"]:
                file_type = "disk_image"
            elif ext in ["docx", "xlsx", "pptx", "pdf", "zip", "7z", "tar"]:
                file_type = "document"

        # Forensic Extension vs Magic-Byte Mismatch Detection
        is_type_mismatch = False
        mismatch_details = None

        if sig_matched:
            # Dangerous mismatch: binary masquerading as document, image, or log
            if matched_sig_type == "binary" and ext in ["pdf", "jpg", "jpeg", "png", "txt", "docx", "xlsx", "csv", "log"]:
                is_type_mismatch = True
                mismatch_details = (
                    f"File extension '.{ext}' does not match header signature. "
                    f"Magic bytes indicate {matched_sig_desc}. Potential disguised executable or defense evasion technique."
                )
            elif matched_sig_type == "document" and ext in ["exe", "dll", "sys", "scr"]:
                is_type_mismatch = True
                mismatch_details = (
                    f"File extension '.{ext}' indicates executable, but magic bytes indicate {matched_sig_desc}."
                )

        # Content-level forensic security analysis (safe read of first 64KB)
        threat_indicators = []
        is_suspicious_content = False
        content_summary = []

        if is_type_mismatch:
            threat_indicators.append("type_mismatch")
            is_suspicious_content = True
            content_summary.append(mismatch_details)

        # Check for timestamp inversion (timestomping)
        if file_modified_at < file_created_at:
            threat_indicators.append("timestomping_anomaly")
            is_suspicious_content = True
            content_summary.append("Timestamp inversion observed: Modified date precedes Creation date.")

        try:
            with open(file_path, "rb") as f:
                sample_bytes = f.read(65536)
            
            sample_text = sample_bytes.decode("utf-8", errors="ignore").lower()
            
            script_patterns = [
                ("powershell -enc", "Encoded PowerShell execution command detected"),
                ("invoke-expression", "PowerShell Invoke-Expression execution primitive detected"),
                ("vssadmin delete shadows", "Volume shadow copy deletion command detected (Anti-forensics / Ransomware)"),
                ("wevtutil cl", "Windows event log clearing command detected (Anti-forensics)"),
                ("mimikatz", "Credential harvesting utility signature detected"),
                ("certutil -urlcache", "Certutil file download primitive detected"),
                ("eval(base64_decode", "Obfuscated Base64 script evaluation detected"),
            ]
            for pat, desc in script_patterns:
                if pat in sample_text:
                    threat_indicators.append(pat)
                    is_suspicious_content = True
                    content_summary.append(desc)

            if "private key-----" in sample_text:
                threat_indicators.append("leaked_private_key")
                is_suspicious_content = True
                content_summary.append("Unencrypted Private Cryptographic Key detected in plaintext.")
            
            if "password=" in sample_text or "password = " in sample_text or "passwd=" in sample_text:
                threat_indicators.append("plaintext_password")
                is_suspicious_content = True
                content_summary.append("Plaintext password assignment detected in document.")

            if file_type == "binary" and ext in ["exe", "bin", "dll"]:
                threat_indicators.append("executable_binary")
                is_suspicious_content = True
                content_summary.append(f"Executable binary artifact ({ext.upper()}) detected.")

        except Exception:
            pass

        return {
            "file_size": file_size,
            "mime_type": mime_type,
            "file_type": file_type,
            "file_created_at": file_created_at,
            "file_modified_at": file_modified_at,
            "file_accessed_at": file_accessed_at,
            "notes": notes,
            "is_type_mismatch": is_type_mismatch,
            "mismatch_details": mismatch_details,
            "matched_sig_desc": matched_sig_desc,
            "threat_indicators": threat_indicators,
            "is_suspicious": is_suspicious_content,
            "suspicious_details": "; ".join(content_summary) if content_summary else None
        }
