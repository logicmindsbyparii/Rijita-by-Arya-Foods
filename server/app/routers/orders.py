from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Query, Request
from typing import Optional, List, Any
from datetime import datetime, timezone
from collections import defaultdict
import secrets
import math
import time as _time

from app.db import get_db, to_object_id, is_valid_object_id
from app.utils.auth import get_optional_user, get_current_user, require_roles
from app.utils.helpers import serialize_doc, paginate_query, build_pagination, escape_regex, parse_datetime
from app.utils.inventory import restore_order_inventory, deduct_order_inventory
from app.models.order import (
    PlaceOrderSchema, UpdateOrderStatusSchema, BulkUpdateOrderStatusSchema
)

router = APIRouter(prefix="/api", tags=["orders"])

# In-memory rate limiter for the public phone-based order lookup. Bounds how
# often one caller (IP + phone pair) can query orders, so a script cannot
# enumerate customers' order details by scanning phone numbers.
_phone_lookup_hits: dict[str, list[float]] = defaultdict(list)


def _phone_lookup_allowed(key: str, limit: int = 10, window_seconds: int = 900) -> bool:
    now = _time.time()

    # Drop keys whose window has fully expired. Without this the dict only ever
    # grows: every distinct IP+phone pair ever tried stays resident, so a script
    # scanning phone numbers doubles as an unbounded memory leak on a long-lived
    # server process.
    for stale_key in [
        k for k, hits in _phone_lookup_hits.items()
        if k != key and (not hits or now - hits[-1] >= window_seconds)
    ]:
        del _phone_lookup_hits[stale_key]

    recent = [t for t in _phone_lookup_hits[key] if now - t < window_seconds]
    _phone_lookup_hits[key] = recent
    if len(recent) >= limit:
        return False
    recent.append(now)
    return True


def round_money(value: float) -> int:
    """Round to the nearest whole rupee, half-up — mirrors the client's `Math.round()`.

    Python's built-in `round()` uses banker's rounding (ties-to-even), so e.g.
    `round(80.5) == 80` while the checkout page's `Math.round(80.5) == 81`.
    Using banker's rounding on the server made the charged total occasionally
    differ by one rupee from the total shown at checkout.
    """
    return int(math.floor(value + 0.5))

def generate_order_number() -> str:
    import time
    ts = hex(int(time.time() * 1000))[2:].upper()
    rnd = secrets.token_hex(3).upper()
    return f"RIJ-{ts}-{rnd}"

async def cancel_shiprocket_shipment(db, order: dict) -> None:
    """Best-effort cancellation of a Shiprocket shipment when an order is cancelled.

    Never raises — a courier-side failure must not block cancelling our own order.
    """
    shipping = order.get("shipping") or {}
    if not shipping.get("shiprocketOrderId") or shipping.get("cancelledAt"):
        return

    from app.utils import shiprocket
    from app.utils.shiprocket import ShiprocketError
    from app.utils.logger import logger

    errors = []
    try:
        if shipping.get("awbCode"):
            await shiprocket.cancel_shipment(shipping["awbCode"])
        await shiprocket.cancel_order(shipping["shiprocketOrderId"])
    except ShiprocketError as exc:
        errors.append(exc.message)
        logger.warning(f"Shiprocket cancellation failed for {order.get('orderNumber')}: {exc.message}")
    except Exception as exc:
        errors.append(str(exc))
        logger.error(f"Unexpected Shiprocket cancellation error for {order.get('orderNumber')}: {exc}")

    shipping.update({
        "cancelledAt": datetime.now(timezone.utc),
        "status": "CANCELED" if not errors else shipping.get("status"),
        "error": "; ".join(errors) if errors else None,
    })
    await db.orders.update_one({"_id": order["_id"]}, {"$set": {"shipping": shipping}})

