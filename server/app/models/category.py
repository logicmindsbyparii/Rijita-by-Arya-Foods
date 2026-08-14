from pydantic import BaseModel
from typing import Optional

class CategoryCreateSchema(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    parent: Optional[str] = None
    isActive: bool = True
    order: int = 0
