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


router = APIRouter(prefix="/api", tags=["recipes"])

# ─── RECIPES ────────────────────────────────────────────────────────────

@router.get("/recipes")
async def get_recipes(page: int = 1, limit: int = 12, difficulty: Optional[str] = None):
    db = get_db()
    query: dict[str, Any] = {"isPublished": True}
    if difficulty:
        query["difficulty"] = difficulty
        
    skip, page_limit, current_page = paginate_query(page, limit)
    total = await db.recipes.count_documents(query)
    
    cursor = db.recipes.find(query).sort("createdAt", -1).skip(skip).limit(page_limit)
    recipes_raw = await cursor.to_list(length=page_limit)
    
    recipes = []
    for r in recipes_raw:
        prod_ids = [to_object_id(str(pid)) for pid in r.get("products", []) if is_valid_object_id(str(pid))]
        if prod_ids:
            p_cursor = db.products.find({"_id": {"$in": prod_ids}}, {"name": 1, "slug": 1, "images": 1})
            r["products"] = await p_cursor.to_list(length=100)
        else:
            r["products"] = []
        recipes.append(serialize_doc(r))
        
    return {
        "success": True,
        "data": {"recipes": recipes},
        "pagination": build_pagination(total, current_page, page_limit)
    }

@router.get("/recipes/slug/{slug}")
async def get_recipe_by_slug(slug: str):
    db = get_db()
    recipe = await db.recipes.find_one({"slug": slug, "isPublished": True})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
        
    prod_ids = [to_object_id(str(pid)) for pid in recipe.get("products", []) if is_valid_object_id(str(pid))]
    if prod_ids:
        p_cursor = db.products.find({"_id": {"$in": prod_ids}}, {"name": 1, "slug": 1, "images": 1, "variants": 1})
        recipe["products"] = await p_cursor.to_list(length=100)
    else:
        recipe["products"] = []
        
    return {"success": True, "data": {"recipe": serialize_doc(recipe)}}