@router.post("/orders", status_code=status.HTTP_201_CREATED)
async def place_order(
    body: PlaceOrderSchema,
    background_tasks: BackgroundTasks,
    optional_user: Optional[dict] = Depends(get_optional_user),
):
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
        # The public catalogue only shows isActive products — a direct API call
        # must not be able to order one that's been unpublished.
        if not product.get("isActive", True):
            raise HTTPException(status_code=400, detail=f"{product.get('name', 'This product')} is no longer available")
            
        # Variants in this catalogue have no `_id` — `sku` is the only reliable
        # identity (VariantSchema makes sku required). Without this guard, an item
        # carrying neither a variant id nor a sku would match the first variant
        # whose own sku is also missing (None == None below) and silently bill the
        # customer for the wrong weight at the wrong price.
        if not v_id and not item.sku:
            raise HTTPException(
                status_code=400,
                detail=f"Missing variant selection for product: {product.get('name')}",
            )

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
            
        # usageLimit 0 means "no cap" — the admin UI treats 0 as unlimited
        # (mirroring maxDiscount), so only a positive limit is enforced.
        if coupon.get("usageLimit") and coupon.get("usedCount", 0) >= coupon["usageLimit"]:
            raise HTTPException(status_code=400, detail="Coupon usage limit reached")
            
        if subtotal < coupon.get("minOrderAmount", 0):
            raise HTTPException(status_code=400, detail=f"Minimum order amount of ₹{coupon.get('minOrderAmount')} required for this coupon")

        # NOTE: usedCount is NOT incremented here — it is reserved atomically
        # just before the order insert, and released again if the order fails,
        # so a failed order (DB error, stock conflict) never burns a coupon use.

        if coupon.get("type") == "percentage":
            calc = subtotal * (float(coupon.get("value", 0)) / 100.0)
            max_disc = coupon.get("maxDiscount")
            discount = min(calc, float(max_disc)) if max_disc else calc
        else:
            discount = min(float(coupon.get("value", 0)), subtotal)

        # Never discount more than the cart is worth, and never negatively.
        # A percentage coupon stored with value > 100 (an admin typo of 150 for
        # 15, say, with no maxDiscount cap) otherwise produced a discount larger
        # than the subtotal — which flowed straight into a negative GST amount
        # and a negative order total. The client already clamped with
        # Math.max(0, ...); the server did not, and the server is what charges.
        discount = max(0.0, min(discount, subtotal))

        # Round the discount to whole rupees half-up, matching the checkout
        # preview (Math.round), so the coupon shown to the customer is the
        # coupon that is actually applied.
        discount = round_money(discount)

    # Shipping and GST from settings. A 0 (or negative) value means "unset" —
    # fall back to the defaults so corrupted data can never make every order
    # free or wipe out GST. Mirrors the client preview's normalization.
    threshold = 499.0
    shipping_fee = 49.0
    gst_rate = 5.0
    
    settings = await db.site_settings.find_one()
    if settings:
        shipping_info = settings.get("shipping", {})
        threshold = float(shipping_info.get("freeShippingThreshold") or 499)
        if threshold <= 0:
            threshold = 499.0
        shipping_fee = float(shipping_info.get("standardDeliveryCharge") or 49)
        if shipping_fee <= 0:
            shipping_fee = 49.0
        gst_info = settings.get("gst", {})
        gst_rate = float(gst_info.get("rate") or 5)
        if gst_rate <= 0:
            gst_rate = 5.0

    delivery_charge = 0.0 if subtotal >= threshold else shipping_fee
    # Round GST half-up before it feeds the total, matching the checkout page:
    # it displays gstAmount = Math.round(discountedSubtotal * rate) and then
    # sums the rounded parts. Using the unrounded GST inside the total (with
    # banker's round on top) could make the charge differ from the preview.
    gst_amount = round_money((subtotal - discount) * (gst_rate / 100.0))
    grand_total = subtotal - discount + delivery_charge + gst_amount

    shipping_address = body.shippingAddress.model_dump()
    # Shiprocket needs a billing email — fall back to the signed-in user's address
    if not shipping_address.get("email") and optional_user:
        shipping_address["email"] = optional_user.get("email")

    order_doc = {
        "orderNumber": generate_order_number(),
        "user": to_object_id(optional_user["_id"]) if optional_user else None,
        "items": validated_items,
        "shippingAddress": shipping_address,
        "subtotal": round_money(subtotal),
        "discount": discount,
        "deliveryCharge": delivery_charge,
        "gstAmount": gst_amount,
        "total": round_money(grand_total),
        "coupon": coupon_code if coupon_code else None,
        "notes": body.notes,
        "status": "pending",
        "paymentStatus": "pending",
        "paymentMethod": body.paymentMethod or "whatsapp",
        "whatsappSent": False,
        "shipping": {"provider": "shiprocket"},
        "tracking": [{
            "status": "pending",
            "note": "Order placed successfully",
            "date": datetime.now(timezone.utc)
        }],
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }

    # Reserve the coupon redemption atomically, before the order exists. The
    # usageLimit check above is a plain read, so two concurrent checkouts could
    # both see usedCount == limit-1 and both redeem, pushing the coupon past its
    # cap. This conditional increment can only succeed for one of them; the loser
    # gets the same "limit reached" error it would have got a moment earlier.
    if coupon_code and coupon.get("usageLimit"):
        reserved = await db.coupons.update_one(
            {
                "code": coupon_code,
                "$or": [
                    {"usedCount": {"$lt": coupon["usageLimit"]}},
                    {"usedCount": {"$exists": False}},
                ],
            },
            {"$inc": {"usedCount": 1}},
        )
        if reserved.modified_count == 0:
            raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    elif coupon_code:
        await db.coupons.update_one({"code": coupon_code}, {"$inc": {"usedCount": 1}})

    try:
        res = await db.orders.insert_one(order_doc)
        order_doc["_id"] = res.inserted_id
    except Exception:
        # The order never made it into the DB, so the redemption we just reserved
        # would otherwise be burned forever with nothing to show for it.
        if coupon_code:
            await db.coupons.update_one({"code": coupon_code}, {"$inc": {"usedCount": -1}})
        raise

    # Deduct stock and increment totalSold. The deduction is atomic — the filter
    # requires the matched variant to still have enough stock, so two concurrent
    # orders can't both pass the pre-check above and oversell past zero. If a
    # variant sells out in the gap, restore the items already deducted, remove
    # the half-created order, and tell the customer what happened.
    deducted = []
    try:
        for item in validated_items:
            sku = item.get("sku")
            qty = item.get("quantity", 0)
            p_id = item.get("product")
            if sku:
                filter_q = {"_id": p_id, "variants": {"$elemMatch": {"sku": sku, "stock": {"$gte": qty}}}}
            else:
                filter_q = {"_id": p_id, "variants": {"$elemMatch": {"weight": item.get("variant"), "stock": {"$gte": qty}}}}
            result = await db.products.update_one(
                filter_q,
                {"$inc": {"variants.$.stock": -qty, "totalSold": qty}}
            )
            if result.modified_count == 0:
                raise HTTPException(status_code=409, detail=f"Just sold out: {item.get('productName')} ({item.get('weight')})")
            deducted.append(item)
    except Exception:
        for item in deducted:
            sku = item.get("sku")
            qty = item.get("quantity", 0)
            if sku:
                filter_q = {"_id": item.get("product"), "variants": {"$elemMatch": {"sku": sku}}}
            else:
                filter_q = {"_id": item.get("product"), "variants": {"$elemMatch": {"weight": item.get("variant")}}}
            await db.products.update_one(filter_q, {"$inc": {"variants.$.stock": qty, "totalSold": -qty}})
        await db.orders.delete_one({"_id": order_doc["_id"]})
        # The order is being unwound, so give the reserved coupon use back too —
        # otherwise a "just sold out" race quietly consumes one redemption.
        if coupon_code:
            await db.coupons.update_one({"code": coupon_code}, {"$inc": {"usedCount": -1}})
        raise

    # COD orders have no payment step to wait on, so they are shippable right away.
    # Prepaid orders are pushed from verify_payment instead.
    if str(order_doc["paymentMethod"]).lower() == "cod":
        from app.routers.shipping import auto_create_shipment
        background_tasks.add_task(auto_create_shipment, str(order_doc["_id"]))

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
    
    # Restore stock, totalSold and the coupon use
    await restore_order_inventory(db, order)

    await cancel_shiprocket_shipment(db, order)

    order["status"] = "cancelled"
    order["tracking"] = tracking
    return {"success": True, "data": {"order": serialize_doc(order)}, "message": "Order cancelled"}

