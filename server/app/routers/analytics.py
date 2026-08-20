from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId

from app.db import get_db, to_object_id
from app.utils.auth import require_roles
from app.utils.helpers import serialize_doc, parse_datetime

router = APIRouter(prefix="/api/admin", tags=["analytics"])

@router.get("/dashboard-stats")
@router.get("/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    db = get_db()
    now = datetime.now(timezone.utc)
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    total_orders = await db.orders.count_documents({})
    today_orders = await db.orders.count_documents({"createdAt": {"$gte": start_of_today}})
    month_orders = await db.orders.count_documents({"createdAt": {"$gte": start_of_month}})
    
    total_rev_res = await db.orders.aggregate([
        {"$match": {"status": "delivered"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]).to_list(length=1)
    total_revenue = total_rev_res[0]["total"] if total_rev_res else 0
    
    month_rev_res = await db.orders.aggregate([
        {"$match": {"status": "delivered", "createdAt": {"$gte": start_of_month}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]).to_list(length=1)
    month_revenue = month_rev_res[0]["total"] if month_rev_res else 0
    
    total_products = await db.products.count_documents({"isActive": True})
    total_customers = await db.users.count_documents({"role": "customer"})
    today_customers = await db.users.count_documents({"role": "customer", "createdAt": {"$gte": start_of_today}})
    pending_orders = await db.orders.count_documents({"status": {"$in": ["pending", "confirmed"]}})
    # $elemMatch, not a dotted `variants.stock` path: on an array field Mongo
    # satisfies each operator independently, so a product with a sold-out pack
    # and a well-stocked one matched ($gt: 0 from the 50, $lte: 10 from the 0)
    # and was counted as low stock when nothing was low. Same trap as the price
    # filter in products.get_products.
    low_stock_products = await db.products.count_documents(
        {"variants": {"$elemMatch": {"stock": {"$gt": 0, "$lte": 10}}}, "isActive": True}
    )
    unread_contacts = await db.contacts.count_documents({"isRead": False})
    
    conversion_rate = f"{((total_orders / total_customers) * 100):.1f}" if total_customers > 0 else "0"

    return {
        "success": True,
        "data": {
            "stats": {
                "totalOrders": total_orders,
                "todayOrders": today_orders,
                "monthOrders": month_orders,
                "totalRevenue": total_revenue,
                "monthRevenue": month_revenue,
                "totalProducts": total_products,
                "totalCustomers": total_customers,
                "todayCustomers": today_customers,
                "pendingOrders": pending_orders,
                "lowStockProducts": low_stock_products,
                "unreadContacts": unread_contacts,
                "conversionRate": conversion_rate
            }
        }
    }

@router.get("/reports/revenue")
@router.get("/analytics/revenue")
async def get_revenue_report(
    period: str = "monthly",
    fromDate: Optional[str] = None,
    toDate: Optional[str] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    db = get_db()
    match_stage: dict[str, Any] = {"status": "delivered"}
    
    current_year = year or datetime.now(timezone.utc).year
    
    if period == "daily":
        start = parse_datetime(fromDate) if fromDate else (datetime.now(timezone.utc) - timedelta(days=30))
        end = parse_datetime(toDate, end_of_day=True) if toDate else datetime.now(timezone.utc)
        match_stage["createdAt"] = {"$gte": start, "$lte": end}
        group_stage = {"year": {"$year": "$createdAt"}, "month": {"$month": "$createdAt"}, "day": {"$dayOfMonth": "$createdAt"}}
        date_format = "daily"
    elif period == "weekly":
        start = parse_datetime(fromDate) if fromDate else (datetime.now(timezone.utc) - timedelta(days=90))
        end = parse_datetime(toDate, end_of_day=True) if toDate else datetime.now(timezone.utc)
        match_stage["createdAt"] = {"$gte": start, "$lte": end}
        group_stage = {"year": {"$year": "$createdAt"}, "week": {"$isoWeek": "$createdAt"}}
        date_format = "weekly"
    else:
        start = datetime(current_year, 1, 1, tzinfo=timezone.utc)
        end = datetime(current_year, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
        match_stage["createdAt"] = {"$gte": start, "$lte": end}
        group_stage = {"year": {"$year": "$createdAt"}, "month": {"$month": "$createdAt"}}
        date_format = "monthly"

    pipeline = [
        {"$match": match_stage},
        {"$group": {
            "_id": group_stage,
            "revenue": {"$sum": "$total"},
            "orders": {"$sum": 1},
            "items": {"$sum": {"$sum": "$items.quantity"}}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}}
    ]
    
    revenue = await db.orders.aggregate(pipeline).to_list(length=1000)
    return {"success": True, "data": {"revenue": revenue, "period": date_format}}

@router.get("/reports/top-products")
@router.get("/analytics/top-products")
async def get_top_products(limit: int = 10, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    db = get_db()
    cursor = db.products.find({"isActive": True}).sort("totalSold", -1).limit(limit)
    products_raw = await cursor.to_list(length=limit)
    
    product_ids = [p["_id"] for p in products_raw]
    
    pipeline = [
        {"$match": {"status": "delivered"}},
        {"$unwind": "$items"},
        {"$match": {"items.product": {"$in": product_ids}}},
        {"$group": {"_id": "$items.product", "revenue": {"$sum": "$items.total"}}}
    ]
    
    rev_by_product = await db.orders.aggregate(pipeline).to_list(length=len(product_ids))
    rev_map = {str(r["_id"]): r["revenue"] for r in rev_by_product}
    
    products_with_revenue = []
    for p in products_raw:
        # Populate category
        if p.get("category") and isinstance(p["category"], ObjectId):
            cat = await db.categories.find_one({"_id": p["category"]})
            p["category"] = {"_id": str(cat["_id"]), "name": cat.get("name"), "slug": cat.get("slug")} if cat else None
            
        p_ser = serialize_doc(p)
        p_ser["revenue"] = rev_map.get(str(p["_id"]), 0)
        products_with_revenue.append(p_ser)
        
    return {"success": True, "data": {"products": products_with_revenue}}

@router.get("/reports/customers")
@router.get("/analytics/customers")
async def get_customer_analytics(current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    db = get_db()
    now = datetime.now(timezone.utc)
    total_customers = await db.users.count_documents({"role": "customer"})
    
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    customers_this_month = await db.users.count_documents({"role": "customer", "createdAt": {"$gte": start_of_month}})
    
    repeat_pipeline = [
        {"$match": {"user": {"$ne": None}}},
        {"$group": {"_id": "$user", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}},
        {"$count": "total"}
    ]
    repeat_res = await db.orders.aggregate(repeat_pipeline).to_list(length=1)
    repeat_count = repeat_res[0]["total"] if repeat_res else 0
    repeat_rate = f"{((repeat_count / total_customers) * 100):.1f}" if total_customers > 0 else "0"
    
    top_customers_pipeline = [
        {"$match": {"status": "delivered", "user": {"$ne": None}}},
        {"$group": {
            "_id": "$user",
            "totalSpent": {"$sum": "$total"},
            "orderCount": {"$sum": 1},
            "lastOrder": {"$max": "$createdAt"}
        }},
        {"$sort": {"totalSpent": -1}},
        {"$limit": 10},
        {"$lookup": {
            "from": "users",
            "localField": "_id",
            "foreignField": "_id",
            "as": "user"
        }},
        {"$unwind": "$user"},
        {"$project": {
            "name": "$user.name",
            "email": "$user.email",
            "phone": "$user.phone",
            "totalSpent": 1,
            "orderCount": 1,
            "lastOrder": 1
        }}
    ]
    top_customers = await db.orders.aggregate(top_customers_pipeline).to_list(length=10)
    
    three_months_ago = now - timedelta(days=90)
    inactive_pipeline = [
        {"$match": {"user": {"$ne": None}}},
        {"$group": {"_id": "$user", "lastOrder": {"$max": "$createdAt"}}},
        {"$match": {"lastOrder": {"$lt": three_months_ago}}},
        {"$count": "total"}
    ]
    inactive_res = await db.orders.aggregate(inactive_pipeline).to_list(length=1)
    inactive_count = inactive_res[0]["total"] if inactive_res else 0

    return {
        "success": True,
        "data": {
            "analytics": {
                "totalCustomers": total_customers,
                "customersThisMonth": customers_this_month,
                "repeatCustomers": repeat_count,
                "repeatRate": repeat_rate,
                "inactiveCustomers": inactive_count,
                "topCustomers": serialize_doc(top_customers)
            }
        }
    }

@router.get("/reports/order-status")
@router.get("/analytics/order-status")
async def get_order_status_analytics(current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    db = get_db()
    statuses = ['pending', 'confirmed', 'packed', 'dispatched', 'out-for-delivery', 'delivered', 'cancelled', 'returned']
    
    # One grouped aggregation instead of eight sequential count_documents calls —
    # same numbers, a single round trip. Statuses with no orders still have to
    # appear (the dashboard renders a row per status), so the counts are merged
    # back onto the full list rather than taken straight from the aggregation.
    grouped = await db.orders.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]).to_list(length=None)
    counts = {g["_id"]: g["count"] for g in grouped}
    status_analytics = [{"status": s, "count": counts.get(s, 0)} for s in statuses]


    return {"success": True, "data": {"statusAnalytics": status_analytics}}

@router.get("/reports/inventory-alerts")
@router.get("/analytics/inventory-alerts")
@router.get("/analytics/inventory")
async def get_inventory_alerts(current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    db = get_db()
    out_of_stock_cursor = db.products.find(
        {"variants": {"$not": {"$elemMatch": {"stock": {"$gt": 0}}}}, "isActive": True},
        {"name": 1, "slug": 1, "images": 1, "variants": 1, "category": 1}
    )
    out_of_stock = await out_of_stock_cursor.to_list(length=500)
    
    # $elemMatch so one variant must itself be in the 1..10 band — see the
    # matching note in get_dashboard_stats.
    low_stock_cursor = db.products.find(
        {"variants": {"$elemMatch": {"stock": {"$gt": 0, "$lte": 10}}}, "isActive": True},
        {"name": 1, "slug": 1, "images": 1, "variants": 1, "category": 1}
    )
    low_stock = await low_stock_cursor.to_list(length=500)
    
    # Populate categories
    for p in out_of_stock + low_stock:
        if p.get("category") and isinstance(p["category"], ObjectId):
            cat = await db.categories.find_one({"_id": p["category"]})
            p["category"] = {"_id": str(cat["_id"]), "name": cat.get("name")} if cat else None

    return {
        "success": True,
        "data": {
            "alerts": {
                "outOfStock": len(out_of_stock),
                "lowStock": len(low_stock),
                "products": {
                    "outOfStock": serialize_doc(out_of_stock),
                    "lowStock": serialize_doc(low_stock)
                }
            }
        }
    }

@router.get("/reports/search-analytics")
@router.get("/analytics/search-analytics")
@router.get("/analytics/search")
async def get_search_analytics(current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    db = get_db()
    top_selling_cursor = db.products.find({"isActive": True}, {"name": 1, "slug": 1, "totalSold": 1}).sort("totalSold", -1).limit(10)
    top_selling = await top_selling_cursor.to_list(length=10)
    
    pipeline = [
        {"$match": {"isActive": True}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}, "totalSold": {"$sum": "$totalSold"}}},
        {"$sort": {"totalSold": -1}},
        {"$limit": 10},
        {"$lookup": {
            "from": "categories",
            "localField": "_id",
            "foreignField": "_id",
            "as": "category"
        }},
        {"$unwind": "$category"},
        {"$project": {
            "name": "$category.name",
            "slug": "$category.slug",
            "count": 1,
            "totalSold": 1
        }}
    ]
    popular_categories = await db.products.aggregate(pipeline).to_list(length=10)
    
    return {
        "success": True,
        "data": {
            "analytics": {
                "topSelling": serialize_doc(top_selling),
                "popularCategories": serialize_doc(popular_categories)
            }
        }
    }
