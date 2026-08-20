import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import Request, HTTPException, Security, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings
from app.db import get_db, to_object_id, is_valid_object_id
from app.utils.helpers import serialize_doc

security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(12)
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def parse_timedelta(time_str: str) -> timedelta:
    unit = time_str[-1].lower()
    val = int(time_str[:-1])
    if unit == 'd':
        return timedelta(days=val)
    elif unit == 'h':
        return timedelta(hours=val)
    elif unit == 'm':
        return timedelta(minutes=val)
    elif unit == 's':
        return timedelta(seconds=val)
    return timedelta(days=7)

def generate_access_token(payload: dict) -> str:
    data = payload.copy()
    expire = datetime.now(timezone.utc) + parse_timedelta(settings.JWT_EXPIRES_IN)
    data.update({"exp": expire})
    return jwt.encode(data, settings.JWT_SECRET, algorithm="HS256")

def generate_refresh_token(payload: dict) -> str:
    data = payload.copy()
    expire = datetime.now(timezone.utc) + parse_timedelta(settings.JWT_REFRESH_EXPIRES_IN)
    data.update({"exp": expire})
    return jwt.encode(data, settings.JWT_REFRESH_SECRET, algorithm="HS256")

def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])

def decode_refresh_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_REFRESH_SECRET, algorithms=["HS256"])

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)) -> dict:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authorized, no token provided")
    
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id = payload.get("id")
        if not user_id or not is_valid_object_id(user_id):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authorized, token invalid")
        
        db = get_db()
        user = await db.users.find_one({"_id": to_object_id(user_id)})
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
        if not user.get("isActive", True):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account deactivated")
        
        user_serialized = serialize_doc(user)
        if isinstance(user_serialized, dict):
            user_serialized.pop("password", None)
            return user_serialized
        return {}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except HTTPException:
        # HTTPException is an Exception, so without this the generic handler
        # below rewrote every specific reason raised inside this try ("User not
        # found", "Account deactivated") into a misleading "token invalid" —
        # leaving a deactivated user staring at an error that suggests logging
        # in again will help, when only an admin can restore their account.
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authorized, token invalid")

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)) -> Optional[dict]:
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("id")
        if not user_id or not is_valid_object_id(user_id):
            return None
        db = get_db()
        user = await db.users.find_one({"_id": to_object_id(user_id)})
        if not user or not user.get("isActive", True):
            return None
        user_serialized = serialize_doc(user)
        if isinstance(user_serialized, dict):
            user_serialized.pop("password", None)
            return user_serialized
        return None
    except Exception:
        return None

def require_roles(allowed_roles: List[str]):
    async def role_checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this action")
        return user
    return role_checker