@router.put("/orders/{order_number}/pay")
async def verify_payment(
    order_number: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_roles(["admin", "superadmin"])),
):
    db = get_db()
    order = await db.orders.find_one({"orderNumber": order_number})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.get("paymentStatus") == "completed":
        raise HTTPException(status_code=400, detail="Payment already completed")

    if order.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot mark a cancelled order as paid")
        
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

    # Paid orders are ready to ship — push to Shiprocket in the background when
    # auto-create is on. It is a no-op otherwise and never fails this request.
    from app.routers.shipping import auto_create_shipment
    background_tasks.add_task(auto_create_shipment, str(order["_id"]))

    return {"success": True, "data": {"order": serialize_doc(updated)}, "message": "Payment verified successfully"}

@router.get("/orders/track/{phone}")
async def get_order_by_phone(phone: str, request: Request):
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required")
        
    digits_only = "".join(filter(str.isdigit, phone))
    if len(digits_only) != 10:
        raise HTTPException(status_code=400, detail="Valid 10-digit phone number is required")

    # The response carries full order details (name, address, items) keyed by a
    # phone number, so throttle lookups per caller IP + phone.
    client_ip = request.client.host if request.client else "unknown"
    if not _phone_lookup_allowed(f"{client_ip}:{digits_only}"):
        raise HTTPException(
            status_code=429,
            detail="Too many lookup attempts. Please try again later.",
        )
        
    db = get_db()
    escaped = escape_regex(digits_only)
    # Anchored, not a substring match: checkout normalizes every stored phone to
    # exactly 10 digits, but any legacy row holding a longer string (a country
    # prefix, a typo'd 11th digit) would otherwise be returned in full — order
    # history, address and all — to whoever guessed a 10-digit fragment of it.
    phone_query = {"shippingAddress.phone": {"$regex": f"^{escaped}$"}}
    
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
            date_q["$gte"] = parse_datetime(fromDate)
        if toDate:
            date_q["$lte"] = parse_datetime(toDate, end_of_day=True)
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
    
    # One batched lookup for every customer on the page instead of a find_one per
    # order. This is the admin's busiest screen and it paginates 20 at a time, so
    # the old shape cost 20 extra round trips to Atlas on every load and filter.
    user_ids = {to_object_id(str(o["user"])) for o in orders_raw
                if o.get("user") and is_valid_object_id(str(o["user"]))}
    users_by_id = {}
    if user_ids:
        async for u in db.users.find({"_id": {"$in": list(user_ids)}},
                                     {"name": 1, "email": 1, "phone": 1}):
            users_by_id[str(u["_id"])] = {
                "_id": str(u["_id"]), "name": u.get("name"),
                "email": u.get("email"), "phone": u.get("phone"),
            }

    orders = []
    for o in orders_raw:
        o["user"] = users_by_id.get(str(o["user"])) if o.get("user") else None
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
            await restore_order_inventory(db, order)
            await cancel_shiprocket_shipment(db, order)
        elif new_status not in ["cancelled", "returned"] and prev_status in ["cancelled", "returned"]:
            await deduct_order_inventory(db, order)

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

    valid_statuses = ['pending', 'confirmed', 'packed', 'dispatched', 'out-for-delivery', 'delivered', 'cancelled', 'returned']
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid order status")

    if new_status in ["cancelled", "returned"] and prev_status not in ["cancelled", "returned"]:
        await restore_order_inventory(db, order)
        await cancel_shiprocket_shipment(db, order)
    elif new_status not in ["cancelled", "returned"] and prev_status in ["cancelled", "returned"]:
        await deduct_order_inventory(db, order)

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
        
    # Restore stock only if the order was not already cancelled/returned (those
    # transitions already restored it). The coupon release is guarded the same
    # way — decrementing it here on an already-cancelled order would double-count.
    if order.get("status") not in ["cancelled", "returned"]:
        await restore_order_inventory(db, order)

    await cancel_shiprocket_shipment(db, order)

    await db.orders.delete_one({"_id": order["_id"]})
    return {"success": True, "message": "Order deleted successfully"}
