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


router = APIRouter(prefix="/api", tags=["coupons"])

# ─── COUPONS ────────────────────────────────────────────────────────────

@router.get("/admin/coupons")
async def admin_get_coupons(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    db = get_db()
    query = {}
    if search:
        escaped = escape_regex(search)
        query["code"] = {"$regex": escaped, "$options": "i"}
        
    now = datetime.now(timezone.utc)
    if status == "active":
        # "Active" must match the same window semantics the public /coupons list,
        # validate_coupon and place_order use: a missing start/expiry means "no
        # window", so a no-date coupon is active. A bare {"$gte": now} comparison
        # would silently hide those coupons from the admin filter.
        query["isActive"] = True
        query["$and"] = [
            {"$or": [{"startsAt": {"$lte": now}}, {"startsAt": None}]},
            {"$or": [{"expiresAt": {"$gte": now}}, {"expiresAt": None}]},
        ]
    elif status == "inactive":
        query["isActive"] = False
    elif status == "expired":
        # A no-expiry coupon is never expired
        query["isActive"] = True
        query["expiresAt"] = {"$lt": now}
        
    skip, page_limit, current_page = paginate_query(page, limit)
    total = await db.coupons.count_documents(query)
    
    cursor = db.coupons.find(query).sort("createdAt", -1).skip(skip).limit(page_limit)
    coupons = await cursor.to_list(length=page_limit)
    
    return {
        "success": True,
        "data": {"coupons": serialize_doc(coupons)},
        "pagination": build_pagination(total, current_page, page_limit)
    }

COUPON_TYPES = ("percentage", "fixed")


def _validate_coupon_type_and_value(c_type: Any, value: float) -> None:
    """Reject coupon definitions the discount maths cannot express safely.

    `type` was stored as whatever string arrived, and the storefront only
    understands "percentage" and "fixed" — anything else silently behaved as a
    flat rupee discount. `value` was unbounded, so a percentage coupon entered
    as 150 (a typo for 15) with no maxDiscount discounted more than the whole
    cart and produced a negative order total. place_order clamps that now, but
    the coupon should never have been storable in the first place.
    """
    if c_type not in COUPON_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Coupon type must be one of: {', '.join(COUPON_TYPES)}",
        )
    if value < 0:
        raise HTTPException(status_code=400, detail="Coupon value cannot be negative")
    if c_type == "percentage" and value > 100:
        raise HTTPException(
            status_code=400, detail="A percentage coupon cannot exceed 100%"
        )


