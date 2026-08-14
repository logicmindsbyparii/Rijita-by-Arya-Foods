from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta, timezone
from app.db import get_db
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
        cursor = db.orders.find({
            "status": "pending",
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

            await db.orders.update_one(
                {"_id": order["_id"]},
                {
                    "$set": {
                        "status": "cancelled",
                        "tracking": tracking,
                        "updatedAt": datetime.now(timezone.utc)
                    }
                }
            )

            # Restore inventory
            items = order.get("items", [])
            for item in items:
                product_id = item.get("product")
                variant_name = item.get("variant")
                sku = item.get("sku")
                quantity = item.get("quantity", 0)

                if sku:
                    filter_q = {"_id": product_id, "variants.sku": sku}
                else:
                    filter_q = {"_id": product_id, "variants.weight": variant_name}

                await db.products.update_one(
                    filter_q,
                    {
                        "$inc": {
                            "variants.$.stock": quantity,
                            "totalSold": -quantity
                        }
                    }
                )

            processed += 1

        if processed > 0:
            logger.info(f"Cron job completed: cancelled {processed} expired orders.")
    except Exception as e:
        logger.error(f"Error in order expiration cron job: {e}")

def init_cron_jobs():
    scheduler.add_job(cancel_expired_orders, 'interval', minutes=15)
    scheduler.start()
    logger.info("Cron scheduler initialized (runs every 15 mins).")

def shutdown_cron_jobs():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Cron scheduler shut down.")
