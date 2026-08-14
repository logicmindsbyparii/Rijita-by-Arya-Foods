from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, Form, File, UploadFile
from typing import Optional, List, Any
from datetime import datetime, timezone
import json
import re

from app.db import get_db, to_object_id, is_valid_object_id
from app.utils.auth import require_roles
from app.utils.helpers import serialize_doc, generate_slug, paginate_query, build_pagination, escape_regex
from app.utils.image_processor import save_uploaded_file

router = APIRouter(prefix="/api", tags=["products"])

async def populate_product_category(product: dict):
    db = get_db()
    if product.get("category") and is_valid_object_id(str(product["category"])):
        cat = await db.categories.find_one({"_id": to_object_id(str(product["category"]))})
        if cat:
            product["category"] = {"_id": str(cat["_id"]), "name": cat.get("name"), "slug": cat.get("slug")}
        else:
            product["category"] = None
    if product.get("subcategory") and is_valid_object_id(str(product["subcategory"])):
        subcat = await db.categories.find_one({"_id": to_object_id(str(product["subcategory"]))})
        if subcat:
            product["subcategory"] = {"_id": str(subcat["_id"]), "name": subcat.get("name"), "slug": subcat.get("slug")}
        else:
            product["subcategory"] = None
    return product

@router.get("/products")
async def get_products(
    page: int = 1,
    limit: int = 12,
    search: Optional[str] = None,
    category: Optional[str] = None,
    sort: Optional[str] = None,
    minPrice: Optional[float] = None,
    maxPrice: Optional[float] = None,
    tags: Optional[str] = None,
    featured: Optional[str] = None,
    bestSeller: Optional[str] = None,
    newArrival: Optional[str] = None
):
    db = get_db()
    query: dict[str, Any] = {"isActive": True}
    
    if search:
        query["$text"] = {"$search": search}
        
    if category:
        slugs = [s.strip() for s in category.split(",") if s.strip()]
        cats = await db.categories.find({"slug": {"$in": slugs}}).to_list(length=100)
        cat_ids = [c["_id"] for c in cats]
        if not cat_ids:
            query["_id"] = {"$in": []}
        else:
            query["category"] = {"$in": cat_ids}
            
    if featured == "true":
        query["isFeatured"] = True
    if bestSeller == "true":
        query["isBestSeller"] = True
    if newArrival == "true":
        query["isNewArrival"] = True
        
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        query["tags"] = {"$in": tag_list}
        
    if minPrice is not None or maxPrice is not None:
        price_query = {}
        if minPrice is not None:
            price_query["$gte"] = minPrice
        if maxPrice is not None:
            price_query["$lte"] = maxPrice
        query["variants.sellingPrice"] = price_query
        
    sort_option = [("createdAt", -1)]
    if sort == "price-asc":
        sort_option = [("minPrice", 1)]
    elif sort == "price-desc":
        sort_option = [("minPrice", -1)]
    elif sort == "name-asc":
        sort_option = [("name", 1)]
    elif sort == "name-desc":
        sort_option = [("name", -1)]
    elif sort == "rating":
        sort_option = [("averageRating", -1)]
    elif sort == "popular":
        sort_option = [("totalSold", -1)]
    elif sort == "newest":
        sort_option = [("createdAt", -1)]
        
    skip, page_limit, current_page = paginate_query(page, limit)
    total = await db.products.count_documents(query)
    
    cursor = db.products.find(query).sort(sort_option).skip(skip).limit(page_limit)
    products_raw = await cursor.to_list(length=page_limit)
    
    products = []
    for p in products_raw:
        p_pop = await populate_product_category(p)
        products.append(serialize_doc(p_pop))
        
    return {
        "success": True,
        "data": {"products": products},
        "pagination": build_pagination(total, current_page, page_limit)
    }

@router.get("/products/search")
async def search_products(q: str, page: int = 1, limit: int = 20):
    if not q:
        raise HTTPException(status_code=400, detail="Search query required")
        
    db = get_db()
    skip, page_limit, current_page = paginate_query(page, limit)
    escaped = escape_regex(q)
    
    query = {
        "isActive": True,
        "$or": [
            {"name": {"$regex": escaped, "$options": "i"}},
            {"description": {"$regex": escaped, "$options": "i"}},
            {"tags": {"$regex": escaped, "$options": "i"}},
            {"variants.sku": {"$regex": escaped, "$options": "i"}}
        ]
    }
    
    total = await db.products.count_documents(query)
    cursor = db.products.find(query).sort([("totalSold", -1)]).skip(skip).limit(page_limit)
    products_raw = await cursor.to_list(length=page_limit)
    
    products = []
    for p in products_raw:
        p_pop = await populate_product_category(p)
        products.append(serialize_doc(p_pop))
        
    return {
        "success": True,
        "data": {"products": products},
        "pagination": build_pagination(total, current_page, page_limit)
    }

