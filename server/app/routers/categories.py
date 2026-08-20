from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile
from typing import Optional, List
from datetime import datetime, timezone
import json

from app.db import get_db, to_object_id, is_valid_object_id
from app.utils.auth import require_roles
from app.utils.helpers import serialize_doc, generate_slug, ensure_unique_slug
from app.utils.image_processor import save_uploaded_file

router = APIRouter(prefix="/api", tags=["categories"])

async def populate_category(cat: dict):
    db = get_db()
    if cat.get("parent") and is_valid_object_id(str(cat["parent"])):
        parent_doc = await db.categories.find_one({"_id": to_object_id(str(cat["parent"]))})
        if parent_doc:
            cat["parent"] = {"_id": str(parent_doc["_id"]), "name": parent_doc.get("name"), "slug": parent_doc.get("slug")}
        else:
            cat["parent"] = None
    else:
        cat["parent"] = None
    return cat

@router.get("/categories")
async def get_categories():
    db = get_db()
    cursor = db.categories.find({"isActive": True}).sort([("order", 1), ("name", 1)])
    categories = await cursor.to_list(length=1000)
    
    # Calculate product counts per category
    pipeline = [
        {"$match": {"isActive": True}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]
    product_counts = await db.products.aggregate(pipeline).to_list(length=1000)
    count_map = {str(c["_id"]): c["count"] for c in product_counts if c["_id"]}
    
    results = []
    for cat in categories:
        cat_pop = await populate_category(cat)
        cat_ser = serialize_doc(cat_pop)
        cat_ser["productCount"] = count_map.get(str(cat["_id"]), 0)
        results.append(cat_ser)
        
    return {"success": True, "data": {"categories": results}}

@router.get("/categories/slug/{slug}")
async def get_category_by_slug(slug: str):
    db = get_db()
    cat = await db.categories.find_one({"slug": slug, "isActive": True})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    cat_pop = await populate_category(cat)
    cat_ser = serialize_doc(cat_pop)
    
    # Fetch products in category
    cursor = db.products.find({"category": cat["_id"], "isActive": True}).sort("createdAt", -1)
    products = await cursor.to_list(length=1000)
    
    # Populate product category
    for p in products:
        p["category"] = {"_id": str(cat["_id"]), "name": cat.get("name"), "slug": cat.get("slug")}
        
    return {"success": True, "data": {"category": cat_ser, "products": serialize_doc(products)}}

@router.get("/admin/categories")
async def admin_get_categories(current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    db = get_db()
    cursor = db.categories.find().sort([("order", 1), ("name", 1)])
    categories = await cursor.to_list(length=1000)
    
    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]
    product_counts = await db.products.aggregate(pipeline).to_list(length=1000)
    count_map = {str(c["_id"]): c["count"] for c in product_counts if c["_id"]}
    
    results = []
    for cat in categories:
        cat_pop = await populate_category(cat)
        cat_ser = serialize_doc(cat_pop)
        cat_ser["productCount"] = count_map.get(str(cat["_id"]), 0)
        results.append(cat_ser)
        
    return {"success": True, "data": {"categories": results}}

@router.post("/admin/categories", status_code=status.HTTP_201_CREATED)
async def create_category(
    name: str = Form(...),
    slug: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    parent: Optional[str] = Form(None),
    isActive: Optional[bool] = Form(True),
    order: Optional[int] = Form(0),
    image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    db = get_db()
    cat_slug = generate_slug(slug) if slug else generate_slug(name)
    cat_slug = await ensure_unique_slug(db.categories, cat_slug, fallback=name)
    
    parent_id = None
    if parent and parent not in ["", "null", "undefined"] and is_valid_object_id(parent):
        parent_id = to_object_id(parent)
        
    image_url = None
    if image:
        image_url = await save_uploaded_file(image, sub_dir="categories")
        
    category_doc = {
        "name": name.strip(),
        "slug": cat_slug,
        "description": description,
        "image": image_url,
        "parent": parent_id,
        "isActive": isActive if isActive is not None else True,
        "order": order if order is not None else 0,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    
    res = await db.categories.insert_one(category_doc)
    category_doc["_id"] = res.inserted_id
    cat_pop = await populate_category(category_doc)
    
    return {"success": True, "data": {"category": serialize_doc(cat_pop)}, "message": "Category created"}

@router.put("/admin/categories/{category_id}")
async def update_category(
    category_id: str,
    name: Optional[str] = Form(None),
    slug: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    parent: Optional[str] = Form(None),
    isActive: Optional[bool] = Form(None),
    order: Optional[int] = Form(None),
    removeImage: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    if not is_valid_object_id(category_id):
        raise HTTPException(status_code=404, detail="Category not found")
        
    db = get_db()
    category = await db.categories.find_one({"_id": to_object_id(category_id)})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    update_data = {}
    if name is not None:
        update_data["name"] = name.strip()
    if slug is not None:
        update_data["slug"] = await ensure_unique_slug(
            db.categories, generate_slug(slug),
            fallback=str(name or category.get("name") or "category"),
            exclude_id=category["_id"],
        )
    if description is not None:
        update_data["description"] = description
    if parent is not None:
        if parent in ["", "null", "undefined"]:
            update_data["parent"] = None
        elif is_valid_object_id(parent):
            update_data["parent"] = to_object_id(parent)
    if isActive is not None:
        update_data["isActive"] = isActive
    if order is not None:
        update_data["order"] = order
        
    if image:
        update_data["image"] = await save_uploaded_file(image, sub_dir="categories")
    elif removeImage == "true":
        update_data["image"] = None
        
    update_data["updatedAt"] = datetime.now(timezone.utc)
    
    updated_cat = await db.categories.find_one_and_update(
        {"_id": category["_id"]},
        {"$set": update_data},
        return_document=True
    )
    cat_pop = await populate_category(updated_cat)
    
    return {"success": True, "data": {"category": serialize_doc(cat_pop)}, "message": "Category updated"}

@router.delete("/admin/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if not is_valid_object_id(category_id):
        raise HTTPException(status_code=404, detail="Category not found")
        
    db = get_db()
    cat_oid = to_object_id(category_id)
    
    product_count = await db.products.count_documents({"category": cat_oid})
    if product_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category with {product_count} products. Move products first.")
        
    subcategory_count = await db.categories.count_documents({"parent": cat_oid})
    if subcategory_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category with {subcategory_count} subcategories. Remove them first.")
        
    deleted = await db.categories.find_one_and_delete({"_id": cat_oid})
    if not deleted:
        raise HTTPException(status_code=404, detail="Category not found")
        
    return {"success": True, "data": {}, "message": "Category deleted"}
