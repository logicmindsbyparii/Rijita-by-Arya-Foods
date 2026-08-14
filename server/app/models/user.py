from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

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
    password: str
    role: Optional[str] = "customer"
    isActive: Optional[bool] = True

class AdminUpdateUserSchema(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    isActive: Optional[bool] = None
