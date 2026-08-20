from fastapi import APIRouter, Depends, HTTPException, Request, status
from typing import Optional, Any
from datetime import datetime, timezone
import secrets

from app.config import settings
from app.db import get_db, to_object_id, is_valid_object_id
from app.utils.auth import get_optional_user, require_roles
from app.utils.helpers import serialize_doc
from app.utils.inventory import restore_order_inventory
from app.utils.logger import logger
from app.utils import shiprocket
from app.utils.shiprocket import ShiprocketError
from app.models.shipping import (
    ServiceabilitySchema, CreateShipmentSchema, AssignAwbSchema, CancelShipmentSchema
)

router = APIRouter(prefix="/api", tags=["shipping"])


# ─── Config & shared helpers ────────────────────────────────────────────

async def get_shiprocket_config(db) -> dict:
    """Env defaults, overridden by anything the admin set in Site Settings."""
    config = {
        "pickupLocation": settings.SHIPROCKET_PICKUP_LOCATION,
        "pickupPincode": settings.SHIPROCKET_PICKUP_PINCODE,
        "channelId": settings.SHIPROCKET_CHANNEL_ID,
        "length": settings.SHIPROCKET_PACKAGE_LENGTH,
        "breadth": settings.SHIPROCKET_PACKAGE_BREADTH,
        "height": settings.SHIPROCKET_PACKAGE_HEIGHT,
        "packagingWeight": settings.SHIPROCKET_PACKAGING_WEIGHT,
        "autoCreate": settings.SHIPROCKET_AUTO_CREATE,
        "fallbackEmail": settings.ADMIN_EMAIL,
    }

    site_settings = await db.site_settings.find_one() or {}
    overrides = (site_settings.get("shipping") or {}).get("shiprocket") or {}
    for key in ("pickupLocation", "pickupPincode", "channelId", "length", "breadth", "height", "packagingWeight"):
        value = overrides.get(key)
        if value not in (None, "", 0):
            config[key] = value
    if isinstance(overrides.get("autoCreate"), bool):
        config["autoCreate"] = overrides["autoCreate"]

    return config


def _handle(exc: ShiprocketError) -> HTTPException:
    """Surface Shiprocket failures as themselves, not as a generic 500."""
    code = exc.status_code if exc.status_code in (400, 401, 403, 404, 409, 422, 429, 503, 504) else 502
    return HTTPException(status_code=code, detail=exc.message)


def _order_or_404(order: Optional[dict]) -> dict:
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


async def _load_admin_order(order_id: str) -> dict:
    if not is_valid_object_id(order_id):
        raise HTTPException(status_code=404, detail="Order not found")
    db = get_db()
    return _order_or_404(await db.orders.find_one({"_id": to_object_id(order_id)}))


async def _save_shipping(db, order: dict, patch: dict) -> dict:
    """Merge a patch into order.shipping and return the updated order."""
    shipping = dict(order.get("shipping") or {})
    shipping.update(patch)
    shipping["provider"] = "shiprocket"
    shipping["updatedAt"] = datetime.now(timezone.utc)

    updated = await db.orders.find_one_and_update(
        {"_id": order["_id"]},
        {"$set": {"shipping": shipping, "updatedAt": datetime.now(timezone.utc)}},
        return_document=True,
    )
    return updated or {**order, "shipping": shipping}


