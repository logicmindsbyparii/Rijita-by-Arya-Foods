from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List, Any
from datetime import datetime, timezone
import secrets
import math

from app.db import get_db, to_object_id, is_valid_object_id
from app.utils.auth import get_optional_user, get_current_user, require_roles
from app.utils.helpers import serialize_doc, paginate_query, build_pagination, escape_regex
from app.models.order import (
    PlaceOrderSchema, UpdateOrderStatusSchema, BulkUpdateOrderStatusSchema
)

router = APIRouter(prefix="/api", tags=["orders"])

def generate_order_number() -> str:
    import time
    ts = hex(int(time.time() * 1000))[2:].upper()
    rnd = secrets.token_hex(3).upper()
    return f"RIJ-{ts}-{rnd}"

@router.post("/orders", status_code=status.HTTP_201_CREATED)
async def place_order(body: PlaceOrderSchema, optional_user: Optional[dict] = Depends(get_optional_user)):
    if not body.items or len(body.items) == 0:
        raise HTTPException(status_code=400, detail="Cart is empty")
        
    db = get_db()
    coupon_code = (body.coupon or body.couponCode or "").strip().upper()
    
    subtotal = 0.0
    validated_items = []
    
    for item in body.items:
        p_id = item.product or item.productId
        v_id = item.variant or item.variantId
        
        if not p_id or not is_valid_object_id(p_id):
            raise HTTPException(status_code=400, detail=f"Invalid product ID: {p_id}")
            
        product = await db.products.find_one({"_id": to_object_id(p_id)})
        if not product:
            raise HTTPException(status_code=400, detail=f"Product not found: {p_id}")
            
        variants = product.get("variants", [])
        variant = None
        for v in variants:
            if str(v.get("_id")) == v_id or v.get("sku") == item.sku:
                variant = v
                break
                
        if not variant:
            raise HTTPException(status_code=400, detail=f"Variant not found for product: {product.get('name')}")
            
        if not variant.get("isActive", True):
            raise HTTPException(status_code=400, detail=f"This variant of {product.get('name')} is no longer available")
            
        if variant.get("stock", 0) < item.quantity:
            raise HTTPException(status_code=409, detail=f"Insufficient stock for {product.get('name')} ({variant.get('weight')})")
            
        total_item_price = float(variant.get("sellingPrice", 0)) * item.quantity
        subtotal += total_item_price
        
        weight_str = f"{variant.get('weightValue', '')}{variant.get('weightUnit', '')}"
        validated_items.append({
            "product": product["_id"],
            "productName": product.get("name"),
            "variant": variant.get("weight"),
            "sku": variant.get("sku"),
            "weight": weight_str,
            "quantity": item.quantity,
            "mrp": float(variant.get("mrp", 0)),
            "price": float(variant.get("sellingPrice", 0)),
            "total": total_item_price,
            "image": product.get("images", [""])[0] if product.get("images") else ""
        })

    discount = 0.0
    if coupon_code:
        coupon = await db.coupons.find_one({"code": coupon_code})
        if not coupon:
            raise HTTPException(status_code=400, detail="Invalid coupon code")
        if not coupon.get("isActive", True):
            raise HTTPException(status_code=400, detail="This coupon is no longer active")
            
        now = datetime.now(timezone.utc)
        if coupon.get("startsAt") and now < coupon["startsAt"].replace(tzinfo=timezone.utc if coupon["startsAt"].tzinfo is None else coupon["startsAt"].tzinfo):
            raise HTTPException(status_code=400, detail="This coupon is not yet valid")
        if coupon.get("expiresAt") and now > coupon["expiresAt"].replace(tzinfo=timezone.utc if coupon["expiresAt"].tzinfo is None else coupon["expiresAt"].tzinfo):
            raise HTTPException(status_code=400, detail="This coupon has expired")
            
        if coupon.get("usedCount", 0) >= coupon.get("usageLimit", 100):
            raise HTTPException(status_code=400, detail="Coupon usage limit reached")
            
        if subtotal < coupon.get("minOrderAmount", 0):
            raise HTTPException(status_code=400, detail=f"Minimum order amount of ₹{coupon.get('minOrderAmount')} required for this coupon")

        # Increment used count
        await db.coupons.update_one({"_id": coupon["_id"]}, {"$inc": {"usedCount": 1}})
        
        if coupon.get("type") == "percentage":
            calc = subtotal * (float(coupon.get("value", 0)) / 100.0)
            max_disc = coupon.get("maxDiscount")
            discount = min(calc, float(max_disc)) if max_disc else calc
        else:
            discount = min(float(coupon.get("value", 0)), subtotal)

    # Shipping and GST from settings
    threshold = 499.0
    shipping_fee = 49.0
    gst_rate = 5.0
    
    settings = await db.site_settings.find_one()
    if settings:
        shipping_info = settings.get("shipping", {})
        threshold = float(shipping_info.get("freeShippingThreshold", 499))
        shipping_fee = float(shipping_info.get("standardDeliveryCharge", 49))
        gst_info = settings.get("gst", {})
        gst_rate = float(gst_info.get("rate", 5))

    delivery_charge = 0.0 if subtotal >= threshold else shipping_fee
    gst_amount = (subtotal - discount) * (gst_rate / 100.0)
    grand_total = subtotal - discount + delivery_charge + gst_amount

    order_doc = {
        "orderNumber": generate_order_number(),
        "user": to_object_id(optional_user["_id"]) if optional_user else None,
        "items": validated_items,
        "shippingAddress": body.shippingAddress.model_dump(),
        "subtotal": round(subtotal),
        "discount": round(discount),
        "deliveryCharge": delivery_charge,
        "gstAmount": round(gst_amount),
        "total": round(grand_total),
        "coupon": coupon_code if coupon_code else None,
        "notes": body.notes,
        "status": "pending",
        "paymentStatus": "pending",
        "paymentMethod": body.paymentMethod or "whatsapp",
        "whatsappSent": False,
        "tracking": [{
            "status": "pending",
            "note": "Order placed successfully",
            "date": datetime.now(timezone.utc)
        }],
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }

    res = await db.orders.insert_one(order_doc)
    order_doc["_id"] = res.inserted_id

    # Deduct stock and increment totalSold
    for item in validated_items:
        sku = item.get("sku")
        qty = item.get("quantity", 0)
        p_id = item.get("product")
        
        if sku:
            await db.products.update_one(
                {"_id": p_id, "variants.sku": sku},
                {"$inc": {"variants.$.stock": -qty, "totalSold": qty}}
            )
        else:
            await db.products.update_one(
                {"_id": p_id, "variants.weight": item.get("variant")},
                {"$inc": {"variants.$.stock": -qty, "totalSold": qty}}
            )

    return {"success": True, "data": {"order": serialize_doc(order_doc)}, "message": "Order placed successfully"}