@router.get("/products/featured")
async def get_featured_products():
    db = get_db()
    cursor = db.products.find({"isActive": True, "isFeatured": True}).sort("createdAt", -1).limit(12)
    products_raw = await cursor.to_list(length=12)
    
    products = []
    for p in products_raw:
        p_pop = await populate_product_category(p)
        products.append(serialize_doc(p_pop))
        
    return {"success": True, "data": {"products": products}}

@router.get("/products/best-sellers")
async def get_best_sellers():
    db = get_db()
    cursor = db.products.find({"isActive": True, "isBestSeller": True}).sort("totalSold", -1).limit(12)
    products_raw = await cursor.to_list(length=12)
    
    products = []
    for p in products_raw:
        p_pop = await populate_product_category(p)
        products.append(serialize_doc(p_pop))
        
    return {"success": True, "data": {"products": products}}

@router.get("/products/new-arrivals")
async def get_new_arrivals():
    db = get_db()
    cursor = db.products.find({"isActive": True, "isNewArrival": True}).sort("createdAt", -1).limit(12)
    products_raw = await cursor.to_list(length=12)
    
    products = []
    for p in products_raw:
        p_pop = await populate_product_category(p)
        products.append(serialize_doc(p_pop))
        
    return {"success": True, "data": {"products": products}}

@router.get("/products/slug/{slug}")
async def get_product_by_slug(slug: str):
    db = get_db()
    p = await db.products.find_one({"slug": slug, "isActive": True})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
        
    p_pop = await populate_product_category(p)
    
    # Related products
    related_raw = await db.products.find({
        "category": p["category"]["_id"] if isinstance(p["category"], dict) else p.get("category"),
        "_id": {"$ne": p["_id"]},
        "isActive": True
    }).limit(6).to_list(length=6)
    
    related = []
    for r in related_raw:
        r_pop = await populate_product_category(r)
        related.append(serialize_doc(r_pop))
        
    return {"success": True, "data": {"product": serialize_doc(p_pop), "relatedProducts": related}}

@router.get("/products/{product_id}")
async def get_product_by_id(product_id: str):
    if not is_valid_object_id(product_id):
        raise HTTPException(status_code=404, detail="Product not found")
    db = get_db()
    p = await db.products.find_one({"_id": to_object_id(product_id)})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    p_pop = await populate_product_category(p)
    return {"success": True, "data": {"product": serialize_doc(p_pop)}}

