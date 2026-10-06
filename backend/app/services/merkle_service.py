import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.evidence import Evidence
from app.models.case import Case

class MerkleService:
    """
    Cryptographic Merkle Tree Engine for Digital Evidence Sets.
    Generates a deterministic single 256-bit hash representing the immutable state
    of all evidence items in an investigation case.
    Any single-bit variation across any evidence file changes the root digest completely.
    """

    GENESIS_EMPTY_ROOT = hashlib.sha256(b"").hexdigest()

    @staticmethod
    def calculate_merkle_root(leaf_hashes: List[str]) -> str:
        """
        Calculates deterministic Merkle Root from a list of SHA-256 leaf digests.
        Hashes are sorted lexicographically to ensure order-independent reproducibility.
        """
        if not leaf_hashes:
            return MerkleService.GENESIS_EMPTY_ROOT

        # Normalize and sort deterministically
        current_level = sorted([h.strip().lower() for h in leaf_hashes if h and len(h.strip()) == 64])

        if not current_level:
            return MerkleService.GENESIS_EMPTY_ROOT

        if len(current_level) == 1:
            return current_level[0]

        while len(current_level) > 1:
            # Duplicate the last hash if odd number of nodes (RFC 6962 / Bitcoin Merkle tree standard)
            if len(current_level) % 2 != 0:
                current_level.append(current_level[-1])

            next_level = []
            for i in range(0, len(current_level), 2):
                combined = current_level[i] + current_level[i + 1]
                parent_hash = hashlib.sha256(combined.encode("utf-8")).hexdigest()
                next_level.append(parent_hash)
            current_level = next_level

        return current_level[0]

    @staticmethod
    def get_case_merkle_root(db: Session, case_id: str) -> Dict[str, Any]:
        """
        Queries all evidence items for a case, computes the Merkle Root,
        and returns verification metadata.
        """
        case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
        actual_id = case.id if case else case_id

        evidence_items = db.query(Evidence).filter(Evidence.case_id == actual_id).all()
        leaf_hashes = [e.sha256_hash for e in evidence_items if e.sha256_hash]

        merkle_root = MerkleService.calculate_merkle_root(leaf_hashes)

        return {
            "case_id": actual_id,
            "case_number": case.case_number if case else None,
            "evidence_count": len(evidence_items),
            "leaf_count": len(leaf_hashes),
            "leaf_hashes": sorted(leaf_hashes),
            "merkle_root": merkle_root,
            "is_valid": len(leaf_hashes) > 0,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    @staticmethod
    def verify_case_integrity(db: Session, case_id: str, expected_merkle_root: Optional[str] = None) -> Dict[str, Any]:
        """
        Recomputes Merkle Root from current evidence files on disk / database,
        and compares with expected or stored state.
        """
        current_data = MerkleService.get_case_merkle_root(db, case_id)
        current_root = current_data["merkle_root"]

        if expected_merkle_root:
            is_match = (current_root.lower() == expected_merkle_root.lower())
        else:
            is_match = True

        return {
            "case_id": current_data["case_id"],
            "evidence_count": current_data["evidence_count"],
            "current_merkle_root": current_root,
            "expected_merkle_root": expected_merkle_root or current_root,
            "is_verified": is_match,
            "status": "VERIFIED" if is_match else "MERKLE_ROOT_MISMATCH",
            "message": "Evidence set Merkle root verified." if is_match else "CRITICAL: Merkle root mismatch! Evidence set has been tampered with or modified."
        }
