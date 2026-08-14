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
    try:
        db = get_db()
        # Users
        await db.users.create_index("email", unique=True)
        
        # Products
        await db.products.create_index("slug", unique=True)
        await db.products.create_index([("name", "text"), ("description", "text"), ("tags", "text")])
        await db.products.create_index("category")
        await db.products.create_index([("isActive", 1), ("isFeatured", 1)])
        await db.products.create_index("minPrice")

        # Categories
        await db.categories.create_index("slug", unique=True)
        await db.categories.create_index("parent")
        await db.categories.create_index([("isActive", 1), ("order", 1)])

        # Orders
        await db.orders.create_index("orderNumber", unique=True)
        await db.orders.create_index("user")
        await db.orders.create_index("status")
        await db.orders.create_index([("createdAt", -1)])
        await db.orders.create_index("shippingAddress.phone")

        # Coupons
        await db.coupons.create_index("code", unique=True)

        # Blogs
        await db.blogs.create_index("slug", unique=True)

        # Recipes
        await db.recipes.create_index("slug", unique=True)

        # Subscribers
        await db.subscribers.create_index("email", unique=True)

        logger.info("MongoDB indexes verified/created successfully.")
    except Exception as e:
        logger.warning(f"Error setting up MongoDB indexes: {e}")
