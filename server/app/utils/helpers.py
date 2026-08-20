import re
import math
from datetime import datetime
from bson import ObjectId

from typing import Any

def escape_regex(text: Any) -> str:
    if not text:
        return ""
    return re.escape(str(text))

def generate_slug(text: Any) -> str:
    if not text:
        return ""
    text_str = str(text).lower().strip()
    text_str = re.sub(r'[^\w\s-]', '', text_str)
    text_str = re.sub(r'[\s_-]+', '-', text_str)
    text_str = re.sub(r'^-+|-+$', '', text_str)
    return text_str

async def ensure_unique_slug(collection, base_slug: str, fallback: str = "item", exclude_id: Any = None) -> str:
    """Return a slug that is free in `collection`, suffixing -2, -3, ... as needed.

    products/categories/blogs/recipes all carry a unique index on `slug`, but
    every create path fed `generate_slug(name)` straight in. Two products named
    "Organic Turmeric" — or any name made only of punctuation, which slugifies to
    the empty string — collided on that index and surfaced to the admin as a bare
    500 "Internal server error" with the whole form lost.

    `exclude_id` lets an update keep its own current slug without colliding with
    itself.
    """
    base = (base_slug or "").strip() or generate_slug(fallback) or "item"
    candidate = base
    suffix = 2
    while True:
        query: dict = {"slug": candidate}
        if exclude_id is not None:
            query["_id"] = {"$ne": exclude_id}
        if not await collection.find_one(query, {"_id": 1}):
            return candidate
        candidate = f"{base}-{suffix}"
        suffix += 1


def paginate_query(page: int = 1, limit: int = 10):
    page = max(1, page)
    limit = max(1, min(100, limit))
    skip = (page - 1) * limit
    return skip, limit, page

def build_pagination(total: int, page: int, limit: int):
    pages = math.ceil(total / limit) if limit > 0 else 0
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
        "totalPages": pages,
        "hasPrevPage": page > 1,
        "hasNextPage": page < pages,
    }

def parse_datetime(value: Any, end_of_day: bool = False) -> datetime:
    """Parse an ISO date/datetime string. Date-only values default to midnight,
    or to 23:59:59.999999 when end_of_day is set (so a `to` filter includes the
    whole last day instead of just its midnight)."""
    if not value:
        return None
    v = str(value)
    if end_of_day and "T" not in v:
        v += "T23:59:59.999999"
    return datetime.fromisoformat(v)

def serialize_doc(doc: Any) -> Any:
    """
    Recursively converts BSON data (ObjectId, datetime) to JSON-safe Python dicts/lists.
    Replaces ObjectId with str, keeps _id as string.
    """
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, (dict, list)):
                result[key] = serialize_doc(value)
            else:
                result[key] = value
        # Ensure _id is a string if present
        if "_id" in result and isinstance(result["_id"], ObjectId):
            result["_id"] = str(result["_id"])
        return result
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return doc.isoformat()
    return doc
