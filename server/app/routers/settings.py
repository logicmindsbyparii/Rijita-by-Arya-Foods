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


router = APIRouter(prefix="/api", tags=["settings"])

# ─── SITE SETTINGS ──────────────────────────────────────────────────────

@router.get("/settings")
@router.get("/admin/settings")
async def get_site_settings():
    db = get_db()
    settings = await db.site_settings.find_one()
    if not settings:
        settings_doc = {
            "siteName": "RIJITA by Arya Foods",
            "tagline": "Pure & Authentic Food Products",
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }
        res = await db.site_settings.insert_one(settings_doc)
        settings_doc["_id"] = res.inserted_id
        settings = settings_doc
    return {"success": True, "data": {"settings": serialize_doc(settings)}}

@router.put("/admin/settings")
async def update_site_settings(
    request: Request,
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    form_data = await request.form()
    db = get_db()
    
    json_fields = ['socialMedia', 'footer', 'shipping', 'gst', 'seo', 'whatsapp', 'payment', 'announcement', 'banners', 'story', 'stats', 'about']
    update_data = {}
    
    for key, value in form_data.items():
        # File fields (logo, favicon, bannerImage_*, ...) arrive as starlette
        # UploadFile objects — never put them into update_data, they are
        # processed separately below and would crash the Mongo encode.
        if value is None or isinstance(value, StarletteUploadFile):
            continue
        if key in json_fields and isinstance(value, str):
            try:
                update_data[key] = json.loads(value)
            except Exception:
                update_data[key] = value
        else:
            update_data[key] = value

    # Shipping/GST values of 0 (or junk) mean "unset" — sanitize to the real
    # defaults. A 0 threshold/charge used to be persisted by the admin form's
    # empty-field defaults, silently making every order free and GST 0%.
    shipping_info = update_data.get("shipping")
    if isinstance(shipping_info, dict):
        try:
            threshold = float(shipping_info.get("freeShippingThreshold") or 0)
        except (TypeError, ValueError):
            threshold = 0
        if threshold <= 0:
            shipping_info["freeShippingThreshold"] = 499
        try:
            charge = float(shipping_info.get("standardDeliveryCharge") or 0)
        except (TypeError, ValueError):
            charge = 0
        if charge <= 0:
            shipping_info["standardDeliveryCharge"] = 49
    gst_info = update_data.get("gst")
    if isinstance(gst_info, dict):
        try:
            rate = float(gst_info.get("rate") or 0)
        except (TypeError, ValueError):
            rate = 0
        if rate <= 0:
            gst_info["rate"] = 5

    # Shiprocket package config — clamp negatives to 0 (0 means "use the .env
    # default" to get_shiprocket_config, so a stray -5 must never reach the
    # courier payload) and normalize the pickup pincode to plain digits.
    shiprocket_info = shipping_info.get("shiprocket") if isinstance(shipping_info, dict) else None
    if isinstance(shiprocket_info, dict):
        for dim in ("length", "breadth", "height"):
            try:
                val = float(shiprocket_info.get(dim) or 0)
            except (TypeError, ValueError):
                val = 0
            shiprocket_info[dim] = max(0.0, val)
        try:
            pkg = float(shiprocket_info.get("packagingWeight") or 0)
        except (TypeError, ValueError):
            pkg = 0
        shiprocket_info["packagingWeight"] = max(0.0, pkg)
        pincode = "".join(ch for ch in str(shiprocket_info.get("pickupPincode") or "") if ch.isdigit())[:6]
        shiprocket_info["pickupPincode"] = pincode

    # File uploads for settings — request.form() yields starlette UploadFile
    # objects, NOT fastapi.UploadFile (they are distinct classes in this
    # stack), so the isinstance check must use the starlette class or every
    # file field is silently dropped and the raw UploadFile object leaks into
    # the Mongo update, failing with "cannot encode object: UploadFile".
    files = {}
    for key, val in form_data.items():
        if isinstance(val, StarletteUploadFile) and val.filename:
            files[key] = val

    if "logo" in files:
        saved_logo = await save_uploaded_file(files["logo"], sub_dir="banners")
        update_data["logo"] = saved_logo
        try:
            import shutil
            from app.utils.image_processor import UPLOADS_BASE_DIR
            filename = os.path.basename(saved_logo)
            full_src = UPLOADS_BASE_DIR / "banners" / filename
            full_dst = UPLOADS_BASE_DIR / "logo.png"
            if full_src.exists():
                shutil.copyfile(full_src, full_dst)
                try:
                    from pathlib import Path
                    client_dst = Path(__file__).parent.parent.parent.parent / "client" / "public" / "logo.png"
                    if client_dst.parent.exists():
                        shutil.copyfile(full_src, client_dst)
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"Failed to sync logo.png: {e}")
    if "favicon" in files:
        update_data["favicon"] = await save_uploaded_file(files["favicon"], sub_dir="banners")
    if "storyImage" in files:
        update_data["storyImage"] = await save_uploaded_file(files["storyImage"], sub_dir="banners")
    if "heroImage" in files:
        update_data["heroImage"] = await save_uploaded_file(files["heroImage"], sub_dir="banners")
    if "founderImage" in files:
        update_data["founderImage"] = await save_uploaded_file(files["founderImage"], sub_dir="banners")

    # Banner image uploads (e.g., bannerImage_0, bannerImage_1)
    if "banners" in update_data and isinstance(update_data["banners"], list):
        for idx, banner in enumerate(update_data["banners"]):
            b_key = f"bannerImage_{idx}"
            if b_key in files:
                banner["image"] = await save_uploaded_file(files[b_key], sub_dir="banners")

    if form_data.get("removeLogo") == "true":
        update_data["logo"] = ""
    if form_data.get("removeFavicon") == "true":
        update_data["favicon"] = ""
    if form_data.get("removeStoryImage") == "true":
        update_data["storyImage"] = ""
    if form_data.get("removeHeroImage") == "true":
        update_data["heroImage"] = ""
    if form_data.get("removeFounderImage") == "true":
        update_data["founderImage"] = ""

    update_data["updatedAt"] = datetime.now(timezone.utc)

    settings = await db.site_settings.find_one_and_update(
        {},
        {"$set": update_data},
        upsert=True,
        return_document=True
    )
    return {"success": True, "data": {"settings": serialize_doc(settings)}, "message": "Settings updated"}