@router.get("/admin/products")
async def admin_get_products(
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
        query["$or"] = [
            {"name": {"$regex": escaped, "$options": "i"}},
            {"variants.sku": {"$regex": escaped, "$options": "i"}}
        ]
        
    if status == "active":
        query["isActive"] = True
    elif status == "inactive":
        query["isActive"] = False
    elif status == "out-of-stock":
        query["variants"] = {"$not": {"$elemMatch": {"stock": {"$gt": 0}}}}
    elif status == "low-stock":
        query["variants.stock"] = {"$gt": 0, "$lte": 10}
        
    skip, page_limit, current_page = paginate_query(page, limit)
    total = await db.products.count_documents(query)
    
    cursor = db.products.find(query).sort("createdAt", -1).skip(skip).limit(page_limit)
    products_raw = await cursor.to_list(length=page_limit)
    
    products = []
    for p in products_raw:
        p_pop = await populate_product_category(p)
        products.append(serialize_doc(p_pop))
        
    return {
        "success": True,
        "data": {"products": products},
        "pagination": build_pagination(total, current_page, page_limit)
    }

def parse_json_or_val(val: Any):
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            pass
    return val

@router.post("/admin/products", status_code=status.HTTP_201_CREATED)
async def create_product(
    request: Request,
    images: List[UploadFile] = File([]),
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    form_data = await request.form()
    db = get_db()
    
    name = form_data.get("name")
    description = form_data.get("description")
    category_id = form_data.get("category")
    
    if not name or not description or not category_id:
        raise HTTPException(status_code=400, detail="Name, description, and category are required")
        
    cat_str = str(category_id)
    cat_oid = to_object_id(cat_str) if is_valid_object_id(cat_str) else cat_str
    subcat_id = form_data.get("subcategory")
    subcat_str = str(subcat_id) if subcat_id is not None else None
    subcat_oid = to_object_id(subcat_str) if subcat_str and is_valid_object_id(subcat_str) else None
    
    variants = parse_json_or_val(form_data.get("variants")) or []
    if isinstance(variants, list):
        for v in variants:
            if "weightValue" in v:
                v["weightValue"] = float(v["weightValue"])
            if "mrp" in v:
                v["mrp"] = float(v["mrp"])
            if "sellingPrice" in v:
                v["sellingPrice"] = float(v["sellingPrice"])
            if "stock" in v:
                v["stock"] = int(v["stock"])
            if "discount" in v:
                v["discount"] = float(v["discount"])
                
    tags_val = form_data.get("tags")
    if isinstance(tags_val, str):
        tags = [t.strip() for t in tags_val.split(",") if t.strip()]
    else:
        tags = tags_val or []
        
    meta_keywords_val = form_data.get("metaKeywords")
    if isinstance(meta_keywords_val, str):
        meta_keywords = [k.strip() for k in meta_keywords_val.split(",") if k.strip()]
    else:
        meta_keywords = meta_keywords_val or []

    # Upload files
    image_urls = []
    if images:
        for img in images:
            if img.filename:
                url = await save_uploaded_file(img, sub_dir="products")
                image_urls.append(url)
                
    # Calculate minPrice
    active_variants = [v for v in variants if v.get("isActive") is not False]
    min_price = min([v["sellingPrice"] for v in active_variants]) if active_variants else 0
    
    slug_val = form_data.get("slug")
    slug = generate_slug(str(slug_val)) if slug_val else generate_slug(str(name))
    
    product_doc = {
        "name": str(name).strip(),
        "slug": slug,
        "description": str(description),
        "shortDescription": form_data.get("shortDescription"),
        "category": cat_oid,
        "subcategory": subcat_oid,
        "brand": form_data.get("brand"),
        "variants": variants,
        "images": image_urls,
        "videos": [],
        "tags": tags,
        "nutritionalInfo": parse_json_or_val(form_data.get("nutritionalInfo")),
        "ingredients": form_data.get("ingredients"),
        "shelfLife": form_data.get("shelfLife"),
        "storageInstructions": form_data.get("storageInstructions"),
        "countryOfOrigin": form_data.get("countryOfOrigin") or "India",
        "fssaiLicense": form_data.get("fssaiLicense"),
        "gst": float(str(form_data.get("gst", 5))),
        "hsn": form_data.get("hsn"),
        "minPrice": min_price,
        "isActive": form_data.get("isActive") != "false",
        "isFeatured": form_data.get("isFeatured") == "true",
        "isBestSeller": form_data.get("isBestSeller") == "true",
        "isNewArrival": form_data.get("isNewArrival") == "true",
        "unit": form_data.get("unit") or "Pcs",
        "metaTitle": form_data.get("metaTitle"),
        "metaDescription": form_data.get("metaDescription"),
        "metaKeywords": meta_keywords,
        "totalSold": 0,
        "averageRating": 0,
        "reviewCount": 0,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    
    res = await db.products.insert_one(product_doc)
    product_doc["_id"] = res.inserted_id
    p_pop = await populate_product_category(product_doc)
    
    return {"success": True, "data": {"product": serialize_doc(p_pop)}, "message": "Product created"}

@router.put("/admin/products/{product_id}")
async def update_product(
    product_id: str,
    request: Request,
    images: List[UploadFile] = File([]),
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    if not is_valid_object_id(product_id):
        raise HTTPException(status_code=404, detail="Product not found")
        
    db = get_db()
    product = await db.products.find_one({"_id": to_object_id(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    form_data = await request.form()
    update_data = {}
    
    if "name" in form_data:
        update_data["name"] = str(form_data.get("name")).strip()
    if "description" in form_data:
        update_data["description"] = str(form_data.get("description"))
    if "shortDescription" in form_data:
        update_data["shortDescription"] = form_data.get("shortDescription")
        
    if "slug" in form_data:
        s_val = form_data.get("slug")
        if s_val == "":
            update_data["slug"] = generate_slug(str(update_data.get("name") or product.get("name")))
        elif s_val:
            update_data["slug"] = generate_slug(str(s_val))
            
    if "category" in form_data:
        c_val = str(form_data.get("category"))
        if is_valid_object_id(c_val):
            update_data["category"] = to_object_id(c_val)
    if "subcategory" in form_data:
        sub = form_data.get("subcategory")
        sub_str = str(sub) if sub is not None else None
        update_data["subcategory"] = to_object_id(sub_str) if sub_str and is_valid_object_id(sub_str) else None
        
    if "variants" in form_data:
        variants = parse_json_or_val(form_data.get("variants")) or []
        if isinstance(variants, list):
            for v in variants:
                if "weightValue" in v:
                    v["weightValue"] = float(v["weightValue"])
                if "mrp" in v:
                    v["mrp"] = float(v["mrp"])
                if "sellingPrice" in v:
                    v["sellingPrice"] = float(v["sellingPrice"])
                if "stock" in v:
                    v["stock"] = int(v["stock"])
                if "discount" in v:
                    v["discount"] = float(v["discount"])
            update_data["variants"] = variants
            
            active_variants = [v for v in variants if v.get("isActive") is not False]
            update_data["minPrice"] = min([v["sellingPrice"] for v in active_variants]) if active_variants else 0

    if "tags" in form_data:
        t_val = form_data.get("tags")
        if isinstance(t_val, str):
            update_data["tags"] = [t.strip() for t in t_val.split(",") if t.strip()]
        else:
            update_data["tags"] = t_val or []
            
    if "nutritionalInfo" in form_data:
        update_data["nutritionalInfo"] = parse_json_or_val(form_data.get("nutritionalInfo"))
        
    if "ingredients" in form_data:
        update_data["ingredients"] = form_data.get("ingredients")
    if "shelfLife" in form_data:
        update_data["shelfLife"] = form_data.get("shelfLife")
    if "storageInstructions" in form_data:
        update_data["storageInstructions"] = form_data.get("storageInstructions")
    if "countryOfOrigin" in form_data:
        update_data["countryOfOrigin"] = form_data.get("countryOfOrigin")
    if "fssaiLicense" in form_data:
        update_data["fssaiLicense"] = form_data.get("fssaiLicense")
    if "gst" in form_data:
        update_data["gst"] = float(str(form_data.get("gst")))
    if "hsn" in form_data:
        update_data["hsn"] = form_data.get("hsn")
    if "unit" in form_data:
        update_data["unit"] = form_data.get("unit")
    if "metaTitle" in form_data:
        update_data["metaTitle"] = form_data.get("metaTitle")
    if "metaDescription" in form_data:
        update_data["metaDescription"] = form_data.get("metaDescription")
    if "metaKeywords" in form_data:
        k_val = form_data.get("metaKeywords")
        if isinstance(k_val, str):
            update_data["metaKeywords"] = [k.strip() for k in k_val.split(",") if k.strip()]
        else:
            update_data["metaKeywords"] = k_val or []

    if "isActive" in form_data:
        update_data["isActive"] = form_data.get("isActive") == "true"
    if "isFeatured" in form_data:
        update_data["isFeatured"] = form_data.get("isFeatured") == "true"
    if "isBestSeller" in form_data:
        update_data["isBestSeller"] = form_data.get("isBestSeller") == "true"
    if "isNewArrival" in form_data:
        update_data["isNewArrival"] = form_data.get("isNewArrival") == "true"

    # Images handling
    existing_images = form_data.getlist("existingImages") if "existingImages" in form_data else product.get("images", [])
    if isinstance(existing_images, str):
        existing_images = [existing_images]
        
    new_image_urls = []
    if images:
        for img in images:
            if img.filename:
                url = await save_uploaded_file(img, sub_dir="products")
                new_image_urls.append(url)
                
    if images and len(new_image_urls) > 0:
        update_data["images"] = existing_images + new_image_urls
    elif "existingImages" in form_data:
        update_data["images"] = existing_images

    update_data["updatedAt"] = datetime.now(timezone.utc)
    
    updated_product = await db.products.find_one_and_update(
        {"_id": product["_id"]},
        {"$set": update_data},
        return_document=True
    )
    p_pop = await populate_product_category(updated_product)
    
    return {"success": True, "data": {"product": serialize_doc(p_pop)}, "message": "Product updated"}

@router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if not is_valid_object_id(product_id):
        raise HTTPException(status_code=404, detail="Product not found")
        
    db = get_db()
    deleted = await db.products.find_one_and_delete({"_id": to_object_id(product_id)})
    if not deleted:
        raise HTTPException(status_code=404, detail="Product not found")
        
    return {"success": True, "data": {}, "message": "Product deleted"}
