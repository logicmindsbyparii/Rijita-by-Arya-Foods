"""Inventory and coupon bookkeeping for order state transitions.

Cancelling or returning an order has to put back everything placing it took:
the variant stock, the product's totalSold counter, and the coupon's usedCount.
That three-part undo was written out by hand at every transition site
(update_order_status, bulk_update_order_status, cancel_order, delete_order, the
expiry cron) — and the one path that was added last, the Shiprocket tracking
handler, silently omitted it. An RTO pushed by the courier flipped the order to
"returned" while its stock stayed deducted forever, so the product drifted
toward a false "sold out".

Both directions live here so the undo and the redo cannot drift apart.

Callers are responsible for only invoking these on a real transition — the
functions are not idempotent, and applying one twice double-counts.
"""

from typing import Any


def _variant_filter(item: dict) -> dict:
    """Match the single variant an order line refers to.

    Prefers sku (the canonical variant identity — embedded variants have no
    _id), falling back to the display weight for legacy lines saved without one.
    """
    if item.get("sku"):
        return {"_id": item.get("product"), "variants.sku": item["sku"]}
    return {"_id": item.get("product"), "variants.weight": item.get("variant")}


async def restore_order_inventory(db: Any, order: dict) -> None:
    """Give back stock, totalSold and the coupon use for a cancelled/returned order."""
    for item in order.get("items", []):
        qty = item.get("quantity", 0)
        if not qty:
            continue
        await db.products.update_one(
            _variant_filter(item),
            {"$inc": {"variants.$.stock": qty, "totalSold": -qty}},
        )
    if order.get("coupon"):
        await db.coupons.update_one({"code": order["coupon"]}, {"$inc": {"usedCount": -1}})


async def deduct_order_inventory(db: Any, order: dict) -> None:
    """Re-take stock and the coupon use when an order leaves cancelled/returned."""
    for item in order.get("items", []):
        qty = item.get("quantity", 0)
        if not qty:
            continue
        await db.products.update_one(
            _variant_filter(item),
            {"$inc": {"variants.$.stock": -qty, "totalSold": qty}},
        )
    if order.get("coupon"):
        await db.coupons.update_one({"code": order["coupon"]}, {"$inc": {"usedCount": 1}})
