from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, Form, File, UploadFile
from starlette.datastructures import UploadFile as StarletteUploadFile
from typing import Optional, List, Any
from datetime import datetime, timezone
import json
import re

from app.db import get_db, to_object_id, is_valid_object_id
from app.utils.auth import require_roles
from app.utils.helpers import serialize_doc, generate_slug, paginate_query, build_pagination, escape_regex, ensure_unique_slug
from app.utils.image_processor import save_uploaded_file

router = APIRouter(prefix="/api", tags=["products"])

async def populate_product_category(product: dict):
    db = get_db()
    if product.get("category"):
        if isinstance(product["category"], dict):
            cat_obj = product["category"]
            cat_id = str(cat_obj.get("_id", ""))
            if not cat_obj.get("name") and is_valid_object_id(cat_id):
                cat = await db.categories.find_one({"_id": to_object_id(cat_id)})
                if cat:
                    product["category"] = {"_id": str(cat["_id"]), "name": cat.get("name"), "slug": cat.get("slug")}
            else:
                product["category"] = {
                    "_id": cat_id,
                    "name": cat_obj.get("name") or "Uncategorized",
                    "slug": cat_obj.get("slug") or ""
                }
        else:
            cat_str = str(product["category"])
            if is_valid_object_id(cat_str):
                cat = await db.categories.find_one({"_id": to_object_id(cat_str)})
                if cat:
                    product["category"] = {"_id": str(cat["_id"]), "name": cat.get("name"), "slug": cat.get("slug")}
                else:
                    product["category"] = None
    if product.get("subcategory"):
        if isinstance(product["subcategory"], dict):
            subcat_obj = product["subcategory"]
            subcat_id = str(subcat_obj.get("_id", ""))
            if not subcat_obj.get("name") and is_valid_object_id(subcat_id):
                subcat = await db.categories.find_one({"_id": to_object_id(subcat_id)})
                if subcat:
                    product["subcategory"] = {"_id": str(subcat["_id"]), "name": subcat.get("name"), "slug": subcat.get("slug")}
            else:
                product["subcategory"] = {
                    "_id": subcat_id,
                    "name": subcat_obj.get("name") or "",
                    "slug": subcat_obj.get("slug") or ""
                }
        else:
            subcat_str = str(product["subcategory"])
            if is_valid_object_id(subcat_str):
                subcat = await db.categories.find_one({"_id": to_object_id(subcat_str)})
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
    newArrival: Optional[str] = None,
    minRating: Optional[float] = None
):
    db = get_db()
    query: dict[str, Any] = {"isActive": True}
    and_clauses: list[dict] = []

    if search and search.strip():
        # Substring matching, not the `$text` index. The storefront search box
        # fires on every keystroke (debounced), and `$text` only matches whole
        # stemmed words — so "ghe" on the way to typing "ghee" returned nothing,
        # and a SKU never matched at all because SKUs aren't in the text index.
        # Each whitespace-separated term must appear in *some* field, so
        # "organic ghee" narrows the results instead of requiring that exact
        # phrase. Matches the admin list and /products/search, which already
        # searched this way.
        for term in search.strip().split():
            escaped = escape_regex(term)
            and_clauses.append({"$or": [
                {"name": {"$regex": escaped, "$options": "i"}},
                {"description": {"$regex": escaped, "$options": "i"}},
                {"tags": {"$regex": escaped, "$options": "i"}},
                {"variants.sku": {"$regex": escaped, "$options": "i"}},
            ]})

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
        # $elemMatch, not a dotted `variants.sellingPrice` path: on an array
        # field Mongo satisfies each operator independently, so a product with a
        # 50g pack at ₹50 and a 5kg pack at ₹5000 matched a ₹100–₹200 filter
        # (one variant clears $lte, a different one clears $gte). $elemMatch
        # requires a single variant to satisfy the whole range.
        query["variants"] = {"$elemMatch": {"sellingPrice": price_query}}

    # The storefront sends minRating for its rating filter — without declaring
    # it FastAPI silently drops the param and the filter does nothing.
    if minRating is not None:
        query["averageRating"] = {"$gte": float(minRating)}

    # Each search term contributes its own $or, so they have to be combined
    # under $and — assigning query["$or"] repeatedly would keep only the last.
    if and_clauses:
        query["$and"] = and_clauses

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

    # Capture the raw category reference BEFORE populate_product_category rewrites
    # it into a display dict ({_id: "...string"}). Products store category as an
    # ObjectId, so querying with the populated string _id would match nothing and
    # relatedProducts would always be empty.
    raw_category = p.get("category")

    p_pop = await populate_product_category(p)
    
    # Related products
    related_raw = await db.products.find({
        "category": raw_category,
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
    limit: int = 25,
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    db = get_db()
    query = {}
    # Filters that express "match any of" semantics (search terms, category,
    # out-of-stock) are collected separately and combined with $and so they
    # stack instead of the last one silently overwriting the others.
    or_clauses: list[dict] = []
    
    if search and search.strip():
        escaped = escape_regex(search.strip())
        or_clauses.append({"$or": [
            {"name": {"$regex": escaped, "$options": "i"}},
            {"description": {"$regex": escaped, "$options": "i"}},
            {"variants.sku": {"$regex": escaped, "$options": "i"}},
            {"tags": {"$regex": escaped, "$options": "i"}}
        ]})
        
    if category and category != "all":
        if is_valid_object_id(category):
            cat_oid = to_object_id(category)
            or_clauses.append({"$or": [
                {"category": cat_oid},
                {"category": category},
                {"category._id": cat_oid},
                {"category.slug": category}
            ]})
        else:
            cat = await db.categories.find_one({"$or": [{"slug": category}, {"name": category}]})
            if cat:
                or_clauses.append({"$or": [
                    {"category": cat["_id"]},
                    {"category": str(cat["_id"])},
                    {"category._id": cat["_id"]},
                    {"category.slug": category}
                ]})
            else:
                query["category"] = category
        
    status_lower = status.lower() if status else ""
    if status_lower == "active":
        query["isActive"] = True
    elif status_lower == "inactive":
        query["isActive"] = False
    elif status_lower in ["out-of-stock", "out_of_stock"]:
        or_clauses.append({"$or": [
            {"variants": {"$not": {"$elemMatch": {"stock": {"$gt": 0}}}}},
            {"variants": {"$size": 0}}
        ]})
    elif status_lower in ["low-stock", "low_stock"]:
        # $elemMatch so one *single* variant must be both in stock and low. The
        # dotted form applied each bound independently across the array, so a
        # product with a sold-out 100g (satisfying $lte 10) and a well-stocked
        # 1kg (satisfying $gt 0) was reported as low stock and cluttered the
        # restock list with items that needed no action.
        query["variants"] = {"$elemMatch": {"stock": {"$gt": 0, "$lte": 10}}}

    if len(or_clauses) == 1:
        query.update(or_clauses[0])
    elif len(or_clauses) > 1:
        query["$and"] = or_clauses

        
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


def safe_float(val, default=0.0):
    try:
        if val is None or val == "":
            return default
        return float(val)
    except Exception:
        return default

def safe_int(val, default=0):
    try:
        if val is None or val == "":
            return default
        return int(float(val))
    except Exception:
        return default

async def validate_variants(db, variants: Any, exclude_id: Any = None) -> None:
    """Reject variant sets that would break ordering or hit the unique sku index.

    Order placement resolves a cart line to a variant purely by sku (variants
    carry no _id), and the products collection has a unique index on
    `variants.sku`. Neither rule was enforced here: a variant saved with a blank
    sku became unorderable, and a duplicate sku surfaced to the admin as a bare
    500 with the whole product form lost.
    """
    if not isinstance(variants, list) or not variants:
        raise HTTPException(status_code=400, detail="At least one variant is required")

    skus = []
    for v in variants:
        if not isinstance(v, dict):
            raise HTTPException(status_code=400, detail="Invalid variant data")
        sku = str(v.get("sku") or "").strip()
        if not sku:
            raise HTTPException(
                status_code=400,
                detail=f"Every variant needs a SKU (missing on '{v.get('weight') or 'a variant'}')",
            )
        v["sku"] = sku
        if v.get("sellingPrice", 0) <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Variant '{v.get('weight') or sku}' needs a selling price above 0",
            )
        skus.append(sku)

    duplicates = {s for s in skus if skus.count(s) > 1}
    if duplicates:
        raise HTTPException(
            status_code=400,
            detail=f"Duplicate SKU within this product: {', '.join(sorted(duplicates))}",
        )

    clash_query: dict = {"variants.sku": {"$in": skus}}
    if exclude_id is not None:
        clash_query["_id"] = {"$ne": exclude_id}
    clash = await db.products.find_one(clash_query, {"name": 1, "variants.sku": 1})
    if clash:
        taken = sorted({v.get("sku") for v in clash.get("variants", []) if v.get("sku") in skus})
        raise HTTPException(
            status_code=400,
            detail=f"SKU {', '.join(taken)} is already used by '{clash.get('name')}'",
        )


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
            if isinstance(v, dict):
                v["weightValue"] = safe_float(v.get("weightValue"))
                v["mrp"] = safe_float(v.get("mrp"))
                v["sellingPrice"] = safe_float(v.get("sellingPrice"))
                v["stock"] = safe_int(v.get("stock"))
                v["discount"] = safe_float(v.get("discount"))
                # Display weight strings like "500 g " arrive with stray
                # whitespace from the admin form — trim so labels render cleanly
                # across ProductCard, cart, checkout, and WhatsApp messages.
                if isinstance(v.get("weight"), str):
                    v["weight"] = v["weight"].strip()

    # Validate before any upload is written: a rejected product used to leave its
    # already-saved images orphaned in uploads/ with nothing referencing them.
    await validate_variants(db, variants)

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

    # Upload files - check form_data list and parameter images
    raw_uploads = form_data.getlist("images") + form_data.getlist("image")
    all_upload_files = []
    for f in raw_uploads:
        if isinstance(f, StarletteUploadFile) and f.filename and f not in all_upload_files:
            all_upload_files.append(f)
    for f in images:
        if isinstance(f, StarletteUploadFile) and f.filename and f not in all_upload_files:
            all_upload_files.append(f)

    image_urls = []
    for img in all_upload_files:
        url = await save_uploaded_file(img, sub_dir="products")
        image_urls.append(url)
                
    # Calculate minPrice safely
    active_variants = [v for v in variants if isinstance(v, dict) and v.get("isActive") is not False]
    valid_prices = [v["sellingPrice"] for v in active_variants if v.get("sellingPrice") and v["sellingPrice"] > 0]
    min_price = min(valid_prices) if valid_prices else 0.0

    
    slug_val = form_data.get("slug")
    slug = generate_slug(str(slug_val)) if slug_val else generate_slug(str(name))
    slug = await ensure_unique_slug(db.products, slug, fallback=str(name))


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
        "gst": safe_float(form_data.get("gst"), 5.0),
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
            desired = generate_slug(str(update_data.get("name") or product.get("name")))
        elif s_val:
            desired = generate_slug(str(s_val))
        else:
            desired = None
        if desired is not None:
            update_data["slug"] = await ensure_unique_slug(
                db.products,
                desired,
                fallback=str(update_data.get("name") or product.get("name")),
                exclude_id=product["_id"],
            )


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
                if isinstance(v, dict):
                    v["weightValue"] = safe_float(v.get("weightValue"))
                    v["mrp"] = safe_float(v.get("mrp"))
                    v["sellingPrice"] = safe_float(v.get("sellingPrice"))
                    v["stock"] = safe_int(v.get("stock"))
                    v["discount"] = safe_float(v.get("discount"))
                    # Trim display weight strings — see create_product
                    if isinstance(v.get("weight"), str):
                        v["weight"] = v["weight"].strip()

            # Same rules as create — excluding this product so it doesn't collide
            # with its own existing SKUs.
            await validate_variants(db, variants, exclude_id=product["_id"])
            update_data["variants"] = variants


            active_variants = [v for v in variants if isinstance(v, dict) and v.get("isActive") is not False]
            valid_prices = [v["sellingPrice"] for v in active_variants if v.get("sellingPrice") and v["sellingPrice"] > 0]
            update_data["minPrice"] = min(valid_prices) if valid_prices else 0.0

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
        update_data["gst"] = safe_float(form_data.get("gst"), 5.0)
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
    raw_uploads = form_data.getlist("images") + form_data.getlist("image")
    all_upload_files = []
    for f in raw_uploads:
        if isinstance(f, StarletteUploadFile) and f.filename and f not in all_upload_files:
            all_upload_files.append(f)
    for f in images:
        if isinstance(f, StarletteUploadFile) and f.filename and f not in all_upload_files:
            all_upload_files.append(f)

    new_image_urls = []
    for img in all_upload_files:
        url = await save_uploaded_file(img, sub_dir="products")
        new_image_urls.append(url)

    has_image_update = "hasImageUpdate" in form_data or "existingImages" in form_data or len(all_upload_files) > 0
    if has_image_update:
        existing_images = form_data.getlist("existingImages") if "existingImages" in form_data else []
        if isinstance(existing_images, str):
            existing_images = [existing_images]
        update_data["images"] = existing_images + new_image_urls



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
    p_oid = to_object_id(product_id)
    deleted = await db.products.find_one_and_delete({"_id": p_oid})
    if not deleted:
        raise HTTPException(status_code=404, detail="Product not found")

    # Clean up what pointed at this product. Deleting only the product document
    # left its reviews behind forever, still flagged isApproved — and
    # GET /reviews/latest (the homepage testimonial strip) selects purely on
    # isApproved, so those reviews kept being served with a null productName,
    # detached from any product a visitor could click through to. Wishlist
    # entries lingered the same way: GET /auth/wishlist silently drops ids that
    # no longer resolve, so the row stayed in the user document invisibly.
    review_res = await db.reviews.delete_many({"product": p_oid})
    wishlist_res = await db.users.update_many(
        {"wishlist": {"$in": [product_id, p_oid]}},
        {"$pull": {"wishlist": {"$in": [product_id, p_oid]}}},
    )

    return {
        "success": True,
        "data": {
            "reviewsDeleted": review_res.deleted_count,
            "wishlistsUpdated": wishlist_res.modified_count,
        },
        "message": "Product deleted",
    }
