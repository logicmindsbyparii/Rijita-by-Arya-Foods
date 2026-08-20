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


router = APIRouter(prefix="/api", tags=["contacts"])

# ─── CONTACTS ───────────────────────────────────────────────────────────

@router.post("/contacts", status_code=status.HTTP_201_CREATED)
@router.post("/contact", status_code=status.HTTP_201_CREATED)
async def submit_contact(body: ContactSubmitSchema):
    db = get_db()
    contact_doc = {
        "name": body.name.strip(),
        "email": body.email.lower().strip(),
        "phone": body.phone.strip(),
        "subject": body.subject.strip(),
        "message": body.message.strip(),
        "type": body.type or "general",
        "isRead": False,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    res = await db.contacts.insert_one(contact_doc)
    contact_doc["_id"] = res.inserted_id
    return {"success": True, "data": {"contact": serialize_doc(contact_doc)}, "message": "Message sent successfully"}

@router.get("/admin/contacts")
async def get_contacts(
    page: int = 1,
    limit: int = 20,
    type: Optional[str] = None,
    isRead: Optional[str] = None,
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    db = get_db()
    query = {}
    if type:
        query["type"] = type
    if isRead == "true":
        query["isRead"] = True
    elif isRead == "false":
        query["isRead"] = False
        
    skip, page_limit, current_page = paginate_query(page, limit)
    total = await db.contacts.count_documents(query)
    
    cursor = db.contacts.find(query).sort("createdAt", -1).skip(skip).limit(page_limit)
    contacts = await cursor.to_list(length=page_limit)
    
    return {
        "success": True,
        "data": {"contacts": serialize_doc(contacts)},
        "pagination": build_pagination(total, current_page, page_limit)
    }

@router.put("/admin/contacts/{contact_id}/read")
async def mark_contact_read(contact_id: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if not is_valid_object_id(contact_id):
        raise HTTPException(status_code=404, detail="Contact not found")
        
    db = get_db()
    contact = await db.contacts.find_one_and_update(
        {"_id": to_object_id(contact_id)},
        {"$set": {"isRead": True, "updatedAt": datetime.now(timezone.utc)}},
        return_document=True
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"success": True, "data": {"contact": serialize_doc(contact)}, "message": "Marked as read"}

@router.delete("/admin/contacts/{contact_id}")
async def delete_contact(contact_id: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if not is_valid_object_id(contact_id):
        raise HTTPException(status_code=404, detail="Contact not found")
    db = get_db()
    deleted = await db.contacts.find_one_and_delete({"_id": to_object_id(contact_id)})
    if not deleted:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"success": True, "data": {}, "message": "Contact deleted"}