async def apply_tracking(db, order: dict, tracking: dict, source: str = "Shiprocket") -> dict:
    """Write a normalised Shiprocket tracking payload onto an order.

    Advances order.status only when Shiprocket reports a status we recognise and
    the order is not already in a terminal state set by a human.
    """
    now = datetime.now(timezone.utc)
    raw_status = tracking.get("currentStatus")

    patch = {
        "scans": tracking.get("scans") or [],
        "lastSyncedAt": now,
    }
    # Never clobber a previously stored courier status with None — some
    # webhook/API payloads omit current_status entirely.
    if raw_status:
        patch["status"] = raw_status
    for key, field in (
        ("awb", "awbCode"),
        ("courierName", "courierName"),
        ("trackUrl", "trackUrl"),
        ("expectedDeliveryDate", "expectedDeliveryDate"),
        ("deliveredDate", "deliveredDate"),
    ):
        if tracking.get(key):
            patch[field] = tracking[key]

    updates: dict[str, Any] = {}
    mapped = shiprocket.map_status(raw_status)
    current_status = order.get("status")

    if mapped and mapped != current_status and current_status not in ("cancelled", "returned"):
        timeline = list(order.get("tracking") or [])
        timeline.append({
            "status": mapped,
            "note": f"{source}: {raw_status}",
            "location": (tracking.get("scans") or [{}])[0].get("location") if tracking.get("scans") else None,
            "date": now,
        })
        updates["status"] = mapped
        updates["tracking"] = timeline
        if mapped == "delivered":
            updates["paymentStatus"] = "completed"
        # An RTO or courier-side cancellation lands here (STATUS_MAP routes
        # seven RTO/RETURN labels to "returned"), and it has to put stock back
        # exactly like the admin and cron cancel paths do. Without this a
        # returned order kept its stock deducted forever and quietly walked the
        # product toward a false "sold out". The surrounding condition is the
        # idempotency guard: we only get here on a real transition *into* a
        # terminal state from a non-terminal one.
        if mapped in ("cancelled", "returned"):
            await restore_order_inventory(db, order)

    shipping = dict(order.get("shipping") or {})
    shipping.update(patch)
    shipping["provider"] = "shiprocket"
    updates["shipping"] = shipping
    updates["updatedAt"] = now

    updated = await db.orders.find_one_and_update(
        {"_id": order["_id"]}, {"$set": updates}, return_document=True
    )
    return updated or {**order, **updates}


# ─── Storefront ─────────────────────────────────────────────────────────

@router.post("/shipping/serviceability")
async def check_serviceability(body: ServiceabilitySchema):
    """Pincode check + live courier rates for the checkout page."""
    db = get_db()
    config = await get_shiprocket_config(db)

    pincode = "".join(ch for ch in body.deliveryPincode if ch.isdigit())
    if len(pincode) != 6:
        raise HTTPException(status_code=400, detail="Enter a valid 6-digit pincode")

    pickup_pincode = config.get("pickupPincode")
    if not pickup_pincode:
        raise HTTPException(
            status_code=503,
            detail="Pickup pincode is not configured. Set it under Settings → Shipping.",
        )

    if not shiprocket.is_configured():
        raise HTTPException(status_code=503, detail="Shiprocket is not configured")

    # Prefer real variant weights from the DB over anything the client claims.
    weight = body.weight
    if body.items:
        resolved = []
        for item in body.items:
            product_id = item.get("product") or item.get("productId")
            if not product_id or not is_valid_object_id(str(product_id)):
                continue
            product = await db.products.find_one({"_id": to_object_id(str(product_id))})
            if not product:
                continue
            variant_id = item.get("variant") or item.get("variantId")
            variant = next(
                (v for v in product.get("variants", [])
                 if str(v.get("_id")) == str(variant_id) or v.get("sku") == item.get("sku")),
                None,
            )
            if not variant:
                continue
            resolved.append({
                "weight": f"{variant.get('weightValue', '')}{variant.get('weightUnit', 'g')}",
                "quantity": int(item.get("quantity", 1) or 1),
            })
        if resolved:
            weight = shiprocket.estimate_package_weight(
                resolved, float(config.get("packagingWeight") or 0)
            )

    if not weight:
        weight = 0.5

    try:
        response = await shiprocket.check_serviceability(
            pickup_pincode, pincode, float(weight), body.cod, body.declaredValue
        )
    except ShiprocketError as exc:
        raise _handle(exc)

    data = response.get("data") or {}
    available = data.get("available_courier_companies") or []

    couriers = []
    for courier in available:
        if not isinstance(courier, dict):
            continue
        couriers.append({
            "id": courier.get("courier_company_id"),
            "name": courier.get("courier_name"),
            "rate": courier.get("rate"),
            "codCharges": courier.get("cod_charges"),
            "codAvailable": bool(courier.get("cod")),
            "estimatedDays": courier.get("estimated_delivery_days"),
            "etd": courier.get("etd"),
            "rating": courier.get("rating"),
        })

    def _rate(courier):
        try:
            return float(courier.get("rate") or 0)
        except (TypeError, ValueError):
            return float("inf")

    def _days(courier):
        try:
            return float(courier.get("estimatedDays") or 99)
        except (TypeError, ValueError):
            return 99.0

    cheapest = min(couriers, key=_rate) if couriers else None
    fastest = min(couriers, key=_days) if couriers else None
    recommended_id = data.get("recommended_courier_company_id")
    recommended = next((c for c in couriers if c["id"] == recommended_id), cheapest)

    return {
        "success": True,
        "data": {
            "serviceable": len(couriers) > 0,
            "pincode": pincode,
            "weight": weight,
            "couriers": couriers,
            "cheapest": cheapest,
            "fastest": fastest,
            "recommended": recommended,
        },
    }


