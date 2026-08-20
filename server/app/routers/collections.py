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


router = APIRouter(prefix="/api", tags=["collections"])

# ─── COLLECTIONS ────────────────────────────────────────────────────────

@router.get("/collections")
async def get_collections():
    db = get_db()
    cursor = db.collections.find({"isActive": True})
    collections_raw = await cursor.to_list(length=100)
    
    collections = []
    for c in collections_raw:
        p_ids = [to_object_id(str(pid)) for pid in c.get("products", []) if is_valid_object_id(str(pid))]
        if p_ids:
            p_cursor = db.products.find({"_id": {"$in": p_ids}}, {"name": 1, "slug": 1, "images": 1, "variants": 1})
            c["products"] = await p_cursor.to_list(length=100)
        else:
            c["products"] = []
        collections.append(serialize_doc(c))
        
    return {"success": True, "data": {"collections": collections}}

@router.get("/collections/slug/{slug}")
async def get_collection_by_slug(slug: str):
    db = get_db()
    collection = await db.collections.find_one({"slug": slug, "isActive": True})
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
        
    p_ids = [to_object_id(str(pid)) for pid in collection.get("products", []) if is_valid_object_id(str(pid))]
    if p_ids:
        p_cursor = db.products.find({"_id": {"$in": p_ids}}, {"name": 1, "slug": 1, "images": 1, "variants": 1, "category": 1, "averageRating": 1})
        collection["products"] = await p_cursor.to_list(length=100)
    else:
        collection["products"] = []
        
    return {"success": True, "data": {"collection": serialize_doc(collection)}}

@router.get("/admin/collections")
async def admin_get_collections(current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    db = get_db()
    cursor = db.collections.find()
    collections_raw = await cursor.to_list(length=100)
    
    collections = []
    for c in collections_raw:
        p_ids = [to_object_id(str(pid)) for pid in c.get("products", []) if is_valid_object_id(str(pid))]
        if p_ids:
            p_cursor = db.products.find({"_id": {"$in": p_ids}}, {"name": 1, "slug": 1})
            c["products"] = await p_cursor.to_list(length=100)
        else:
            c["products"] = []
        collections.append(serialize_doc(c))
        
    return {"success": True, "data": {"collections": collections}}

@router.post("/admin/collections", status_code=status.HTTP_201_CREATED)
async def create_collection(
    request: Request,
    image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    form_data = await request.form()
    db = get_db()
    
    name_raw = form_data.get("name")
    if not name_raw:
        raise HTTPException(status_code=400, detail="Name is required")
        
    name = str(name_raw)
    slug_val = form_data.get("slug")
    slug = generate_slug(slug_val) if slug_val else generate_slug(name)
    slug = await ensure_unique_slug(db.collections, slug, fallback=name)
    
    img_url = None
    if image:
        img_url = await save_uploaded_file(image, sub_dir="gallery")
    elif form_data.get("image"):
        img_url = str(form_data.get("image"))

    prods_val = form_data.get("products")
    if isinstance(prods_val, str):
        try:
            prods = json.loads(prods_val)
        except Exception:
            prods = [p.strip() for p in prods_val.split(",") if p.strip()]
    elif isinstance(prods_val, list):
        prods = prods_val
    else:
        prods = []

    prod_oids = [to_object_id(pid) for pid in prods if is_valid_object_id(pid)]

    collection_doc = {
        "name": name.strip(),
        "slug": slug,
        "description": form_data.get("description"),
        "image": img_url,
        "products": prod_oids,
        "isActive": form_data.get("isActive") != "false",
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    
    res = await db.collections.insert_one(collection_doc)
    collection_doc["_id"] = res.inserted_id
    return {"success": True, "data": {"collection": serialize_doc(collection_doc)}, "message": "Collection created"}

@router.put("/admin/collections/{collection_id}")
async def update_collection(
    collection_id: str,
    request: Request,
    image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    if not is_valid_object_id(collection_id):
        raise HTTPException(status_code=404, detail="Collection not found")
        
    db = get_db()
    coll = await db.collections.find_one({"_id": to_object_id(collection_id)})
    if not coll:
        raise HTTPException(status_code=404, detail="Collection not found")
        
    form_data = await request.form()
    update_data = {}
    
    if "name" in form_data:
        update_data["name"] = str(form_data.get("name") or "").strip()
    if "slug" in form_data:
        update_data["slug"] = await ensure_unique_slug(db.collections, generate_slug(form_data.get("slug")), fallback=str(form_data.get("name") or "collection"), exclude_id=coll["_id"])
    elif "name" in update_data and not update_data.get("slug"):
        update_data["slug"] = await ensure_unique_slug(db.collections, generate_slug(update_data["name"]), fallback=update_data["name"], exclude_id=coll["_id"])

    if "description" in form_data:
        update_data["description"] = form_data.get("description")
    if "isActive" in form_data:
        update_data["isActive"] = form_data.get("isActive") == "true"

    if "products" in form_data:
        prods_val = form_data.get("products")
        if isinstance(prods_val, str):
            try:
                prods = json.loads(prods_val)
            except Exception:
                prods = [p.strip() for p in prods_val.split(",") if p.strip()]
        elif isinstance(prods_val, list):
            prods = prods_val
        else:
            prods = []
        update_data["products"] = [to_object_id(pid) for pid in prods if is_valid_object_id(pid)]

    if image:
        update_data["image"] = await save_uploaded_file(image, sub_dir="gallery")

    update_data["updatedAt"] = datetime.now(timezone.utc)

    updated_coll = await db.collections.find_one_and_update(
        {"_id": coll["_id"]},
        {"$set": update_data},
        return_document=True
    )
    return {"success": True, "data": {"collection": serialize_doc(updated_coll)}, "message": "Collection updated"}

@router.delete("/admin/collections/{collection_id}")
async def delete_collection(collection_id: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if not is_valid_object_id(collection_id):
        raise HTTPException(status_code=404, detail="Collection not found")
    db = get_db()
    deleted = await db.collections.find_one_and_delete({"_id": to_object_id(collection_id)})
    if not deleted:
        raise HTTPException(status_code=404, detail="Collection not found")
    return {"success": True, "data": {}, "message": "Collection deleted"}

