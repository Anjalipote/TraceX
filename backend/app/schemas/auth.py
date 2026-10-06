from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "Forensic Investigator"
    badge_number: Optional[str] = "TX-8492"

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    badge_number: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

Token.model_rebuild()