@router.get("/shipping/track/{order_number}")
async def track_order(order_number: str, optional_user: Optional[dict] = Depends(get_optional_user)):
    """Live courier tracking for one order — same access rules as the order itself."""
    db = get_db()
    order = _order_or_404(await db.orders.find_one({"orderNumber": order_number}))

    owner_id = str(order.get("user")) if order.get("user") else None
    if owner_id:
        if not optional_user:
            raise HTTPException(status_code=401, detail="Authentication required to view this order")
        if str(optional_user["_id"]) != owner_id and optional_user.get("role") not in ("admin", "superadmin"):
            raise HTTPException(status_code=403, detail="You can only track your own orders")

    shipping = order.get("shipping") or {}
    awb = shipping.get("awbCode")
    shipment_id = shipping.get("shipmentId")

    if not awb and not shipment_id:
        return {
            "success": True,
            "data": {"shipped": False, "shipping": serialize_doc(shipping) or {}, "tracking": None},
        }

    try:
        raw = await shiprocket.track_awb(awb) if awb else await shiprocket.track_shipment(shipment_id)
    except ShiprocketError as exc:
        # A tracking outage must not break the order page — serve the last sync.
        logger.warning(f"Shiprocket tracking failed for {order_number}: {exc.message}")
        return {
            "success": True,
            "data": {
                "shipped": True,
                "stale": True,
                "shipping": serialize_doc(shipping),
                "tracking": {
                    "awb": awb,
                    "courierName": shipping.get("courierName"),
                    "currentStatus": shipping.get("status"),
                    "trackUrl": shipping.get("trackUrl"),
                    "expectedDeliveryDate": shipping.get("expectedDeliveryDate"),
                    "scans": shipping.get("scans") or [],
                },
            },
        }

    tracking = shiprocket.normalise_tracking(raw)
    updated = await apply_tracking(db, order, tracking)

    return {
        "success": True,
        "data": {
            "shipped": True,
            "stale": False,
            "shipping": serialize_doc(updated.get("shipping")),
            "tracking": tracking,
            "orderStatus": updated.get("status"),
        },
    }


# ─── Webhook ────────────────────────────────────────────────────────────

@router.post("/shipping/webhook/shiprocket")
async def shiprocket_webhook(request: Request):
    """Shiprocket status push. Authenticated by the x-api-key header you set in
    Shiprocket → Settings → API → Webhooks."""
    expected = settings.SHIPROCKET_WEBHOOK_TOKEN
    if not expected:
        logger.warning("Shiprocket webhook received but SHIPROCKET_WEBHOOK_TOKEN is unset — rejecting")
        raise HTTPException(status_code=503, detail="Webhook is not configured")

    # Constant-time compare — a plain `!=` leaks the token a character at a
    # time to anyone who can measure response latency across many attempts.
    provided = request.headers.get("x-api-key") or ""
    if not secrets.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="Invalid webhook token")

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Invalid payload")

    # `channel_order_id` is our own orderNumber (set when the adhoc order was
    # created); `order_id` is Shiprocket's internal id, which we store back on
    # the order as shipping.shiprocketOrderId. Prefer our own reference first.
    channel_order_id = body.get("channel_order_id")
    shiprocket_order_id = body.get("order_id")
    awb = body.get("awb")

    db = get_db()
    order = None
    if channel_order_id:
        order = await db.orders.find_one({"orderNumber": str(channel_order_id)})
    if not order and shiprocket_order_id:
        order = await db.orders.find_one({"shipping.shiprocketOrderId": str(shiprocket_order_id)})
    if not order and awb:
        order = await db.orders.find_one({"shipping.awbCode": str(awb)})
    if not order:
        logger.warning(f"Shiprocket webhook for unknown order: {channel_order_id or shiprocket_order_id or awb}")
        # 200 so Shiprocket does not retry forever on an order we do not have.
        return {"success": True, "message": "Order not found, ignored"}

    scans = []
    for scan in body.get("scans") or []:
        if isinstance(scan, dict):
            scans.append({
                "date": scan.get("date") or scan.get("scan-date"),
                "status": scan.get("sr-status-label") or scan.get("status"),
                "activity": scan.get("activity"),
                "location": scan.get("location"),
            })

    tracking = {
        "awb": awb,
        "courierName": body.get("courier_name"),
        "currentStatus": body.get("current_status") or body.get("shipment_status"),
        "expectedDeliveryDate": body.get("etd"),
        "trackUrl": body.get("track_url"),
        "scans": scans,
    }

    await apply_tracking(db, order, tracking, source="Shiprocket webhook")
    logger.info(f"Shiprocket webhook applied to order {order.get('orderNumber')}: {tracking['currentStatus']}")
    return {"success": True}


