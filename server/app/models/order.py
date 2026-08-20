from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal
import re

# Client checkout validates these too — the server must not trust the client,
# since a malformed order would otherwise be stored and only fail later at the
# courier (or, for paymentMethod, route the order down the wrong UI branch).
_PHONE_RE = re.compile(r"^[6-9]\d{9}$")
_PINCODE_RE = re.compile(r"^\d{6}$")


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
    # Shiprocket requires a billing email on every shipment
    email: Optional[str] = None
    addressLine1: str
    addressLine2: Optional[str] = None
    city: str
    state: str
    pincode: str

    @field_validator("fullName", "addressLine1", "city", "state")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("is required")
        return v

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, v: str) -> str:
        # Normalize to digits (the client already does this before validating),
        # so the stored number is the one wa.me links and the courier use.
        digits = re.sub(r"\D", "", v or "")
        if not _PHONE_RE.match(digits):
            raise ValueError("Enter a valid 10-digit Indian phone number")
        return digits

    @field_validator("pincode")
    @classmethod
    def valid_pincode(cls, v: str) -> str:
        v = (v or "").strip()
        if not _PINCODE_RE.match(v):
            raise ValueError("Enter a valid 6-digit pincode")
        return v


class PlaceOrderSchema(BaseModel):
    items: List[OrderItemInputSchema]
    shippingAddress: ShippingAddressInputSchema
    coupon: Optional[str] = None
    couponCode: Optional[str] = None
    notes: Optional[str] = None
    # The whole flow branches off this field — COD auto-ships and skips the
    # payment window, anything else shows the UPI QR + screenshot flow. Lock it
    # to the values the storefront actually uses so garbage can't be stored.
    paymentMethod: Literal["upi", "cod", "whatsapp", "online", "demo-online"] = "whatsapp"


class UpdateOrderStatusSchema(BaseModel):
    status: str
    note: Optional[str] = None


class BulkUpdateOrderStatusSchema(BaseModel):
    orderIds: List[str]
    status: str
    note: Optional[str] = None
