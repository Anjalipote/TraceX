from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.user import User

class UserService:
    @staticmethod
    def get_users(db: Session) -> List[Dict[str, Any]]:
        """
        Retrieves all registered users without exposing password hashes.
        """
        users = db.query(User).all()
        result = []
        for u in users:
            result.append({
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "status": getattr(u, "status", "active"),
                "badgeNumber": u.badge_number,
                "lastLogin": u.last_login.isoformat() if getattr(u, "last_login", None) else None,
                "createdAt": u.created_at.isoformat()
            })
        return result

    @staticmethod
    def update_user_role(db: Session, user_id: str, new_role: str) -> Optional[Dict[str, Any]]:
        """
        Updates a user's role (ADMIN, INVESTIGATOR, VIEWER).
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        valid_roles = ["ADMIN", "INVESTIGATOR", "VIEWER"]
        role_upper = new_role.upper()
        if role_upper not in valid_roles:
            raise ValueError(f"Invalid role '{new_role}'. Must be one of: {valid_roles}")

        user.role = role_upper
        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)

        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "status": getattr(user, "status", "active"),
            "badgeNumber": user.badge_number,
            "updatedAt": user.updated_at.isoformat()
        }

    @staticmethod
    def update_user_status(db: Session, user_id: str, new_status: str) -> Optional[Dict[str, Any]]:
        """
        Updates a user's account status (active, suspended).
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        user.status = new_status.lower()
        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)

        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "status": user.status,
            "updatedAt": user.updated_at.isoformat()
        }