# ─── Admin ──────────────────────────────────────────────────────────────

@router.get("/admin/shipping/status")
async def shipping_status(current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    db = get_db()
    config = await get_shiprocket_config(db)

    connected = False
    error = None
    if shiprocket.is_configured():
        try:
            await shiprocket.get_token()
            connected = True
        except ShiprocketError as exc:
            error = exc.message

    return {
        "success": True,
        "data": {
            "configured": shiprocket.is_configured(),
            "connected": connected,
            "error": error,
            "webhookConfigured": bool(settings.SHIPROCKET_WEBHOOK_TOKEN),
            "config": {
                "pickupLocation": config.get("pickupLocation"),
                "pickupPincode": config.get("pickupPincode"),
                "length": config.get("length"),
                "breadth": config.get("breadth"),
                "height": config.get("height"),
                "packagingWeight": config.get("packagingWeight"),
                "autoCreate": config.get("autoCreate"),
            },
        },
    }


@router.get("/admin/shipping/pickup-locations")
async def pickup_locations(current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    try:
        response = await shiprocket.get_pickup_locations()
    except ShiprocketError as exc:
        raise _handle(exc)

    addresses = ((response.get("data") or {}).get("shipping_address")) or []
    locations = [
        {
            "id": a.get("id"),
            "name": a.get("pickup_location"),
            "address": a.get("address"),
            "city": a.get("city"),
            "state": a.get("state"),
            "pincode": a.get("pin_code"),
            "phone": a.get("phone"),
        }
        for a in addresses if isinstance(a, dict)
    ]
    return {"success": True, "data": {"locations": locations}}


@router.get("/admin/orders/{order_id}/shiprocket/couriers")
async def order_courier_options(order_id: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    """Courier rates for a specific order's destination, for the AWB dropdown."""
    order = await _load_admin_order(order_id)
    db = get_db()
    config = await get_shiprocket_config(db)

    pickup_pincode = config.get("pickupPincode")
    if not pickup_pincode:
        raise HTTPException(status_code=503, detail="Pickup pincode is not configured")

    weight = shiprocket.estimate_package_weight(
        order.get("items", []), float(config.get("packagingWeight") or 0)
    )
    try:
        response = await shiprocket.check_serviceability(
            pickup_pincode,
            (order.get("shippingAddress") or {}).get("pincode", ""),
            weight,
            cod=str(order.get("paymentMethod", "")).lower() == "cod",
            declared_value=order.get("total"),
        )
    except ShiprocketError as exc:
        raise _handle(exc)

    available = (response.get("data") or {}).get("available_courier_companies") or []
    couriers = [
        {
            "id": c.get("courier_company_id"),
            "name": c.get("courier_name"),
            "rate": c.get("rate"),
            "estimatedDays": c.get("estimated_delivery_days"),
            "etd": c.get("etd"),
            "rating": c.get("rating"),
        }
        for c in available if isinstance(c, dict)
    ]
    return {"success": True, "data": {"weight": weight, "couriers": couriers}}


async def _create_shipment(
    db,
    order: dict,
    config: dict,
    weight: Optional[float] = None,
    courier_id: Optional[str] = None,
    auto_assign_awb: bool = True,
) -> tuple[dict, Optional[str]]:
    """Create the Shiprocket order and (optionally) its AWB.

    Returns ``(updated_order, awb_error)``. Raises ShiprocketError if the order
    itself could not be created; a failed AWB is reported via ``awb_error`` so a
    successfully created shipment is never silently orphaned.
    """
    payload = shiprocket.build_order_payload(order, config)
    if weight:
        payload["weight"] = round(float(weight), 2)

    response = await shiprocket.create_order(payload)

    shiprocket_order_id = response.get("order_id")
    shipment_id = response.get("shipment_id")
    if not shiprocket_order_id or not shipment_id:
        raise ShiprocketError(
            str(response.get("message") or "Shiprocket did not return an order/shipment id"),
            502,
            response,
        )

    patch = {
        "shiprocketOrderId": str(shiprocket_order_id),
        "shipmentId": str(shipment_id),
        "status": response.get("status") or "NEW",
        "appliedWeight": payload["weight"],
        "pickupLocation": payload["pickup_location"],
        "createdAt": datetime.now(timezone.utc),
        "cancelledAt": None,
        "error": None,
    }
    if response.get("awb_code"):
        patch["awbCode"] = str(response["awb_code"])
    if response.get("courier_name"):
        patch["courierName"] = response["courier_name"]

    updated = await _save_shipping(db, order, patch)

    awb_error = None
    if auto_assign_awb and not patch.get("awbCode"):
        try:
            updated = await _assign_awb(db, updated, courier_id)
        except ShiprocketError as exc:
            # The order exists in Shiprocket now; report the AWB failure separately
            # instead of rolling back and leaving a duplicate behind.
            awb_error = exc.message
            logger.warning(f"AWB assignment failed for {order.get('orderNumber')}: {exc.message}")
            updated = await _save_shipping(db, updated, {"error": f"AWB not assigned: {exc.message}"})

    return updated, awb_error


async def auto_create_shipment(order_id: str) -> None:
    """Push an order to Shiprocket automatically, when auto-create is enabled.

    Runs as a background task after payment is confirmed, so it never raises into
    the customer's request. Failures are recorded on ``order.shipping.error``,
    which the admin Orders panel renders, and the order can still be pushed by hand.
    """
    db = get_db()
    if db is None or not shiprocket.is_configured():
        return

    if not is_valid_object_id(order_id):
        return
    order = await db.orders.find_one({"_id": to_object_id(order_id)})
    if not order:
        return

    config = await get_shiprocket_config(db)
    if not config.get("autoCreate"):
        return

    existing = order.get("shipping") or {}
    if existing.get("shiprocketOrderId") and not existing.get("cancelledAt"):
        return
    if order.get("status") in ("cancelled", "returned"):
        return

    try:
        _, awb_error = await _create_shipment(db, order, config)
        logger.info(
            f"Auto-created Shiprocket shipment for {order.get('orderNumber')}"
            + (f" (AWB pending: {awb_error})" if awb_error else "")
        )
    except ShiprocketError as exc:
        logger.warning(f"Auto-create failed for {order.get('orderNumber')}: {exc.message}")
        await _save_shipping(db, order, {"error": f"Auto-create failed: {exc.message}"})
    except Exception as exc:
        logger.error(f"Unexpected auto-create error for {order.get('orderNumber')}: {exc}")


@router.post("/admin/orders/{order_id}/shiprocket", status_code=status.HTTP_201_CREATED)
async def create_shipment(
    order_id: str,
    body: CreateShipmentSchema,
    current_user: dict = Depends(require_roles(["admin", "superadmin"])),
):
    """Push an order to Shiprocket, optionally assigning an AWB in the same step."""
    order = await _load_admin_order(order_id)
    db = get_db()

    existing = order.get("shipping") or {}
    if existing.get("shiprocketOrderId") and not existing.get("cancelledAt"):
        raise HTTPException(status_code=409, detail="This order is already in Shiprocket")

    if order.get("status") in ("cancelled", "returned"):
        raise HTTPException(status_code=400, detail=f"Cannot ship an order that is {order.get('status')}")

    config = await get_shiprocket_config(db)
    for key in ("pickupLocation", "length", "breadth", "height"):
        override = getattr(body, key)
        if override:
            config[key] = override

    try:
        updated, awb_error = await _create_shipment(
            db, order, config, body.weight, body.courierId, body.autoAssignAwb
        )
    except ShiprocketError as exc:
        raise _handle(exc)

    return {
        "success": True,
        "data": {"order": serialize_doc(updated), "awbError": awb_error},
        "message": "Order pushed to Shiprocket" + (f" (AWB pending: {awb_error})" if awb_error else ""),
    }


async def _assign_awb(db, order: dict, courier_id: Optional[str]) -> dict:
    shipping = order.get("shipping") or {}
    shipment_id = shipping.get("shipmentId")
    if not shipment_id:
        raise HTTPException(status_code=400, detail="Push the order to Shiprocket first")

    response = await shiprocket.assign_awb(shipment_id, courier_id)
    # Shiprocket nests the AWB details under `response` (e.g.
    # {"awb_assign_status": 1, "response": {"awb_code": ...}}) — there is no
    # `data` wrapper. Accept both shapes (plus a flat payload) so a successful
    # assignment is never misread as a failure.
    inner = response.get("response")
    data = inner if isinstance(inner, dict) else {}
    if not data.get("awb_code"):
        data = response.get("data") or {}
    if not data.get("awb_code"):
        data = response

    awb = data.get("awb_code")
    if not awb:
        message = response.get("message") or "No courier could be assigned to this shipment"
        raise ShiprocketError(str(message), 502, response)

    patch = {
        "awbCode": str(awb),
        "courierName": data.get("courier_name"),
        "courierId": str(data.get("courier_company_id") or courier_id or ""),
        "freightCharge": data.get("freight_charges"),
        "appliedWeight": data.get("applied_weight") or shipping.get("appliedWeight"),
        "assignedAt": datetime.now(timezone.utc),
        "status": "AWB ASSIGNED",
    }
    return await _save_shipping(db, order, patch)


@router.post("/admin/orders/{order_id}/shiprocket/awb")
async def assign_awb(
    order_id: str,
    body: AssignAwbSchema,
    current_user: dict = Depends(require_roles(["admin", "superadmin"])),
):
    order = await _load_admin_order(order_id)
    db = get_db()
    try:
        updated = await _assign_awb(db, order, body.courierId)
    except ShiprocketError as exc:
        raise _handle(exc)
    return {
        "success": True,
        "data": {"order": serialize_doc(updated)},
        "message": f"AWB {(updated.get('shipping') or {}).get('awbCode')} assigned",
    }


@router.post("/admin/orders/{order_id}/shiprocket/pickup")
async def schedule_pickup(order_id: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    order = await _load_admin_order(order_id)
    db = get_db()
    shipping = order.get("shipping") or {}
    if not shipping.get("shipmentId"):
        raise HTTPException(status_code=400, detail="Push the order to Shiprocket first")
    if not shipping.get("awbCode"):
        raise HTTPException(status_code=400, detail="Assign an AWB before scheduling pickup")

    try:
        response = await shiprocket.request_pickup(shipping["shipmentId"])
    except ShiprocketError as exc:
        raise _handle(exc)

    pickup = response.get("response") or {}
    patch = {
        "pickupScheduledDate": pickup.get("pickup_scheduled_date") or response.get("pickup_scheduled_date"),
        "pickupTokenNumber": pickup.get("pickup_token_number") or response.get("pickup_token_number"),
        "status": "PICKUP SCHEDULED",
    }
    updated = await _save_shipping(db, order, patch)

    # Reflect the physical reality in the customer-facing timeline too.
    if order.get("status") in ("pending", "confirmed"):
        timeline = list(order.get("tracking") or [])
        timeline.append({
            "status": "packed",
            "note": "Pickup scheduled with Shiprocket",
            "date": datetime.now(timezone.utc),
        })
        updated = await db.orders.find_one_and_update(
            {"_id": order["_id"]},
            {"$set": {"status": "packed", "tracking": timeline, "updatedAt": datetime.now(timezone.utc)}},
            return_document=True,
        ) or updated

    return {"success": True, "data": {"order": serialize_doc(updated)}, "message": "Pickup scheduled"}


@router.post("/admin/orders/{order_id}/shiprocket/label")
async def create_label(order_id: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    order = await _load_admin_order(order_id)
    db = get_db()
    shipping = order.get("shipping") or {}
    shipment_id = shipping.get("shipmentId")
    if not shipment_id:
        raise HTTPException(status_code=400, detail="Push the order to Shiprocket first")
    # The label carries the AWB barcode — without one, Shiprocket rejects the
    # call with a generic "no valid shipment ids" error.
    if not shipping.get("awbCode"):
        raise HTTPException(status_code=400, detail="Assign an AWB before generating the label")

    try:
        response = await shiprocket.generate_label(shipment_id)
    except ShiprocketError as exc:
        raise _handle(exc)

    label_url = response.get("label_url")
    if not label_url:
        raise HTTPException(
            status_code=502, detail=response.get("response") or "Shiprocket did not return a label"
        )

    updated = await _save_shipping(db, order, {"labelUrl": label_url})
    return {"success": True, "data": {"labelUrl": label_url, "order": serialize_doc(updated)}}


@router.post("/admin/orders/{order_id}/shiprocket/invoice")
async def create_invoice(order_id: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    order = await _load_admin_order(order_id)
    db = get_db()
    shiprocket_order_id = (order.get("shipping") or {}).get("shiprocketOrderId")
    if not shiprocket_order_id:
        raise HTTPException(status_code=400, detail="Push the order to Shiprocket first")

    try:
        response = await shiprocket.generate_invoice(shiprocket_order_id)
    except ShiprocketError as exc:
        raise _handle(exc)

    invoice_url = response.get("invoice_url")
    if not invoice_url:
        raise HTTPException(status_code=502, detail="Shiprocket did not return an invoice")

    updated = await _save_shipping(db, order, {"invoiceUrl": invoice_url})
    return {"success": True, "data": {"invoiceUrl": invoice_url, "order": serialize_doc(updated)}}


@router.post("/admin/orders/{order_id}/shiprocket/manifest")
async def create_manifest(order_id: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    order = await _load_admin_order(order_id)
    db = get_db()
    shipping = order.get("shipping") or {}
    shipment_id = shipping.get("shipmentId")
    if not shipment_id:
        raise HTTPException(status_code=400, detail="Push the order to Shiprocket first")
    # The manifest lists the shipment's AWB — no AWB, nothing to manifest.
    if not shipping.get("awbCode"):
        raise HTTPException(status_code=400, detail="Assign an AWB before generating the manifest")

    try:
        response = await shiprocket.generate_manifest(shipment_id)
    except ShiprocketError as exc:
        raise _handle(exc)

    manifest_url = response.get("manifest_url")
    if not manifest_url:
        raise HTTPException(status_code=502, detail="Shiprocket did not return a manifest")

    updated = await _save_shipping(db, order, {"manifestUrl": manifest_url})
    return {"success": True, "data": {"manifestUrl": manifest_url, "order": serialize_doc(updated)}}


@router.get("/admin/orders/{order_id}/shiprocket/track")
async def refresh_tracking(order_id: str, current_user: dict = Depends(require_roles(["admin", "superadmin"]))):
    order = await _load_admin_order(order_id)
    db = get_db()
    shipping = order.get("shipping") or {}
    awb = shipping.get("awbCode")
    shipment_id = shipping.get("shipmentId")
    if not awb and not shipment_id:
        raise HTTPException(status_code=400, detail="This order has no Shiprocket shipment yet")

    try:
        raw = await shiprocket.track_awb(awb) if awb else await shiprocket.track_shipment(shipment_id)
    except ShiprocketError as exc:
        raise _handle(exc)

    tracking = shiprocket.normalise_tracking(raw)
    updated = await apply_tracking(db, order, tracking)
    return {"success": True, "data": {"tracking": tracking, "order": serialize_doc(updated)}}


@router.post("/admin/orders/{order_id}/shiprocket/cancel")
async def cancel_shipment(
    order_id: str,
    body: CancelShipmentSchema,
    current_user: dict = Depends(require_roles(["admin", "superadmin"])),
):
    order = await _load_admin_order(order_id)
    db = get_db()
    shipping = order.get("shipping") or {}
    if not shipping.get("shiprocketOrderId"):
        raise HTTPException(status_code=400, detail="This order has no Shiprocket shipment")

    errors = []
    cancelled_any = False
    if shipping.get("awbCode"):
        try:
            await shiprocket.cancel_shipment(shipping["awbCode"])
            cancelled_any = True
        except ShiprocketError as exc:
            errors.append(exc.message)
    if body.cancelOrder:
        try:
            await shiprocket.cancel_order(shipping["shiprocketOrderId"])
            cancelled_any = True
        except ShiprocketError as exc:
            errors.append(exc.message)

    # If Shiprocket refused every cancellation, the shipment is still live — do
    # not record a cancellation that never happened.
    if errors and not cancelled_any:
        raise HTTPException(status_code=502, detail="; ".join(errors))

    updated = await _save_shipping(db, order, {
        "status": "CANCELED",
        "cancelledAt": datetime.now(timezone.utc),
        "error": "; ".join(errors) if errors else None,
    })

    return {
        "success": True,
        "data": {"order": serialize_doc(updated), "errors": errors},
        "message": "Shipment cancelled in Shiprocket" if not errors else "Cancelled with warnings",
    }
