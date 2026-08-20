"""Shiprocket API client.

HTTP is done with the stdlib (`urllib`) inside a worker thread, so calls stay
non-blocking under uvicorn without pulling a new package into requirements.txt.

Every public coroutine raises ``ShiprocketError`` on failure — routers translate
that into an HTTPException so a Shiprocket outage never 500s the whole request.
"""

import asyncio
import json
import re
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from anyio import to_thread

from app.config import settings
from app.utils.logger import logger

REQUEST_TIMEOUT = 30
# Shiprocket tokens are valid for 10 days; refresh a day early.
TOKEN_TTL = timedelta(days=9)


class ShiprocketError(Exception):
    """Raised for any non-2xx or unreachable Shiprocket response."""

    def __init__(self, message: str, status_code: int = 502, payload: Optional[dict] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.payload = payload or {}


_token: Optional[str] = None
_token_expires_at: Optional[datetime] = None
_token_lock: Optional[asyncio.Lock] = None


def _get_lock() -> asyncio.Lock:
    global _token_lock
    if _token_lock is None:
        _token_lock = asyncio.Lock()
    return _token_lock


def is_configured() -> bool:
    return bool(settings.SHIPROCKET_EMAIL and settings.SHIPROCKET_PASSWORD)


def _extract_message(payload: Any, fallback: str) -> str:
    if isinstance(payload, dict):
        for key in ("message", "error", "detail"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value
        errors = payload.get("errors")
        if isinstance(errors, dict):
            parts = []
            for field, value in errors.items():
                text = ", ".join(value) if isinstance(value, list) else str(value)
                parts.append(f"{field}: {text}")
            if parts:
                return "; ".join(parts)
        if isinstance(errors, list) and errors:
            return "; ".join(str(e) for e in errors)
    return fallback


def _blocking_request(method: str, url: str, body: Optional[dict], headers: dict) -> tuple[int, str]:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    request = urllib.request.Request(url, data=data, method=method)
    request.add_header("Content-Type", "application/json")
    request.add_header("Accept", "application/json")
    for key, value in headers.items():
        request.add_header(key, value)

    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            return response.status, response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", "replace")
    except urllib.error.URLError as exc:
        raise ShiprocketError(f"Could not reach Shiprocket: {exc.reason}", 503) from exc
    except TimeoutError as exc:
        raise ShiprocketError("Shiprocket request timed out", 504) from exc


async def _request(
    method: str,
    path: str,
    body: Optional[dict] = None,
    params: Optional[dict] = None,
    authenticated: bool = True,
    _retry_on_401: bool = True,
) -> dict:
    url = f"{settings.SHIPROCKET_BASE_URL.rstrip('/')}{path}"
    if params:
        query = urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
        if query:
            url = f"{url}?{query}"

    headers = {}
    if authenticated:
        headers["Authorization"] = f"Bearer {await get_token()}"

    status_code, raw = await to_thread.run_sync(lambda: _blocking_request(method, url, body, headers))

    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        payload = {"raw": raw}
    if not isinstance(payload, dict):
        payload = {"data": payload}

    # An expired token looks like a plain 401 — refresh once and replay.
    if status_code == 401 and authenticated and _retry_on_401:
        logger.info("Shiprocket token rejected, re-authenticating")
        await get_token(force=True)
        return await _request(method, path, body, params, authenticated, _retry_on_401=False)

    if status_code >= 400:
        message = _extract_message(payload, f"Shiprocket request failed ({status_code})")
        logger.error(f"Shiprocket {method} {path} -> {status_code}: {message}")
        raise ShiprocketError(message, status_code, payload)

    return payload


async def get_token(force: bool = False) -> str:
    global _token, _token_expires_at

    if not is_configured():
        raise ShiprocketError(
            "Shiprocket is not configured. Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD.", 503
        )

    async with _get_lock():
        now = datetime.now(timezone.utc)
        if not force and _token and _token_expires_at and now < _token_expires_at:
            return _token

        payload = await _request(
            "POST",
            "/auth/login",
            {"email": settings.SHIPROCKET_EMAIL, "password": settings.SHIPROCKET_PASSWORD},
            authenticated=False,
        )
        token = payload.get("token")
        if not token:
            raise ShiprocketError(
                _extract_message(payload, "Shiprocket login did not return a token"), 502, payload
            )

        _token = token
        _token_expires_at = now + TOKEN_TTL
        logger.info("Shiprocket authenticated successfully")
        return token


def reset_token() -> None:
    """Drop the cached token (used by the admin connection test)."""
    global _token, _token_expires_at
    _token = None
    _token_expires_at = None


# ─── Weight & payload helpers ───────────────────────────────────────────

_WEIGHT_UNITS_IN_KG = {
    "mg": 0.000001,
    "g": 0.001,
    "gm": 0.001,
    "gms": 0.001,
    "gram": 0.001,
    "grams": 0.001,
    "kg": 1.0,
    "kgs": 1.0,
    "ml": 0.001,  # treated as grams — accurate enough for namkeen/sweets
    "l": 1.0,
    "ltr": 1.0,
    "litre": 1.0,
}


def parse_weight_kg(text: Any) -> float:
    """Turn a variant label like ``"500g"`` or ``"1 kg"`` into kilograms."""
    match = re.match(r"\s*([\d.]+)\s*([a-zA-Z]*)", str(text or ""))
    if not match:
        return 0.0
    try:
        value = float(match.group(1))
    except ValueError:
        return 0.0
    unit = (match.group(2) or "g").lower()
    return value * _WEIGHT_UNITS_IN_KG.get(unit, 0.001)


def estimate_package_weight(items: list, packaging_weight: float = 0.0) -> float:
    """Billable weight in kg for a set of order items, never below 0.5kg."""
    total = 0.0
    for item in items or []:
        quantity = int(item.get("quantity", 1) or 1)
        total += parse_weight_kg(item.get("weight") or item.get("variant")) * quantity
    total += packaging_weight
    return round(max(total, 0.5), 2)


def _digits(value: Any, length: int = 10) -> str:
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())
    return digits[-length:] if len(digits) > length else digits


def _split_name(full_name: Any) -> tuple[str, str]:
    parts = str(full_name or "").strip().split()
    if not parts:
        return "Customer", ""
    return parts[0], " ".join(parts[1:])


def build_order_payload(order: dict, config: dict) -> dict:
    """Map one of our order documents onto Shiprocket's ad-hoc order schema."""
    address = order.get("shippingAddress") or {}
    first_name, last_name = _split_name(address.get("fullName"))
    created_at = order.get("createdAt") or datetime.now(timezone.utc)
    if isinstance(created_at, str):
        try:
            created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        except ValueError:
            created_at = datetime.now(timezone.utc)

    order_items = []
    for item in order.get("items", []):
        order_items.append({
            "name": str(item.get("productName") or "Item")[:100],
            "sku": str(item.get("sku") or item.get("variant") or item.get("productName") or "SKU")[:50],
            "units": int(item.get("quantity", 1) or 1),
            "selling_price": round(float(item.get("price", 0) or 0), 2),
            "discount": 0,
            "tax": "",
            "hsn": item.get("hsn") or "",
        })

    is_cod = str(order.get("paymentMethod", "")).lower() == "cod"

    # sub_total is what Shiprocket treats as the invoice / COD-collectable value,
    # so it must be the amount the customer actually pays — shipping and discount
    # are already folded into order["total"] and are sent as 0 to avoid double counting.
    payload = {
        "order_id": order.get("orderNumber"),
        "order_date": created_at.strftime("%Y-%m-%d %H:%M"),
        "pickup_location": config.get("pickupLocation") or settings.SHIPROCKET_PICKUP_LOCATION,
        "comment": order.get("notes") or "",
        "billing_customer_name": first_name,
        "billing_last_name": last_name,
        "billing_address": address.get("addressLine1") or "",
        "billing_address_2": address.get("addressLine2") or "",
        "billing_city": address.get("city") or "",
        "billing_pincode": _digits(address.get("pincode"), 6),
        "billing_state": address.get("state") or "",
        "billing_country": "India",
        "billing_email": address.get("email") or config.get("fallbackEmail") or "",
        "billing_phone": _digits(address.get("phone")),
        "shipping_is_billing": True,
        "order_items": order_items,
        "payment_method": "COD" if is_cod else "Prepaid",
        "sub_total": round(float(order.get("total", 0) or 0), 2),
        "shipping_charges": 0,
        "giftwrap_charges": 0,
        "transaction_charges": 0,
        "total_discount": 0,
        "length": float(config.get("length") or settings.SHIPROCKET_PACKAGE_LENGTH),
        "breadth": float(config.get("breadth") or settings.SHIPROCKET_PACKAGE_BREADTH),
        "height": float(config.get("height") or settings.SHIPROCKET_PACKAGE_HEIGHT),
        "weight": estimate_package_weight(
            order.get("items", []), float(config.get("packagingWeight") or 0)
        ),
    }

    channel_id = config.get("channelId") or settings.SHIPROCKET_CHANNEL_ID
    if channel_id:
        payload["channel_id"] = str(channel_id)

    return payload


# ─── Status mapping ─────────────────────────────────────────────────────

STATUS_MAP = {
    "NEW": "confirmed",
    "INVOICED": "confirmed",
    "READY TO SHIP": "confirmed",
    "AWB ASSIGNED": "confirmed",
    "LABEL GENERATED": "packed",
    "MANIFEST GENERATED": "packed",
    "PICKUP SCHEDULED": "packed",
    "PICKUP GENERATED": "packed",
    "PICKUP QUEUED": "packed",
    "PICKUP RESCHEDULED": "packed",
    "PICKUP ERROR": "packed",
    "PICKUP EXCEPTION": "packed",
    "PICKED UP": "dispatched",
    "SHIPPED": "dispatched",
    "IN TRANSIT": "dispatched",
    "REACHED AT DESTINATION HUB": "dispatched",
    "MISROUTED": "dispatched",
    "OUT FOR DELIVERY": "out-for-delivery",
    "DELIVERED": "delivered",
    "CANCELED": "cancelled",
    "CANCELLED": "cancelled",
    "RTO INITIATED": "returned",
    "RTO IN TRANSIT": "returned",
    "RTO ACKNOWLEDGED": "returned",
    "RTO DELIVERED": "returned",
    "RETURN PENDING": "returned",
    "RETURN INITIATED": "returned",
    "RETURN DELIVERED": "returned",
}


def map_status(shiprocket_status: Any) -> Optional[str]:
    """Map a Shiprocket status label onto our order status, or None if unknown.

    Unknown labels (LOST, DAMAGED, UNDELIVERED, …) deliberately return None so the
    order status is left alone and only the tracking note records what happened.
    """
    if not shiprocket_status:
        return None
    return STATUS_MAP.get(str(shiprocket_status).strip().upper())


# ─── API surface ────────────────────────────────────────────────────────

async def check_serviceability(
    pickup_pincode: str,
    delivery_pincode: str,
    weight_kg: float,
    cod: bool = False,
    declared_value: Optional[float] = None,
) -> dict:
    params = {
        "pickup_postcode": _digits(pickup_pincode, 6),
        "delivery_postcode": _digits(delivery_pincode, 6),
        "weight": round(max(weight_kg, 0.5), 2),
        "cod": 1 if cod else 0,
    }
    if declared_value:
        params["declared_value"] = round(float(declared_value), 2)
    return await _request("GET", "/courier/serviceability/", params=params)


async def get_pickup_locations() -> dict:
    return await _request("GET", "/settings/company/pickup")


async def create_order(payload: dict) -> dict:
    return await _request("POST", "/orders/create/adhoc", payload)


async def assign_awb(shipment_id: Any, courier_id: Optional[Any] = None) -> dict:
    body: dict = {"shipment_id": str(shipment_id)}
    if courier_id:
        body["courier_id"] = str(courier_id)
    return await _request("POST", "/courier/assign/awb", body)


async def request_pickup(shipment_id: Any) -> dict:
    return await _request("POST", "/courier/generate/pickup", {"shipment_id": [str(shipment_id)]})


async def generate_label(shipment_id: Any) -> dict:
    return await _request("POST", "/courier/generate/label", {"shipment_id": [str(shipment_id)]})


async def generate_invoice(shiprocket_order_id: Any) -> dict:
    return await _request("POST", "/orders/print/invoice", {"ids": [str(shiprocket_order_id)]})


async def generate_manifest(shipment_id: Any) -> dict:
    return await _request("POST", "/manifests/generate", {"shipment_id": [str(shipment_id)]})


async def track_awb(awb: str) -> dict:
    return await _request("GET", f"/courier/track/awb/{urllib.parse.quote(str(awb))}")


async def track_shipment(shipment_id: Any) -> dict:
    return await _request("GET", f"/courier/track/shipment/{urllib.parse.quote(str(shipment_id))}")


async def cancel_order(shiprocket_order_id: Any) -> dict:
    return await _request("POST", "/orders/cancel", {"ids": [str(shiprocket_order_id)]})


async def cancel_shipment(awb: str) -> dict:
    return await _request("POST", "/orders/cancel/shipment/awbs", {"awbs": [str(awb)]})


def normalise_tracking(tracking_payload: Any) -> dict:
    """Flatten Shiprocket's tracking response into the shape our UIs render.

    The API returns ``tracking_data`` either as a dict or (for unknown AWBs) as a
    list, and the activity list is sometimes absent entirely.
    """
    data = tracking_payload if isinstance(tracking_payload, dict) else {}
    tracking_data = data.get("tracking_data", data)
    if isinstance(tracking_data, list):
        tracking_data = tracking_data[0] if tracking_data else {}
    if not isinstance(tracking_data, dict):
        tracking_data = {}

    shipment_track = tracking_data.get("shipment_track") or []
    if isinstance(shipment_track, dict):
        shipment_track = [shipment_track]
    head = shipment_track[0] if shipment_track and isinstance(shipment_track[0], dict) else {}

    activities = tracking_data.get("shipment_track_activities") or []
    if not isinstance(activities, list):
        activities = []

    scans = []
    for entry in activities:
        if not isinstance(entry, dict):
            continue
        scans.append({
            "date": entry.get("date"),
            "status": entry.get("sr-status-label") or entry.get("status"),
            "activity": entry.get("activity"),
            "location": entry.get("location"),
        })

    return {
        "awb": head.get("awb_code") or tracking_data.get("awb"),
        "courierName": head.get("courier_name"),
        "currentStatus": head.get("current_status") or tracking_data.get("shipment_status"),
        "deliveredDate": head.get("delivered_date"),
        "expectedDeliveryDate": head.get("edd") or tracking_data.get("etd"),
        "trackUrl": tracking_data.get("track_url"),
        "scans": scans,
    }
