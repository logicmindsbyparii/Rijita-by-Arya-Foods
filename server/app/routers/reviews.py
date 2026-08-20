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


router = APIRouter(prefix="/api", tags=["reviews"])

# ─── REVIEWS ────────────────────────────────────────────────────────────

async def update_product_review_stats(product_id: Any):
    db = get_db()
    p_oid = to_object_id(str(product_id))
    pipeline = [
        {"$match": {"product": p_oid, "isApproved": True}},
        {"$group": {"_id": "$product", "averageRating": {"$avg": "$rating"}, "count": {"$sum": 1}}}
    ]
    res = await db.reviews.aggregate(pipeline).to_list(length=1)
    if res:
        avg = round(res[0]["averageRating"], 1)
        cnt = res[0]["count"]
        await db.products.update_one({"_id": p_oid}, {"$set": {"averageRating": avg, "reviewCount": cnt}})
    else:
        await db.products.update_one({"_id": p_oid}, {"$set": {"averageRating": 0, "reviewCount": 0}})

@router.get("/reviews/latest")
async def get_latest_reviews(limit: int = 8):
    db = get_db()

    # This endpoint is public and feeds the homepage testimonial strip. `limit`
    # was passed straight to Mongo unbounded, and the loop below used to issue a
    # separate find_one per review — so `?limit=100000` meant loading 100k
    # documents *and* firing 100k product queries from a single unauthenticated
    # request. Cap it, then resolve every product name in one $in query.
    limit = max(1, min(50, limit))

    query = {"isApproved": True}
    cursor = db.reviews.find(query).sort("createdAt", -1).limit(limit)
    reviews_raw = await cursor.to_list(length=limit)

    product_ids = {
        to_object_id(str(r["product"]))
        for r in reviews_raw
        if r.get("product") and is_valid_object_id(str(r["product"]))
    }
    names = {}
    if product_ids:
        async for p in db.products.find({"_id": {"$in": list(product_ids)}}, {"name": 1}):
            names[str(p["_id"])] = p.get("name")

    reviews = []
    for r in reviews_raw:
        if r.get("product"):
            r["productName"] = names.get(str(r["product"]))
        reviews.append(serialize_doc(r))

    return {"success": True, "data": {"reviews": reviews}}

@router.get("/reviews/product/{product_id}")
async def get_product_reviews(product_id: str, page: int = 1, limit: int = 10):
    if not is_valid_object_id(product_id):
        raise HTTPException(status_code=404, detail="Product not found")
        
    db = get_db()
    query = {"product": to_object_id(product_id), "isApproved": True}
    skip, page_limit, current_page = paginate_query(page, limit)
    total = await db.reviews.count_documents(query)
    
    cursor = db.reviews.find(query).sort("createdAt", -1).skip(skip).limit(page_limit)
    reviews = await cursor.to_list(length=page_limit)
    
    return {
        "success": True,
        "data": {"reviews": serialize_doc(reviews)},
        "pagination": build_pagination(total, current_page, page_limit)
    }

@router.post("/reviews", status_code=status.HTTP_201_CREATED)
async def create_review(body: CreateReviewSchema, current_user: dict = Depends(get_current_user)):
    if not is_valid_object_id(body.productId):
        raise HTTPException(status_code=404, detail="Product not found")
        
    db = get_db()
    p_oid = to_object_id(body.productId)
    u_oid = to_object_id(current_user["_id"])
    
    product = await db.products.find_one({"_id": p_oid})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    existing = await db.reviews.find_one({"product": p_oid, "user": u_oid})
    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this product")
        
    review_doc = {
        "product": p_oid,
        "user": u_oid,
        "userName": current_user.get("name", "Anonymous"),
        "rating": body.rating,
        "title": body.title,
        "comment": body.comment,
        "isApproved": False,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    
    res = await db.reviews.insert_one(review_doc)
    review_doc["_id"] = res.inserted_id
    await update_product_review_stats(p_oid)
    
    return {"success": True, "data": {"review": serialize_doc(review_doc)}, "message": "Review submitted. Awaiting approval."}

@router.get("/admin/reviews")
async def admin_get_reviews(
    page: int = 1,
    limit: int = 20,
    isApproved: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    db = get_db()
    query = {}
    if isApproved == "true":
        query["isApproved"] = True
    elif isApproved == "false":
        query["isApproved"] = False
        
    if search:
        escaped = escape_regex(search)
        query["$or"] = [
            {"userName": {"$regex": escaped, "$options": "i"}},
            {"comment": {"$regex": escaped, "$options": "i"}}
        ]
        
    skip, page_limit, current_page = paginate_query(page, limit)
    total = await db.reviews.count_documents(query)
    
    cursor = db.reviews.find(query).sort("createdAt", -1).skip(skip).limit(page_limit)
    reviews_raw = await cursor.to_list(length=page_limit)
    
    # Resolve products and users in two batched queries rather than two per row.
    # A default page of 20 reviews used to cost 40 extra round trips to Atlas,
    # which is what made this page visibly slow to load.
    product_ids = {to_object_id(str(r["product"])) for r in reviews_raw
                   if r.get("product") and is_valid_object_id(str(r["product"]))}
    user_ids = {to_object_id(str(r["user"])) for r in reviews_raw
                if r.get("user") and is_valid_object_id(str(r["user"]))}

    products_by_id = {}
    if product_ids:
        async for p in db.products.find({"_id": {"$in": list(product_ids)}}, {"name": 1, "slug": 1}):
            products_by_id[str(p["_id"])] = {"_id": str(p["_id"]), "name": p.get("name"), "slug": p.get("slug")}

    users_by_id = {}
    if user_ids:
        async for u in db.users.find({"_id": {"$in": list(user_ids)}}, {"name": 1, "email": 1}):
            users_by_id[str(u["_id"])] = {"_id": str(u["_id"]), "name": u.get("name"), "email": u.get("email")}

    reviews = []
    for r in reviews_raw:
        if r.get("product"):
            r["product"] = products_by_id.get(str(r["product"]))
        if r.get("user"):
            r["user"] = users_by_id.get(str(r["user"]))
        reviews.append(serialize_doc(r))
        
    return {
        "success": True,
        "data": {"reviews": reviews},
        "pagination": build_pagination(total, current_page, page_limit)
    }

@router.put("/admin/reviews/{review_id}/approve")
async def approve_review(review_id: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if not is_valid_object_id(review_id):
        raise HTTPException(status_code=404, detail="Review not found")
        
    db = get_db()
    review = await db.reviews.find_one_and_update(
        {"_id": to_object_id(review_id)},
        {"$set": {"isApproved": True, "updatedAt": datetime.now(timezone.utc)}},
        return_document=True
    )
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
        
    await update_product_review_stats(review["product"])
    return {"success": True, "data": {"review": serialize_doc(review)}, "message": "Review approved"}

@router.delete("/admin/reviews/{review_id}")
async def delete_review(review_id: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if not is_valid_object_id(review_id):
        raise HTTPException(status_code=404, detail="Review not found")
        
    db = get_db()
    review = await db.reviews.find_one_and_delete({"_id": to_object_id(review_id)})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
        
    await update_product_review_stats(review["product"])
    return {"success": True, "data": {}, "message": "Review deleted"}

