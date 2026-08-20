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


router = APIRouter(prefix="/api", tags=["blogs"])

# ─── BLOGS ─────────────────────────────────────────────────────────────

@router.get("/blogs")
async def get_blogs(page: int = 1, limit: int = 9, category: Optional[str] = None, tag: Optional[str] = None):
    db = get_db()
    query: dict[str, Any] = {"isPublished": True}
    if category:
        query["category"] = category
    if tag:
        query["tags"] = tag
        
    skip, page_limit, current_page = paginate_query(page, limit)
    total = await db.blogs.count_documents(query)
    
    cursor = db.blogs.find(query).sort("publishedAt", -1).skip(skip).limit(page_limit)
    blogs = await cursor.to_list(length=page_limit)
    
    return {
        "success": True,
        "data": {"blogs": serialize_doc(blogs)},
        "pagination": build_pagination(total, current_page, page_limit)
    }

@router.get("/blogs/slug/{slug}")
async def get_blog_by_slug(slug: str):
    db = get_db()
    blog = await db.blogs.find_one({"slug": slug, "isPublished": True})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    return {"success": True, "data": {"blog": serialize_doc(blog)}}

@router.get("/admin/blogs")
async def admin_get_blogs(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    db = get_db()
    query = {}
    if status == "published":
        query["isPublished"] = True
    elif status == "draft":
        query["isPublished"] = False
        
    if search:
        escaped = escape_regex(search)
        query["$or"] = [
            {"title": {"$regex": escaped, "$options": "i"}},
            {"author": {"$regex": escaped, "$options": "i"}}
        ]
        
    skip, page_limit, current_page = paginate_query(page, limit)
    total = await db.blogs.count_documents(query)
    
    cursor = db.blogs.find(query).sort("createdAt", -1).skip(skip).limit(page_limit)
    blogs = await cursor.to_list(length=page_limit)
    
    return {
        "success": True,
        "data": {"blogs": serialize_doc(blogs)},
        "pagination": build_pagination(total, current_page, page_limit)
    }

@router.post("/admin/blogs", status_code=status.HTTP_201_CREATED)
async def create_blog(
    request: Request,
    featuredImage: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    form_data = await request.form()
    db = get_db()
    
    title_raw = form_data.get("title")
    content_raw = form_data.get("content")
    author_raw = form_data.get("author")
    
    if not title_raw or not content_raw:
        raise HTTPException(status_code=400, detail="Title and content are required")
        
    title = str(title_raw)
    content = str(content_raw)
    author = str(author_raw) if author_raw else "Admin"

    slug_val = form_data.get("slug")
    slug = generate_slug(slug_val) if slug_val else generate_slug(title)
    slug = await ensure_unique_slug(db.blogs, slug, fallback=title)
    
    tags_val = form_data.get("tags")
    if isinstance(tags_val, str):
        try:
            tags = json.loads(tags_val)
        except Exception:
            tags = [t.strip() for t in tags_val.split(",") if t.strip()]
    elif isinstance(tags_val, list):
        tags = tags_val
    else:
        tags = []
        
    img_file = featuredImage or image
    img_url = None
    if img_file and img_file.filename:
        img_url = await save_uploaded_file(img_file, sub_dir="blogs")
    elif form_data.get("featuredImage") and isinstance(form_data.get("featuredImage"), str):
        img_url = str(form_data.get("featuredImage"))
    elif form_data.get("image") and isinstance(form_data.get("image"), str):
        img_url = str(form_data.get("image"))

    is_pub = form_data.get("isPublished") == "true"
    pub_at = datetime.now(timezone.utc) if is_pub else None

    blog_doc = {
        "title": title.strip(),
        "slug": slug,
        "content": content,
        "excerpt": form_data.get("excerpt"),
        "author": author,
        "tags": tags,
        "category": form_data.get("category"),
        "featuredImage": img_url,
        "isPublished": is_pub,
        "publishedAt": pub_at,
        "metaTitle": form_data.get("metaTitle"),
        "metaDescription": form_data.get("metaDescription"),
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    
    res = await db.blogs.insert_one(blog_doc)
    blog_doc["_id"] = res.inserted_id
    return {"success": True, "data": {"blog": serialize_doc(blog_doc)}, "message": "Blog created"}

@router.put("/admin/blogs/{blog_id}")
async def update_blog(
    blog_id: str,
    request: Request,
    featuredImage: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    if not is_valid_object_id(blog_id):
        raise HTTPException(status_code=404, detail="Blog not found")
        
    db = get_db()
    blog = await db.blogs.find_one({"_id": to_object_id(blog_id)})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
        
    form_data = await request.form()
    update_data = {}
    
    allowed = ['title', 'slug', 'content', 'excerpt', 'author', 'tags', 'category', 'isPublished', 'metaTitle', 'metaDescription']
    for k in allowed:
        if k in form_data:
            val = form_data.get(k)
            if k == 'tags' and isinstance(val, str):
                try:
                    val = json.loads(val)
                except Exception:
                    val = [t.strip() for t in val.split(",") if t.strip()]
            update_data[k] = val

    if "title" in update_data and not update_data.get("slug"):
        update_data["slug"] = await ensure_unique_slug(db.blogs, generate_slug(update_data["title"]), fallback=update_data["title"], exclude_id=blog["_id"])

    if "isPublished" in form_data:
        is_pub = form_data.get("isPublished") == "true"
        update_data["isPublished"] = is_pub
        if is_pub and not blog.get("publishedAt"):
            update_data["publishedAt"] = datetime.now(timezone.utc)

    img_file = featuredImage or image
    if img_file and img_file.filename:
        update_data["featuredImage"] = await save_uploaded_file(img_file, sub_dir="blogs")
    elif "featuredImage" in form_data and isinstance(form_data.get("featuredImage"), str):
        update_data["featuredImage"] = str(form_data.get("featuredImage"))
    elif "image" in form_data and isinstance(form_data.get("image"), str):
        update_data["featuredImage"] = str(form_data.get("image"))

    update_data["updatedAt"] = datetime.now(timezone.utc)

    updated_blog = await db.blogs.find_one_and_update(
        {"_id": blog["_id"]},
        {"$set": update_data},
        return_document=True
    )
    return {"success": True, "data": {"blog": serialize_doc(updated_blog)}, "message": "Blog updated"}

@router.delete("/admin/blogs/{blog_id}")
async def delete_blog(blog_id: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if not is_valid_object_id(blog_id):
        raise HTTPException(status_code=404, detail="Blog not found")
    db = get_db()
    deleted = await db.blogs.find_one_and_delete({"_id": to_object_id(blog_id)})
    if not deleted:
        raise HTTPException(status_code=404, detail="Blog not found")
    return {"success": True, "data": {}, "message": "Blog deleted"}

