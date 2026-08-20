from pydantic import BaseModel, EmailStr, Field
from typing import Literal, Optional, List

# The only roles require_roles() and the admin guards understand. `role` used to
# be a bare `str`, so the admin user form could store any value at all — a typo
# like "Admin" or "superadmin " silently failed every role check afterwards and
# locked the account out of the panel with no error anywhere.
UserRole = Literal["customer", "admin", "superadmin"]

class AddressSchema(BaseModel):
    label: str = "Home"
    fullName: str
    phone: str
    addressLine1: str
    addressLine2: Optional[str] = None
    city: str
    state: str
    pincode: str
    isDefault: bool = False

class UserRegisterSchema(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str

class UserLoginSchema(BaseModel):
    email: EmailStr
    password: str

class UserUpdateProfileSchema(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None

class ChangePasswordSchema(BaseModel):
    currentPassword: str
    newPassword: str

class ForgotPasswordSchema(BaseModel):
    email: EmailStr

class ResetPasswordSchema(BaseModel):
    token: str
    password: str

class AdminCreateUserSchema(BaseModel):
    name: str
    email: EmailStr
    phone: str
    # Same 6-character floor register, reset-password and change-password all
    # enforce — the admin form was the one way to create a weaker password.
    password: str = Field(min_length=6)
    role: Optional[UserRole] = "customer"
    isActive: Optional[bool] = True

class AdminUpdateUserSchema(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=6)
    role: Optional[UserRole] = None
    isActive: Optional[bool] = None