@router.post("/admin/coupons", status_code=status.HTTP_201_CREATED)
async def create_coupon(body: dict, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    db = get_db()
    code = body.get("code", "").upper().strip()
    if not code:
        raise HTTPException(status_code=400, detail="Coupon code required")
        
    existing = await db.coupons.find_one({"code": code})
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")

    c_type = body.get("type", "percentage")
    _validate_coupon_type_and_value(c_type, safe_float(body.get("value")))

    coupon_doc = {
        "code": code,
        "description": body.get("description"),
        "type": c_type,
        "value": safe_float(body.get("value")),
        "minOrderAmount": safe_float(body.get("minOrderAmount")),
        "maxDiscount": safe_float(body.get("maxDiscount"), None),
        "usageLimit": safe_int(body.get("usageLimit"), 100),
        "usedCount": 0,
        # Empty dates mean "always valid" — defaulting to now() would make a
        # no-expiry coupon born expired, and None is what the validation
        # queries (and the public /coupons list) treat as "no window".
        "startsAt": datetime.fromisoformat(str(body.get("startsAt"))) if body.get("startsAt") else None,
        "expiresAt": datetime.fromisoformat(str(body.get("expiresAt"))) if body.get("expiresAt") else None,
        "isActive": body.get("isActive", True),
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    
    res = await db.coupons.insert_one(coupon_doc)
    coupon_doc["_id"] = res.inserted_id
    return {"success": True, "data": {"coupon": serialize_doc(coupon_doc)}, "message": "Coupon created"}

@router.put("/admin/coupons/{coupon_id}")
async def update_coupon(coupon_id: str, body: dict, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if not is_valid_object_id(coupon_id):
        raise HTTPException(status_code=404, detail="Coupon not found")
        
    db = get_db()
    c_oid = to_object_id(coupon_id)
    existing = await db.coupons.find_one({"_id": c_oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Coupon not found")

    # Validate against the merged result: a request may change only the type or
    # only the value, and either alone can make the pair invalid.
    merged_type = body.get("type", existing.get("type", "percentage"))
    merged_value = safe_float(body["value"]) if "value" in body else safe_float(existing.get("value"))
    _validate_coupon_type_and_value(merged_type, merged_value)

    # coupons.code is uniquely indexed. create_coupon checks for a clash but
    # update did not, so renaming one coupon onto another's code raised an
    # uncaught DuplicateKeyError and surfaced as a 500.
    if "code" in body:
        new_code = str(body["code"]).upper().strip()
        if not new_code:
            raise HTTPException(status_code=400, detail="Coupon code required")
        clash = await db.coupons.find_one({"code": new_code, "_id": {"$ne": c_oid}})
        if clash:
            raise HTTPException(status_code=400, detail="Coupon code already exists")

    update_data = {}

    allowed = ['code', 'description', 'type', 'value', 'minOrderAmount', 'maxDiscount', 'usageLimit', 'startsAt', 'expiresAt', 'isActive']
    for k in allowed:
        if k in body:
            val = body[k]
            if k == 'code':
                val = str(val).upper().strip()
            elif k in ['value', 'minOrderAmount']:
                # Defensive parse — a cleared admin field arrives as "" and must
                # not crash with ValueError.
                val = safe_float(val)
            elif k == 'maxDiscount':
                # Empty/None means "no cap", not ₹0
                val = safe_float(val, None)
            elif k == 'usageLimit' and val is not None:
                val = int(val) if str(val).strip() != "" else 100
            elif k in ['startsAt', 'expiresAt']:
                # Empty string means "no window" (None), matching create and
                # the validation queries — an empty date must not 500 or store
                # an instantly-expired now().
                val = datetime.fromisoformat(str(val)) if val else None
            update_data[k] = val

    update_data["updatedAt"] = datetime.now(timezone.utc)
    updated = await db.coupons.find_one_and_update({"_id": c_oid}, {"$set": update_data}, return_document=True)
    if not updated:
        raise HTTPException(status_code=404, detail="Coupon not found")
        
    return {"success": True, "data": {"coupon": serialize_doc(updated)}, "message": "Coupon updated"}

@router.delete("/admin/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if not is_valid_object_id(coupon_id):
        raise HTTPException(status_code=404, detail="Coupon not found")
    db = get_db()
    deleted = await db.coupons.find_one_and_delete({"_id": to_object_id(coupon_id)})
    if not deleted:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return {"success": True, "data": {}, "message": "Coupon deleted"}

@router.get("/coupons")
async def get_active_coupons():
    """Public list of coupons currently valid at checkout.

    Only coupons that are active and within their validity window are returned,
    so storefront marketing (Offers page, banners) can only ever advertise codes
    that will actually work.
    """
    db = get_db()
    now = datetime.now(timezone.utc)
    query = {
        "isActive": True,
        "$and": [
            # Coupon has no start date, or its window has opened
            {"$or": [{"startsAt": {"$lte": now}}, {"startsAt": None}]},
            # Coupon has no expiry, or it has not expired yet
            {"$or": [{"expiresAt": {"$gte": now}}, {"expiresAt": None}]},
        ],
    }
    cursor = db.coupons.find(query).sort("createdAt", -1)
    coupons = await cursor.to_list(length=100)
    return {"success": True, "data": {"coupons": serialize_doc(coupons)}}

@router.post("/coupons/validate")
async def validate_coupon(body: ValidateCouponSchema):
    db = get_db()
    code_clean = body.code.upper().strip()
    now = datetime.now(timezone.utc)
    
    # Match the public /coupons list and place_order: a missing start/expiry
    # means "no window" — a Mongo comparison like {"$gte": now} would silently
    # exclude coupons stored with None dates (advertised but unusable).
    coupon = await db.coupons.find_one({
        "code": code_clean,
        "isActive": True,
        "$and": [
            {"$or": [{"startsAt": {"$lte": now}}, {"startsAt": None}]},
            {"$or": [{"expiresAt": {"$gte": now}}, {"expiresAt": None}]},
        ],
    })
    
    if not coupon:
        raise HTTPException(status_code=400, detail="Invalid or expired coupon")
        
    # usageLimit 0 means "no cap" — the admin UI treats 0 as unlimited
    # (mirroring maxDiscount), so only a positive limit is enforced.
    if coupon.get("usageLimit") and coupon.get("usedCount", 0) >= coupon["usageLimit"]:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
        
    if body.subtotal < coupon.get("minOrderAmount", 0):
        raise HTTPException(status_code=400, detail=f"Minimum order: ₹{coupon.get('minOrderAmount')}")
        
    if coupon.get("type") == "percentage":
        calc = body.subtotal * (float(coupon.get("value", 0)) / 100.0)
        max_disc = coupon.get("maxDiscount")
        discount = min(calc, float(max_disc)) if max_disc else calc
    else:
        discount = min(float(coupon.get("value", 0)), body.subtotal)

    # Clamp to the cart value, exactly as place_order does — the two must agree
    # or the discount previewed at checkout is not the one charged.
    discount = max(0.0, min(discount, body.subtotal))

    # Half-up rounding, matching the checkout preview (Math.round) and
    # place_order — banker's round() here would show a different discount
    # than the one actually applied to the order.
    discount = int(math.floor(discount + 0.5))

    return {"success": True, "data": {"coupon": serialize_doc(coupon), "discount": discount}, "message": "Coupon valid"}

