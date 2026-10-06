import hashlib
import os
from typing import Tuple, Dict, Any

class HashService:
    CHUNK_SIZE = 65536  # 64 KB chunks for safe streaming calculation

    @staticmethod
    def calculate_hashes(file_path: str) -> Tuple[str, str]:
        """
        Calculate both SHA-256 and MD5 hashes safely using streaming chunks.
        Never loads entire large files into memory.
        """
        sha256 = hashlib.sha256()
        md5 = hashlib.md5()

        with open(file_path, "rb") as f:
            while chunk := f.read(HashService.CHUNK_SIZE):
                sha256.update(chunk)
                md5.update(chunk)

        return sha256.hexdigest(), md5.hexdigest()

    @staticmethod
    def verify_integrity(file_path: str, stored_sha256: str) -> Dict[str, Any]:
        """
        Verify evidence integrity by recalculating hash against recorded hash.
        Returns validation status and detailed report.
        """
        if not os.path.exists(file_path):
            return {
                "verified": False,
                "status": "Missing",
                "expected": stored_sha256,
                "calculated": None,
                "message": f"Evidence file not found on disk at {file_path}"
            }

        calculated_sha256, calculated_md5 = HashService.calculate_hashes(file_path)
        is_intact = (calculated_sha256.lower() == stored_sha256.lower())

        return {
            "verified": is_intact,
            "status": "Verified" if is_intact else "Compromised",
            "expected": stored_sha256,
            "calculated": calculated_sha256,
            "calculated_md5": calculated_md5,
            "message": "Cryptographic SHA-256 hash matches immutable record." if is_intact else "CRITICAL: SHA-256 hash mismatch! Evidence may have been altered or tampered."
        }
