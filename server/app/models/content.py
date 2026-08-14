from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime

class BlogCreateSchema(BaseModel):
    title: str
    slug: Optional[str] = None
    content: str
    excerpt: Optional[str] = None
    featuredImage: Optional[str] = None
    author: str
    tags: List[str] = []
    category: Optional[str] = None
    isPublished: bool = False
    metaTitle: Optional[str] = None
    metaDescription: Optional[str] = None
    publishedAt: Optional[datetime] = None

class RecipeCreateSchema(BaseModel):
    title: str
    slug: Optional[str] = None
    description: str
    ingredients: List[str]
    instructions: List[str]
    prepTime: int
    cookTime: int
    servings: int
    difficulty: str
    featuredImage: Optional[str] = None
    products: List[str] = []
    tags: List[str] = []
    isPublished: bool = False
    metaTitle: Optional[str] = None
    metaDescription: Optional[str] = None

class CreateReviewSchema(BaseModel):
    productId: str
    rating: int = Field(ge=1, le=5)
    title: Optional[str] = None
    comment: str

class ContactSubmitSchema(BaseModel):
    name: str
    email: EmailStr
    phone: str
    subject: str
    message: str
    type: Optional[str] = "general"

class SubscribeSchema(BaseModel):
    email: EmailStr

class CollectionCreateSchema(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    products: List[str] = []
    isActive: bool = True

class CouponCreateSchema(BaseModel):
    code: str
    description: Optional[str] = None
    type: str  # percentage / fixed
    value: float
    minOrderAmount: float = 0
    maxDiscount: Optional[float] = None
    usageLimit: int = 100
    startsAt: datetime
    expiresAt: datetime
    isActive: bool = True

class ValidateCouponSchema(BaseModel):
    code: str
    subtotal: float
