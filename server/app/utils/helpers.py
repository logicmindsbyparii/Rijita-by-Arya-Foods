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
        "hasPrevPage": page > 1,
        "hasNextPage": page < pages,
    }

def serialize_doc(doc):
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
