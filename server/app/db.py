from typing import Optional, Any
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from bson import ObjectId
from app.config import settings
import logging

logger = logging.getLogger("rijita.db")

class Database:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

db_instance = Database()

async def connect_db():
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI.split('@')[-1] if '@' in settings.MONGODB_URI else settings.MONGODB_URI}")
    db_instance.client = AsyncIOMotorClient(settings.MONGODB_URI)
    # Extract DB name from URI if present, default to 'rijita'
    db_name = "rijita"
    if "/" in settings.MONGODB_URI.split("://")[-1]:
        path = settings.MONGODB_URI.split("://")[-1].split("/")[1]
        if path and not path.startswith("?"):
            db_name = path.split("?")[0]
    
    db_instance.db = db_instance.client[db_name]
    logger.info(f"Connected to MongoDB database: '{db_name}'")
    
    # Initialize indexes asynchronously
    await ensure_indexes()

async def close_db():
    if db_instance.client:
        db_instance.client.close()
        logger.info("MongoDB connection closed.")

def get_db() -> AsyncIOMotorDatabase:
    if db_instance.db is None:
        raise RuntimeError("Database connection has not been initialized.")
    return db_instance.db

def to_object_id(id_str: Any) -> ObjectId:
    if isinstance(id_str, ObjectId):
        return id_str
    if not id_str:
        raise ValueError("Invalid ObjectId: None or empty string")
    try:
        return ObjectId(str(id_str))
    except Exception:
        raise ValueError(f"Invalid ObjectId: {id_str}")

def is_valid_object_id(id_str: Any) -> bool:
    if not id_str or isinstance(id_str, (dict, list)):
        return False
    if isinstance(id_str, ObjectId):
        return True
    try:
        return ObjectId.is_valid(str(id_str))
    except Exception:
        return False

async def ensure_indexes():
    """Create every index the app relies on, isolating failures per index.

    These used to run as ~20 sequential awaits inside a single try/except. Any
    one failure — most plausibly a `unique` index that pre-existing duplicate
    data rejects — aborted the whole function, so every index declared *after*
    it was silently never created. A single duplicate email could therefore
    leave orders without their unique `orderNumber` index and coupons without
    their unique `code` index, with nothing in the logs but one warning.
    """
    db = get_db()

    specs: list[tuple[str, Any, dict]] = [
        # Users
        ("users", "email", {"unique": True}),

        # Products. `variants.sku` is unique: order placement resolves a line
        # item to a variant by sku alone (variants carry no _id), so a sku shared
        # across two products would bill the customer for the wrong one.
        ("products", "slug", {"unique": True}),
        ("products", "variants.sku", {"unique": True}),
        ("products", [("name", "text"), ("description", "text"), ("tags", "text")], {}),
        ("products", "category", {}),
        ("products", [("isActive", 1), ("isFeatured", 1)], {}),
        ("products", "minPrice", {}),

        # Categories
        ("categories", "slug", {"unique": True}),
        ("categories", "parent", {}),
        ("categories", [("isActive", 1), ("order", 1)], {}),

        # Orders
        ("orders", "orderNumber", {"unique": True}),
        ("orders", "user", {}),
        ("orders", "status", {}),
        ("orders", [("createdAt", -1)], {}),
        ("orders", "shippingAddress.phone", {}),

        # Coupons
        ("coupons", "code", {"unique": True}),

        # Blogs / Recipes
        ("blogs", "slug", {"unique": True}),
        ("recipes", "slug", {"unique": True}),

        # Subscribers
        ("subscribers", "email", {"unique": True}),
    ]

    created = 0
    failed = []
    for collection, keys, opts in specs:
        try:
            await db[collection].create_index(keys, **opts)
            created += 1
        except Exception as e:
            failed.append(f"{collection}.{keys}: {e}")

    if failed:
        logger.warning(
            f"MongoDB indexes: {created}/{len(specs)} created; {len(failed)} failed -> "
            + " | ".join(failed)
        )
    else:
        logger.info(f"MongoDB indexes verified/created successfully ({created}).")
