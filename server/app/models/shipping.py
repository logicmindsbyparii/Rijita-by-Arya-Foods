from pydantic import BaseModel, Field
from typing import Optional, List


class ServiceabilitySchema(BaseModel):
    deliveryPincode: str
    weight: Optional[float] = None
    cod: bool = False
    declaredValue: Optional[float] = None
    # Optional cart payload so the quote uses real product weights
    items: Optional[List[dict]] = None


class CreateShipmentSchema(BaseModel):
    pickupLocation: Optional[str] = None
    length: Optional[float] = None
    breadth: Optional[float] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    # Assign the AWB in the same call once the order lands in Shiprocket
    courierId: Optional[str] = None
    autoAssignAwb: bool = True


class AssignAwbSchema(BaseModel):
    courierId: Optional[str] = None


class CancelShipmentSchema(BaseModel):
    cancelOrder: bool = True
    note: Optional[str] = None