@router.get("/admin/recipes")
async def admin_get_recipes(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    difficulty: Optional[str] = None,
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    db = get_db()
    query = {}
    if difficulty:
        query["difficulty"] = difficulty
    if search:
        escaped = escape_regex(search)
        query["$or"] = [
            {"title": {"$regex": escaped, "$options": "i"}},
            {"description": {"$regex": escaped, "$options": "i"}}
        ]
        
    skip, page_limit, current_page = paginate_query(page, limit)
    total = await db.recipes.count_documents(query)
    
    cursor = db.recipes.find(query).sort("createdAt", -1).skip(skip).limit(page_limit)
    recipes = await cursor.to_list(length=page_limit)
    
    return {
        "success": True,
        "data": {"recipes": serialize_doc(recipes)},
        "pagination": build_pagination(total, current_page, page_limit)
    }

@router.post("/admin/recipes", status_code=status.HTTP_201_CREATED)
async def create_recipe(
    request: Request,
    featuredImage: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    form_data = await request.form()
    db = get_db()
    
    title_raw = form_data.get("title")
    desc_raw = form_data.get("description")
    
    if not title_raw or not desc_raw:
        raise HTTPException(status_code=400, detail="Title and description are required")
        
    title = str(title_raw)
    description = str(desc_raw)

    slug_val = form_data.get("slug")
    slug = generate_slug(slug_val) if slug_val else generate_slug(title)
    slug = await ensure_unique_slug(db.recipes, slug, fallback=title)
    
    def parse_array_field(val):
        if isinstance(val, str):
            try:
                return json.loads(val)
            except Exception:
                return [x.strip() for x in val.split("\n") if x.strip()]
        if isinstance(val, list):
            return val
        return []

    img_file = featuredImage or image
    img_url = None
    if img_file and img_file.filename:
        img_url = await save_uploaded_file(img_file, sub_dir="recipes")

    prod_ids = [to_object_id(pid) for pid in parse_array_field(form_data.get("products")) if is_valid_object_id(pid)]

    prep_val = form_data.get("prepTime", 0)
    cook_val = form_data.get("cookTime", 0)
    servings_val = form_data.get("servings", 1)

    recipe_doc = {
        "title": title.strip(),
        "slug": slug,
        "description": description,
        "ingredients": parse_array_field(form_data.get("ingredients")),
        "instructions": parse_array_field(form_data.get("instructions")),
        "prepTime": safe_int(prep_val),
        "cookTime": safe_int(cook_val),
        "servings": safe_int(servings_val, 1),
        "difficulty": form_data.get("difficulty") or "Medium",
        "featuredImage": img_url,
        "products": prod_ids,
        "tags": parse_array_field(form_data.get("tags")),
        "isPublished": form_data.get("isPublished") == "true",
        "metaTitle": form_data.get("metaTitle"),
        "metaDescription": form_data.get("metaDescription"),
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    
    res = await db.recipes.insert_one(recipe_doc)
    recipe_doc["_id"] = res.inserted_id
    return {"success": True, "data": {"recipe": serialize_doc(recipe_doc)}, "message": "Recipe created"}

@router.put("/admin/recipes/{recipe_id}")
async def update_recipe(
    recipe_id: str,
    request: Request,
    featuredImage: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    if not is_valid_object_id(recipe_id):
        raise HTTPException(status_code=404, detail="Recipe not found")
        
    db = get_db()
    recipe = await db.recipes.find_one({"_id": to_object_id(recipe_id)})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
        
    form_data = await request.form()
    update_data = {}
    
    def parse_array_field(val):
        if isinstance(val, str):
            try:
                return json.loads(val)
            except Exception:
                return [x.strip() for x in val.split("\n") if x.strip()]
        return val if isinstance(val, list) else []

    for k in ['title', 'slug', 'description', 'difficulty', 'metaTitle', 'metaDescription']:
        if k in form_data:
            update_data[k] = form_data.get(k)

    for k in ['prepTime', 'cookTime', 'servings']:
        if k in form_data:
            update_data[k] = safe_int(form_data.get(k))
            
    if "ingredients" in form_data:
        update_data["ingredients"] = parse_array_field(form_data.get("ingredients"))
    if "instructions" in form_data:
        update_data["instructions"] = parse_array_field(form_data.get("instructions"))
    if "tags" in form_data:
        update_data["tags"] = parse_array_field(form_data.get("tags"))
    if "products" in form_data:
        update_data["products"] = [to_object_id(pid) for pid in parse_array_field(form_data.get("products")) if is_valid_object_id(pid)]

    if "title" in update_data and not update_data.get("slug"):
        update_data["slug"] = await ensure_unique_slug(db.recipes, generate_slug(update_data["title"]), fallback=update_data["title"], exclude_id=recipe["_id"])

    if "isPublished" in form_data:
        update_data["isPublished"] = form_data.get("isPublished") == "true"

    img_file = featuredImage or image
    if img_file and img_file.filename:
        update_data["featuredImage"] = await save_uploaded_file(img_file, sub_dir="recipes")


    update_data["updatedAt"] = datetime.now(timezone.utc)

    updated_recipe = await db.recipes.find_one_and_update(
        {"_id": recipe["_id"]},
        {"$set": update_data},
        return_document=True
    )
    return {"success": True, "data": {"recipe": serialize_doc(updated_recipe)}, "message": "Recipe updated"}

@router.delete("/admin/recipes/{recipe_id}")
async def delete_recipe(recipe_id: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if not is_valid_object_id(recipe_id):
        raise HTTPException(status_code=404, detail="Recipe not found")
    db = get_db()
    deleted = await db.recipes.find_one_and_delete({"_id": to_object_id(recipe_id)})
    if not deleted:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return {"success": True, "data": {}, "message": "Recipe deleted"}

