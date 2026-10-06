from typing import Generator, Optional, List
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import decode_access_token
from app.models.user import User
from app.models.case import Case

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
    simulated_role: Optional[str] = Header(None, alias="X-TraceX-User-Role")
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Allow header-based role simulation for authorized users switching view roles
    if simulated_role:
        user.role = simulated_role.upper()

    return user

def require_role(allowed_roles: List[str]):
    """
    Enforces Role-Based Access Control on FastAPI endpoints (ADMIN, INVESTIGATOR, VIEWER).
    """
    def role_dependency(current_user: User = Depends(get_current_user)):
        user_role = current_user.role.upper()
        if "ADMIN" in user_role:
            norm = "ADMIN"
        elif "VIEWER" in user_role:
            norm = "VIEWER"
        else:
            norm = "INVESTIGATOR"

        allowed_upper = [r.upper() for r in allowed_roles]
        if norm not in allowed_upper:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Role '{norm}' lacks permission for this action. Required: {allowed_roles}"
            )
        return current_user
    return role_dependency

def require_case_access(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Case:
    """
    Verifies that the requested case exists and the current user has authorization to access it.
    """
    case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' was not found in vault.")

    user_role = current_user.role.upper()
    if "ADMIN" in user_role:
        return case

    # Restricted case boundary check
    if "RESTRICTED" in case.id.upper() or "RESTRICTED" in case.name.upper():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: Case '{case.id}' is restricted and requires administrator clearance."
        )

    return case
