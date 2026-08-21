from pydantic import BaseModel, EmailStr, Field
from typing import Optional

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

class ValidateCouponSchema(BaseModel):
    code: str
    subtotal: float
