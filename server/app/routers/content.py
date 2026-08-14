from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, Form, File, UploadFile
from typing import Optional, List, Any
from datetime import datetime, timezone
import json
import re
import os
import logging

logger = logging.getLogger(__name__)

from app.db import get_db, to_object_id, is_valid_object_id
from app.utils.auth import get_current_user, require_roles
from app.utils.helpers import serialize_doc, generate_slug, paginate_query, build_pagination, escape_regex
from app.utils.image_processor import save_uploaded_file
from app.models.content import (
    CreateReviewSchema, ContactSubmitSchema, SubscribeSchema, ValidateCouponSchema
)
from app.models.user import AdminCreateUserSchema, AdminUpdateUserSchema
from app.utils.auth import hash_password

router = APIRouter(prefix="/api", tags=["content"])

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
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    form_data = await request.form()
    db = get_db()
    
    title_raw = form_data.get("title")
    content_raw = form_data.get("content")
    author_raw = form_data.get("author")
    
    if not title_raw or not content_raw or not author_raw:
        raise HTTPException(status_code=400, detail="Title, content, and author are required")
        
    title = str(title_raw)
    content = str(content_raw)
    author = str(author_raw)

    slug_val = form_data.get("slug")
    slug = generate_slug(slug_val) if slug_val else generate_slug(title)
    
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
        
    img_url = None
    if featuredImage:
        img_url = await save_uploaded_file(featuredImage, sub_dir="blogs")
    elif form_data.get("featuredImage"):
        img_url = str(form_data.get("featuredImage"))

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
        update_data["slug"] = generate_slug(update_data["title"])

    if "isPublished" in form_data:
        is_pub = form_data.get("isPublished") == "true"
        update_data["isPublished"] = is_pub
        if is_pub and not blog.get("publishedAt"):
            update_data["publishedAt"] = datetime.now(timezone.utc)

    if featuredImage:
        update_data["featuredImage"] = await save_uploaded_file(featuredImage, sub_dir="blogs")

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
    
    def parse_array_field(val):
        if isinstance(val, str):
            try:
                return json.loads(val)
            except Exception:
                return [x.strip() for x in val.split("\n") if x.strip()]
        if isinstance(val, list):
            return val
        return []

    img_url = None
    if featuredImage:
        img_url = await save_uploaded_file(featuredImage, sub_dir="recipes")

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
        "prepTime": int(str(prep_val)) if prep_val is not None else 0,
        "cookTime": int(str(cook_val)) if cook_val is not None else 0,
        "servings": int(str(servings_val)) if servings_val is not None else 1,
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
        return val or []

    for k in ['title', 'slug', 'description', 'prepTime', 'cookTime', 'servings', 'difficulty', 'metaTitle', 'metaDescription']:
        if k in form_data:
            update_data[k] = form_data.get(k)
            
    if "ingredients" in form_data:
        update_data["ingredients"] = parse_array_field(form_data.get("ingredients"))
    if "instructions" in form_data:
        update_data["instructions"] = parse_array_field(form_data.get("instructions"))
    if "tags" in form_data:
        update_data["tags"] = parse_array_field(form_data.get("tags"))
    if "products" in form_data:
        update_data["products"] = [to_object_id(pid) for pid in parse_array_field(form_data.get("products")) if is_valid_object_id(pid)]

    if "title" in update_data and not update_data.get("slug"):
        update_data["slug"] = generate_slug(update_data["title"])

    if "isPublished" in form_data:
        update_data["isPublished"] = form_data.get("isPublished") == "true"

    if featuredImage:
        update_data["featuredImage"] = await save_uploaded_file(featuredImage, sub_dir="recipes")

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
    
    reviews = []
    for r in reviews_raw:
        if r.get("product") and is_valid_object_id(str(r["product"])):
            p = await db.products.find_one({"_id": to_object_id(str(r["product"]))})
            r["product"] = {"_id": str(p["_id"]), "name": p.get("name"), "slug": p.get("slug")} if p else None
        if r.get("user") and is_valid_object_id(str(r["user"])):
            u = await db.users.find_one({"_id": to_object_id(str(r["user"]))})
            r["user"] = {"_id": str(u["_id"]), "name": u.get("name"), "email": u.get("email")} if u else None
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

# ─── SUBSCRIBERS ────────────────────────────────────────────────────────