@router.get("/orders/my-orders")
async def get_my_orders(
    page: int = 1,
    limit: int = 10,
    status: Optional[str] = None,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required to view orders")
        
    db = get_db()
    query: dict[str, Any] = {"user": to_object_id(current_user["_id"])}
    if status:
        query["status"] = status
        
    skip, page_limit, current_page = paginate_query(page, limit)
    total = await db.orders.count_documents(query)
    
    cursor = db.orders.find(query).sort("createdAt", -1).skip(skip).limit(page_limit)
    orders = await cursor.to_list(length=page_limit)
    
    return {
        "success": True,
        "data": {"orders": serialize_doc(orders)},
        "pagination": build_pagination(total, current_page, page_limit)
    }

@router.get("/orders/number/{order_number}")
async def get_order_by_number(order_number: str, optional_user: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    order = await db.orders.find_one({"orderNumber": order_number})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order_user_id = str(order.get("user")) if order.get("user") else None
    if order_user_id:
        if not optional_user:
            raise HTTPException(status_code=401, detail="Authentication required to view this order")
        current_id = str(optional_user["_id"])
        role = optional_user.get("role", "")
        if current_id != order_user_id and role not in ["admin", "superadmin"]:
            raise HTTPException(status_code=403, detail="You can only view your own orders")
            
    return {"success": True, "data": {"order": serialize_doc(order)}}

@router.put("/orders/{order_number}/cancel")
async def cancel_order(order_number: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    order = await db.orders.find_one({"orderNumber": order_number})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order_user_id = str(order.get("user")) if order.get("user") else None
    if order_user_id != str(current_user["_id"]) and current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="You can only cancel your own orders")
        
    if order.get("status") in ["delivered", "cancelled", "returned"]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel order that is {order.get('status')}")
        
    tracking = order.get("tracking", [])
    tracking.append({"status": "cancelled", "note": "Order cancelled", "date": datetime.now(timezone.utc)})
    
    await db.orders.update_one(
        {"_id": order["_id"]},
        {"$set": {"status": "cancelled", "tracking": tracking, "updatedAt": datetime.now(timezone.utc)}}
    )
    
    # Restore stock
    for item in order.get("items", []):
        sku = item.get("sku")
        qty = item.get("quantity", 0)
        p_id = item.get("product")
        if sku:
            await db.products.update_one(
                {"_id": p_id, "variants.sku": sku},
                {"$inc": {"variants.$.stock": qty, "totalSold": -qty}}
            )
        else:
            await db.products.update_one(
                {"_id": p_id, "variants.weight": item.get("variant")},
                {"$inc": {"variants.$.stock": qty, "totalSold": -qty}}
            )
            
    if order.get("coupon"):
        await db.coupons.update_one({"code": order.get("coupon")}, {"$inc": {"usedCount": -1}})
        
    order["status"] = "cancelled"
    order["tracking"] = tracking
    return {"success": True, "data": {"order": serialize_doc(order)}, "message": "Order cancelled"}

@router.put("/orders/{order_number}/pay")
async def verify_payment(order_number: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    db = get_db()
    order = await db.orders.find_one({"orderNumber": order_number})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.get("paymentStatus") == "completed":
        raise HTTPException(status_code=400, detail="Payment already completed")
        
    update_fields = {"paymentStatus": "completed", "updatedAt": datetime.now(timezone.utc)}
    tracking = order.get("tracking", [])
    if order.get("status") == "pending":
        update_fields["status"] = "confirmed"
        tracking.append({"status": "confirmed", "note": "Payment successful, order confirmed", "date": datetime.now(timezone.utc)})
        update_fields["tracking"] = tracking
        
    updated = await db.orders.find_one_and_update(
        {"_id": order["_id"]},
        {"$set": update_fields},
        return_document=True
    )
    return {"success": True, "data": {"order": serialize_doc(updated)}, "message": "Payment verified successfully"}

@router.get("/orders/track/{phone}")
async def get_order_by_phone(phone: str):
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required")
        
    digits_only = "".join(filter(str.isdigit, phone))
    if len(digits_only) != 10:
        raise HTTPException(status_code=400, detail="Valid 10-digit phone number is required")
        
    db = get_db()
    escaped = escape_regex(digits_only)
    phone_query = {"shippingAddress.phone": {"$regex": escaped, "$options": "i"}}
    
    total = await db.orders.count_documents(phone_query)
    cursor = db.orders.find(phone_query).sort("createdAt", -1).limit(5)
    orders = await cursor.to_list(length=5)
    
    return {
        "success": True,
        "data": {"orders": serialize_doc(orders)},
        "pagination": build_pagination(total, 1, 5)
    }

@router.get("/admin/orders")
async def admin_get_orders(
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    paymentStatus: Optional[str] = None,
    search: Optional[str] = None,
    fromDate: Optional[str] = None,
    toDate: Optional[str] = None,
    current_user: dict = Depends(require_roles(["admin", "superadmin"]))
):
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    if paymentStatus:
        query["paymentStatus"] = paymentStatus
        
    if fromDate or toDate:
        date_q = {}
        if fromDate:
            date_q["$gte"] = datetime.fromisoformat(fromDate)
        if toDate:
            date_q["$lte"] = datetime.fromisoformat(toDate)
        query["createdAt"] = date_q
        
    if search:
        escaped = escape_regex(search)
        query["$or"] = [
            {"orderNumber": {"$regex": escaped, "$options": "i"}},
            {"shippingAddress.fullName": {"$regex": escaped, "$options": "i"}},
            {"shippingAddress.phone": {"$regex": escaped, "$options": "i"}}
        ]
        
    skip, page_limit, current_page = paginate_query(page, limit)
    total = await db.orders.count_documents(query)
    
    cursor = db.orders.find(query).sort("createdAt", -1).skip(skip).limit(page_limit)
    orders_raw = await cursor.to_list(length=page_limit)
    
    orders = []
    for o in orders_raw:
        if o.get("user") and is_valid_object_id(str(o["user"])):
            u = await db.users.find_one({"_id": to_object_id(str(o["user"]))})
            if u:
                o["user"] = {"_id": str(u["_id"]), "name": u.get("name"), "email": u.get("email"), "phone": u.get("phone")}
            else:
                o["user"] = None
        else:
            o["user"] = None
        orders.append(serialize_doc(o))
        
    return {
        "success": True,
        "data": {"orders": orders},
        "pagination": build_pagination(total, current_page, page_limit)
    }

@router.get("/admin/orders/analytics")
async def get_order_analytics(current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    db = get_db()
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": {"$in": ["pending", "confirmed"]}})
    completed_orders = await db.orders.count_documents({"status": "delivered"})
    cancelled_orders = await db.orders.count_documents({"status": "cancelled"})
    
    rev_pipeline = [
        {"$match": {"status": "delivered"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    rev_res = await db.orders.aggregate(rev_pipeline).to_list(length=1)
    total_revenue = rev_res[0]["total"] if rev_res else 0
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_orders = await db.orders.count_documents({"createdAt": {"$gte": today}})
    whatsapp_orders = await db.orders.count_documents({"whatsappSent": True})
    
    return {
        "success": True,
        "data": {
            "analytics": {
                "totalOrders": total_orders,
                "pendingOrders": pending_orders,
                "completedOrders": completed_orders,
                "cancelledOrders": cancelled_orders,
                "totalRevenue": total_revenue,
                "todayOrders": today_orders,
                "whatsappOrders": whatsapp_orders
            }
        }
    }

@router.put("/admin/orders/bulk-status")
async def bulk_update_order_status(body: BulkUpdateOrderStatusSchema, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if not body.orderIds or len(body.orderIds) == 0:
        raise HTTPException(status_code=400, detail="Array of orderIds is required")
        
    valid_statuses = ['pending', 'confirmed', 'packed', 'dispatched', 'out-for-delivery', 'delivered', 'cancelled', 'returned']
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid order status")
        
    db = get_db()
    order_oids = [to_object_id(oid) for oid in body.orderIds if is_valid_object_id(oid)]
    
    orders = await db.orders.find({"_id": {"$in": order_oids}}).to_list(length=len(order_oids))
    
    modified_count = 0
    for order in orders:
        prev_status = order.get("status")
        new_status = body.status
        
        # Adjust stock if transition involves cancel/return
        if new_status in ["cancelled", "returned"] and prev_status not in ["cancelled", "returned"]:
            for item in order.get("items", []):
                sku = item.get("sku")
                qty = item.get("quantity", 0)
                p_id = item.get("product")
                if sku:
                    await db.products.update_one({"_id": p_id, "variants.sku": sku}, {"$inc": {"variants.$.stock": qty, "totalSold": -qty}})
                else:
                    await db.products.update_one({"_id": p_id, "variants.weight": item.get("variant")}, {"$inc": {"variants.$.stock": qty, "totalSold": -qty}})
            if order.get("coupon"):
                await db.coupons.update_one({"code": order.get("coupon")}, {"$inc": {"usedCount": -1}})
        elif new_status not in ["cancelled", "returned"] and prev_status in ["cancelled", "returned"]:
            for item in order.get("items", []):
                sku = item.get("sku")
                qty = item.get("quantity", 0)
                p_id = item.get("product")
                if sku:
                    await db.products.update_one({"_id": p_id, "variants.sku": sku}, {"$inc": {"variants.$.stock": -qty, "totalSold": qty}})
                else:
                    await db.products.update_one({"_id": p_id, "variants.weight": item.get("variant")}, {"$inc": {"variants.$.stock": -qty, "totalSold": qty}})
            if order.get("coupon"):
                await db.coupons.update_one({"code": order.get("coupon")}, {"$inc": {"usedCount": 1}})
                
        tracking = order.get("tracking", [])
        tracking.append({"status": new_status, "note": body.note or f"Bulk update: Order {new_status}", "date": datetime.now(timezone.utc)})
        
        update_doc = {
            "status": new_status,
            "tracking": tracking,
            "updatedAt": datetime.now(timezone.utc)
        }
        if new_status == "delivered":
            update_doc["paymentStatus"] = "completed"
            
        await db.orders.update_one({"_id": order["_id"]}, {"$set": update_doc})
        modified_count += 1
        
    return {"success": True, "data": {"modifiedCount": modified_count}, "message": f"{modified_count} orders updated to {body.status}"}

@router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, body: UpdateOrderStatusSchema, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if not is_valid_object_id(order_id):
        raise HTTPException(status_code=404, detail="Order not found")
        
    db = get_db()
    order = await db.orders.find_one({"_id": to_object_id(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    prev_status = order.get("status")
    new_status = body.status
    
    if new_status in ["cancelled", "returned"] and prev_status not in ["cancelled", "returned"]:
        for item in order.get("items", []):
            sku = item.get("sku")
            qty = item.get("quantity", 0)
            p_id = item.get("product")
            if sku:
                await db.products.update_one({"_id": p_id, "variants.sku": sku}, {"$inc": {"variants.$.stock": qty, "totalSold": -qty}})
            else:
                await db.products.update_one({"_id": p_id, "variants.weight": item.get("variant")}, {"$inc": {"variants.$.stock": qty, "totalSold": -qty}})
        if order.get("coupon"):
            await db.coupons.update_one({"code": order.get("coupon")}, {"$inc": {"usedCount": -1}})
    elif new_status not in ["cancelled", "returned"] and prev_status in ["cancelled", "returned"]:
        for item in order.get("items", []):
            sku = item.get("sku")
            qty = item.get("quantity", 0)
            p_id = item.get("product")
            if sku:
                await db.products.update_one({"_id": p_id, "variants.sku": sku}, {"$inc": {"variants.$.stock": -qty, "totalSold": qty}})
            else:
                await db.products.update_one({"_id": p_id, "variants.weight": item.get("variant")}, {"$inc": {"variants.$.stock": -qty, "totalSold": qty}})
        if order.get("coupon"):
            await db.coupons.update_one({"code": order.get("coupon")}, {"$inc": {"usedCount": 1}})
            
    tracking = order.get("tracking", [])
    tracking.append({"status": new_status, "note": body.note or f"Order {new_status}", "date": datetime.now(timezone.utc)})
    
    update_doc = {
        "status": new_status,
        "tracking": tracking,
        "updatedAt": datetime.now(timezone.utc)
    }
    if new_status == "delivered":
        update_doc["paymentStatus"] = "completed"
        
    updated = await db.orders.find_one_and_update(
        {"_id": order["_id"]},
        {"$set": update_doc},
        return_document=True
    )
    
    return {"success": True, "data": {"order": serialize_doc(updated)}, "message": "Order status updated"}

@router.delete("/admin/orders/{order_id}")
async def delete_order(order_id: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    if not is_valid_object_id(order_id):
        raise HTTPException(status_code=404, detail="Order not found")
        
    db = get_db()
    order = await db.orders.find_one({"_id": to_object_id(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.get("status") not in ["cancelled", "returned"]:
        for item in order.get("items", []):
            sku = item.get("sku")
            qty = item.get("quantity", 0)
            p_id = item.get("product")
            if sku:
                await db.products.update_one({"_id": p_id, "variants.sku": sku}, {"$inc": {"variants.$.stock": qty, "totalSold": -qty}})
            else:
                await db.products.update_one({"_id": p_id, "variants.weight": item.get("variant")}, {"$inc": {"variants.$.stock": qty, "totalSold": -qty}})
                
    if order.get("coupon"):
        await db.coupons.update_one({"code": order.get("coupon")}, {"$inc": {"usedCount": -1}})
        
    await db.orders.delete_one({"_id": order["_id"]})
    return {"success": True, "message": "Order deleted successfully"}
