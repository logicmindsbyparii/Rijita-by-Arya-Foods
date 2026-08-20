from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta, timezone
import re
from app.config import settings
from app.db import get_db
from app.utils.inventory import restore_order_inventory
from app.utils.logger import logger

scheduler = AsyncIOScheduler()

async def cancel_expired_orders():
    logger.info("Running order expiration cron job...")
    db = get_db()
    if db is None:
        return

    two_hours_ago = datetime.now(timezone.utc) - timedelta(hours=2)
    processed = 0

    try:
        # COD orders are shipped (pushed to Shiprocket) at placement and never
        # need the "pay within 2 hours" window — exclude them or a live COD
        # order would be auto-cancelled two hours after it was placed.
        cursor = db.orders.find({
            "status": "pending",
            "paymentMethod": {"$not": re.compile("^cod$", re.IGNORECASE)},
            "createdAt": {"$lt": two_hours_ago}
        }).sort("createdAt", 1).limit(50)

        expired_orders = await cursor.to_list(length=50)

        for order in expired_orders:
            # Cancel order
            tracking = order.get("tracking", [])
            tracking.append({
                "status": "cancelled",
                "note": "Order automatically cancelled due to non-payment within 2 hours.",
                "date": datetime.now(timezone.utc)
            })

            updated = await db.orders.update_one(
                {"_id": order["_id"], "status": "pending"},
                {
                    "$set": {
                        "status": "cancelled",
                        "tracking": tracking,
                        "updatedAt": datetime.now(timezone.utc)
                    }
                }
            )

            # Another worker/cron run already cancelled this order — nothing else
            # to do, else we'd restore stock and release the coupon twice.
            if updated.modified_count == 0:
                continue

            # Restore inventory and release the coupon usage — every other
            # cancel path does this, and skipping it here burns through the
            # usage limit without a sale. The modified_count guard above is
            # what keeps this from running twice on the same order.
            await restore_order_inventory(db, order)

            # Best-effort cancellation of any Shiprocket shipment (e.g. a COD
            # order auto-created at placement). Never blocks the cron on failure.
            try:
                from app.routers.orders import cancel_shiprocket_shipment
                await cancel_shiprocket_shipment(db, order)
            except Exception:
                pass

            processed += 1

        if processed > 0:
            logger.info(f"Cron job completed: cancelled {processed} expired orders.")
    except Exception as e:
        logger.error(f"Error in order expiration cron job: {e}")

async def sync_shiprocket_tracking():
    """Poll Shiprocket for in-flight shipments.

    Webhooks are the primary channel; this is the safety net for missed or
    unconfigured webhook deliveries.
    """
    from app.utils import shiprocket

    if not shiprocket.is_configured():
        return

    db = get_db()
    if db is None:
        return

    from app.routers.shipping import apply_tracking
    from app.utils.shiprocket import ShiprocketError

    try:
        cursor = db.orders.find({
            "shipping.awbCode": {"$exists": True, "$ne": None},
            "shipping.cancelledAt": None,
            "status": {"$nin": ["delivered", "cancelled", "returned"]},
        }).sort("updatedAt", 1).limit(40)

        orders = await cursor.to_list(length=40)
        synced = 0

        for order in orders:
            awb = (order.get("shipping") or {}).get("awbCode")
            if not awb:
                continue
            try:
                raw = await shiprocket.track_awb(awb)
                await apply_tracking(db, order, shiprocket.normalise_tracking(raw), source="Shiprocket sync")
                synced += 1
            except ShiprocketError as e:
                logger.warning(f"Tracking sync failed for AWB {awb}: {e.message}")

        if synced > 0:
            logger.info(f"Shiprocket tracking sync completed for {synced} shipments.")
    except Exception as e:
        logger.error(f"Error in Shiprocket tracking sync job: {e}")

def init_cron_jobs():
    scheduler.add_job(cancel_expired_orders, 'interval', minutes=15)
    scheduler.add_job(
        sync_shiprocket_tracking,
        'interval',
        minutes=max(5, settings.SHIPROCKET_TRACKING_SYNC_MINUTES),
    )
    scheduler.start()
    logger.info(
        f"Cron scheduler initialized (orders every 15 mins, "
        f"Shiprocket tracking every {max(5, settings.SHIPROCKET_TRACKING_SYNC_MINUTES)} mins)."
    )

def shutdown_cron_jobs():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Cron scheduler shut down.")
