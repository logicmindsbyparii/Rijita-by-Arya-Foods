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


router = APIRouter(prefix="/api", tags=["subscribers"])

# ─── SUBSCRIBERS ────────────────────────────────────────────────────────

@router.post("/subscribers/subscribe")
async def subscribe(body: SubscribeSchema):
    email = body.email.lower().strip()
    db = get_db()
    existing = await db.subscribers.find_one({"email": email})
    if existing:
        if not existing.get("isActive", True):
            await db.subscribers.update_one({"_id": existing["_id"]}, {"$set": {"isActive": True}})
            existing["isActive"] = True
            return {"success": True, "data": {"subscriber": serialize_doc(existing)}, "message": "Subscription renewed"}
        raise HTTPException(status_code=400, detail="Email already subscribed")
        
    sub_doc = {
        "email": email,
        "isActive": True,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    # subscribers.email is uniquely indexed and the find_one above is not
    # atomic. This is a public newsletter form, so a double-click really does
    # race — and unhandled it answered the second click with a 500.
    try:
        res = await db.subscribers.insert_one(sub_doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email already subscribed")

    sub_doc["_id"] = res.inserted_id
    return {"success": True, "data": {"subscriber": serialize_doc(sub_doc)}, "message": "Subscribed successfully"}

@router.get("/admin/subscribers")
async def get_subscribers(page: int = 1, limit: int = 20, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    db = get_db()
    query = {}
    skip, page_limit, current_page = paginate_query(page, limit)
    total = await db.subscribers.count_documents(query)
    
    cursor = db.subscribers.find(query).sort("createdAt", -1).skip(skip).limit(page_limit)
    subscribers = await cursor.to_list(length=page_limit)
    
    return {
        "success": True,
        "data": {"subscribers": serialize_doc(subscribers)},
        "pagination": build_pagination(total, current_page, page_limit)
    }

