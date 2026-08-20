from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, Form, File, UploadFile
from starlette.datastructures import UploadFile as StarletteUploadFile
from typing import Optional, List, Any
from datetime import datetime, timezone
import json
import math
import re
import os
import logging

logger = logging.getLogger(__name__)

from pymongo.errors import DuplicateKeyError

from app.db import get_db, to_object_id, is_valid_object_id
from app.utils.auth import get_current_user, require_roles
from app.utils.helpers import serialize_doc, generate_slug, paginate_query, build_pagination, escape_regex, ensure_unique_slug
from app.utils.image_processor import save_uploaded_file
from app.models.content import (
    CreateReviewSchema, ContactSubmitSchema, SubscribeSchema, ValidateCouponSchema
)
from app.models.user import AdminCreateUserSchema, AdminUpdateUserSchema
from app.utils.auth import hash_password



def safe_int(val, default=0):
    """Parse an admin form value as an int without crashing on empty strings
    or junk (cleared fields arrive as ""). Mirrors products.safe_int."""
    try:
        if val is None or str(val).strip() == "":
            return default
        return int(float(str(val)))
    except Exception:
        return default


def safe_float(val, default=0.0):
    """Parse a numeric value defensively — an empty string (cleared admin field)
    or junk must never crash the coupon endpoints with a ValueError."""
    try:
        if val is None or str(val).strip() == "":
            return default
        return float(val)
    except Exception:
        return default


router = APIRouter(prefix="/api", tags=["users"])

# ─── ADMIN USER MANAGEMENT ─────────────────────────────────────────────

@router.get("/admin/users")
async def admin_get_users(
    page: int = 1,
    limit: int = 20,
    role: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    db = get_db()
    query = {}
    if role:
        query["role"] = role
    if search:
        escaped = escape_regex(search)
        query["$or"] = [
            {"name": {"$regex": escaped, "$options": "i"}},
            {"email": {"$regex": escaped, "$options": "i"}},
            {"phone": {"$regex": escaped, "$options": "i"}}
        ]
        
    skip, page_limit, current_page = paginate_query(page, limit)
    total = await db.users.count_documents(query)
    
    cursor = db.users.find(query, {"password": 0}).sort("createdAt", -1).skip(skip).limit(page_limit)
    users = await cursor.to_list(length=page_limit)
    
    return {
        "success": True,
        "data": {"users": serialize_doc(users)},
        "pagination": build_pagination(total, current_page, page_limit)
    }

@router.post("/admin/users", status_code=status.HTTP_201_CREATED)
async def admin_create_user(body: AdminCreateUserSchema, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if body.role == "superadmin" and current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Only superadmins can create superadmins")
        
    db = get_db()
    email_clean = body.email.lower().strip()
    existing = await db.users.find_one({"email": email_clean})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user_doc = {
        "name": body.name.strip(),
        "email": email_clean,
        "phone": body.phone.strip(),
        "password": hash_password(body.password),
        "role": body.role or "customer",
        "isActive": body.isActive if body.isActive is not None else True,
        "addresses": [],
        "wishlist": [],
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    
    # The find_one above is not atomic, and users.email carries a unique index —
    # a double-submit raced past the check and surfaced as a 500. Same guard
    # auth.register already uses.
    try:
        res = await db.users.insert_one(user_doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc["_id"] = res.inserted_id
    ser = serialize_doc(user_doc)
    ser.pop("password", None)
    return {"success": True, "data": {"user": ser}, "message": "User created"}

@router.put("/admin/users/{user_id}")
async def admin_update_user(user_id: str, body: AdminUpdateUserSchema, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if not is_valid_object_id(user_id):
        raise HTTPException(status_code=404, detail="User not found")
        
    db = get_db()
    u_oid = to_object_id(user_id)
    target = await db.users.find_one({"_id": u_oid})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
        
    if body.role == "superadmin" and current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Only superadmins can assign superadmin role")
    if target.get("role") == "superadmin" and current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Only superadmins can modify a superadmin")

    # Self-lockout guards. Nothing stopped an admin from demoting or
    # deactivating their own account, and both take effect on the very next
    # request — get_current_user rejects an inactive user outright. The sole
    # superadmin could lock themselves out of the panel with no way back in
    # short of editing the database by hand. These two checks are also what
    # guarantee at least one superadmin always remains: only a superadmin may
    # demote a superadmin, and now never the last one (themselves).
    is_self = str(target["_id"]) == str(current_user["_id"])
    if is_self and body.role is not None and body.role != target.get("role"):
        raise HTTPException(status_code=400, detail="You cannot change your own role")
    if is_self and body.isActive is False:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

    update_data = {}
    if body.name is not None:
        update_data["name"] = body.name.strip()
    if body.email is not None:
        e_clean = body.email.lower().strip()
        dup = await db.users.find_one({"email": e_clean, "_id": {"$ne": u_oid}})
        if dup:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_data["email"] = e_clean
    if body.phone is not None:
        update_data["phone"] = body.phone.strip()
    if body.role is not None:
        update_data["role"] = body.role
    if body.isActive is not None:
        update_data["isActive"] = body.isActive
    if body.password:
        update_data["password"] = hash_password(body.password)

    update_data["updatedAt"] = datetime.now(timezone.utc)

    updated = await db.users.find_one_and_update({"_id": u_oid}, {"$set": update_data}, return_document=True)
    ser = serialize_doc(updated)
    ser.pop("password", None)
    return {"success": True, "data": {"user": ser}, "message": "User updated"}

@router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if not is_valid_object_id(user_id):
        raise HTTPException(status_code=404, detail="User not found")
        
    db = get_db()
    u_oid = to_object_id(user_id)
    target = await db.users.find_one({"_id": u_oid})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
        
    if target.get("role") == "superadmin" and current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Only superadmins can delete a superadmin")

    # Deleting your own account from the admin panel destroyed the session you
    # were using and, for a lone superadmin, removed the only account able to
    # manage superadmins at all.
    if str(target["_id"]) == str(current_user["_id"]):
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    await db.users.delete_one({"_id": u_oid})
    return {"success": True, "data": {}, "message": "User deleted"}
