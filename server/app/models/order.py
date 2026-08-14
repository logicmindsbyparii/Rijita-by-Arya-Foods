from pydantic import BaseModel, Field
from typing import Optional, List

class OrderItemInputSchema(BaseModel):
    product: Optional[str] = None
    productId: Optional[str] = None
    variant: Optional[str] = None
    variantId: Optional[str] = None
    sku: Optional[str] = None
    quantity: int = Field(gt=0)

class ShippingAddressInputSchema(BaseModel):
    fullName: str
    phone: str
    addressLine1: str
    addressLine2: Optional[str] = None
    city: str
    state: str
    pincode: str

class PlaceOrderSchema(BaseModel):
    items: List[OrderItemInputSchema]
    shippingAddress: ShippingAddressInputSchema
    coupon: Optional[str] = None
    couponCode: Optional[str] = None
    notes: Optional[str] = None
    paymentMethod: Optional[str] = "whatsapp"

class UpdateOrderStatusSchema(BaseModel):
    status: str
    note: Optional[str] = None

class BulkUpdateOrderStatusSchema(BaseModel):
    orderIds: List[str]
    status: str
    note: Optional[str] = None