@router.post("/subscribers/subscribe")
async def subscribe(body: SubscribeSchema):
    email = body.email.lower().strip()
    db = get_db()
    existing = await db.subscribers.find_one({"email": email})
    if existing:
        if not existing.get("isActive", True):
            await db.subscribers.update_one({"_id": existing["_id"]}, {"$set": {"isActive": True}})
            existing["isActive"] = True
            return {"success": True, "data": {"subscriber": serialize_doc(existing)}, "message": "Subscription renewed"}
        raise HTTPException(status_code=400, detail="Email already subscribed")
        
    sub_doc = {
        "email": email,
        "isActive": True,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    res = await db.subscribers.insert_one(sub_doc)
    sub_doc["_id"] = res.inserted_id
    return {"success": True, "data": {"subscriber": serialize_doc(sub_doc)}, "message": "Subscribed successfully"}

@router.get("/admin/subscribers")
async def get_subscribers(page: int = 1, limit: int = 20, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    db = get_db()
    query = {"isActive": True}
    skip, page_limit, current_page = paginate_query(page, limit)
    total = await db.subscribers.count_documents(query)
    
    cursor = db.subscribers.find(query).sort("createdAt", -1).skip(skip).limit(page_limit)
    subscribers = await cursor.to_list(length=page_limit)
    
    return {
        "success": True,
        "data": {"subscribers": serialize_doc(subscribers)},
        "pagination": build_pagination(total, current_page, page_limit)
    }

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
        update_data["slug"] = generate_slug(form_data.get("slug"))
    elif "name" in update_data and not update_data.get("slug"):
        update_data["slug"] = generate_slug(update_data["name"])

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
        query["isActive"] = True
        query["startsAt"] = {"$lte": now}
        query["expiresAt"] = {"$gte": now}
    elif status == "inactive":
        query["isActive"] = False
    elif status == "expired":
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

@router.post("/admin/coupons", status_code=status.HTTP_201_CREATED)
async def create_coupon(body: dict, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    db = get_db()
    code = body.get("code", "").upper().strip()
    if not code:
        raise HTTPException(status_code=400, detail="Coupon code required")
        
    existing = await db.coupons.find_one({"code": code})
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
        
    coupon_doc = {
        "code": code,
        "description": body.get("description"),
        "type": body.get("type", "percentage"),
        "value": float(body.get("value", 0)),
        "minOrderAmount": float(body.get("minOrderAmount", 0)),
        "maxDiscount": float(body.get("maxDiscount")) if body.get("maxDiscount") is not None else None,
        "usageLimit": int(body.get("usageLimit", 100)),
        "usedCount": 0,
        "startsAt": datetime.fromisoformat(str(body.get("startsAt"))) if body.get("startsAt") else datetime.now(timezone.utc),
        "expiresAt": datetime.fromisoformat(str(body.get("expiresAt"))) if body.get("expiresAt") else datetime.now(timezone.utc),
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
    update_data = {}
    
    allowed = ['code', 'description', 'type', 'value', 'minOrderAmount', 'maxDiscount', 'usageLimit', 'startsAt', 'expiresAt', 'isActive']
    for k in allowed:
        if k in body:
            val = body[k]
            if k == 'code':
                val = str(val).upper().strip()
            elif k in ['value', 'minOrderAmount', 'maxDiscount'] and val is not None:
                val = float(val)
            elif k == 'usageLimit' and val is not None:
                val = int(val)
            elif k in ['startsAt', 'expiresAt'] and val is not None:
                val = datetime.fromisoformat(str(val))
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

@router.post("/coupons/validate")
async def validate_coupon(body: ValidateCouponSchema):
    db = get_db()
    code_clean = body.code.upper().strip()
    now = datetime.now(timezone.utc)
    
    coupon = await db.coupons.find_one({
        "code": code_clean,
        "isActive": True,
        "startsAt": {"$lte": now},
        "expiresAt": {"$gte": now}
    })
    
    if not coupon:
        raise HTTPException(status_code=400, detail="Invalid or expired coupon")
        
    if coupon.get("usedCount", 0) >= coupon.get("usageLimit", 100):
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
        
    if body.subtotal < coupon.get("minOrderAmount", 0):
        raise HTTPException(status_code=400, detail=f"Minimum order: ₹{coupon.get('minOrderAmount')}")
        
    if coupon.get("type") == "percentage":
        calc = body.subtotal * (float(coupon.get("value", 0)) / 100.0)
        max_disc = coupon.get("maxDiscount")
        discount = min(calc, float(max_disc)) if max_disc else calc
    else:
        discount = min(float(coupon.get("value", 0)), body.subtotal)
        
    return {"success": True, "data": {"coupon": serialize_doc(coupon), "discount": round(discount)}, "message": "Coupon valid"}

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
        if value is not None:
            if key in json_fields and isinstance(value, str):
                try:
                    update_data[key] = json.loads(value)
                except Exception:
                    update_data[key] = value
            else:
                update_data[key] = value

    # File uploads for settings
    files = {}
    for key, val in form_data.items():
        if hasattr(val, "filename") and val.filename:
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

# ─── ADMIN USER MANAGEMENT ─────────────────────────────────────────────

@router.get("/admin/users")
async def admin_get_users(
    page: int = 1,
    limit: int = 20,
    role: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    db = get_db()
    query = {}
    if role:
        query["role"] = role
    if search:
        escaped = escape_regex(search)
        query["$or"] = [
            {"name": {"$regex": escaped, "$options": "i"}},
            {"email": {"$regex": escaped, "$options": "i"}},
            {"phone": {"$regex": escaped, "$options": "i"}}
        ]
        
    skip, page_limit, current_page = paginate_query(page, limit)
    total = await db.users.count_documents(query)
    
    cursor = db.users.find(query, {"password": 0}).sort("createdAt", -1).skip(skip).limit(page_limit)
    users = await cursor.to_list(length=page_limit)
    
    return {
        "success": True,
        "data": {"users": serialize_doc(users)},
        "pagination": build_pagination(total, current_page, page_limit)
    }

@router.post("/admin/users", status_code=status.HTTP_201_CREATED)
async def admin_create_user(body: AdminCreateUserSchema, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if body.role == "superadmin" and current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Only superadmins can create superadmins")
        
    db = get_db()
    email_clean = body.email.lower().strip()
    existing = await db.users.find_one({"email": email_clean})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user_doc = {
        "name": body.name.strip(),
        "email": email_clean,
        "phone": body.phone.strip(),
        "password": hash_password(body.password),
        "role": body.role or "customer",
        "isActive": body.isActive if body.isActive is not None else True,
        "addresses": [],
        "wishlist": [],
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    
    res = await db.users.insert_one(user_doc)
    user_doc["_id"] = res.inserted_id
    ser = serialize_doc(user_doc)
    ser.pop("password", None)
    return {"success": True, "data": {"user": ser}, "message": "User created"}

@router.put("/admin/users/{user_id}")
async def admin_update_user(user_id: str, body: AdminUpdateUserSchema, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if not is_valid_object_id(user_id):
        raise HTTPException(status_code=404, detail="User not found")
        
    db = get_db()
    u_oid = to_object_id(user_id)
    target = await db.users.find_one({"_id": u_oid})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
        
    if body.role == "superadmin" and current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Only superadmins can assign superadmin role")
    if target.get("role") == "superadmin" and current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Only superadmins can modify a superadmin")

    update_data = {}
    if body.name is not None:
        update_data["name"] = body.name.strip()
    if body.email is not None:
        e_clean = body.email.lower().strip()
        dup = await db.users.find_one({"email": e_clean, "_id": {"$ne": u_oid}})
        if dup:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_data["email"] = e_clean
    if body.phone is not None:
        update_data["phone"] = body.phone.strip()
    if body.role is not None:
        update_data["role"] = body.role
    if body.isActive is not None:
        update_data["isActive"] = body.isActive
    if body.password:
        update_data["password"] = hash_password(body.password)

    update_data["updatedAt"] = datetime.now(timezone.utc)

    updated = await db.users.find_one_and_update({"_id": u_oid}, {"$set": update_data}, return_document=True)
    ser = serialize_doc(updated)
    ser.pop("password", None)
    return {"success": True, "data": {"user": ser}, "message": "User updated"}

@router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if not is_valid_object_id(user_id):
        raise HTTPException(status_code=404, detail="User not found")
        
    db = get_db()
    u_oid = to_object_id(user_id)
    target = await db.users.find_one({"_id": u_oid})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
        
    if target.get("role") == "superadmin" and current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Only superadmins can delete a superadmin")
        
    await db.users.delete_one({"_id": u_oid})
    return {"success": True, "data": {}, "message": "User deleted"}
