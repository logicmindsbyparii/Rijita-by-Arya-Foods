from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from typing import Optional
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from bson import ObjectId

from app.db import get_db, to_object_id, is_valid_object_id
from app.utils.auth import (
    hash_password, verify_password,
    generate_access_token, generate_refresh_token, decode_refresh_token,
    get_current_user
)
from app.utils.helpers import serialize_doc
from app.utils.mailer import send_password_reset_email
from app.models.user import (
    UserRegisterSchema, UserLoginSchema, UserUpdateProfileSchema,
    ChangePasswordSchema, ForgotPasswordSchema, ResetPasswordSchema,
    AddressSchema
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: UserRegisterSchema, response: Response):
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    db = get_db()
    email_clean = body.email.lower().strip()
    existing = await db.users.find_one({"email": email_clean})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_doc = {
        "name": body.name.strip(),
        "email": email_clean,
        "phone": body.phone.strip(),
        "password": hash_password(body.password),
        "role": "customer",
        "isActive": True,
        "addresses": [],
        "wishlist": [],
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    
    res = await db.users.insert_one(user_doc)
    user_id = str(res.inserted_id)
    user_doc["_id"] = user_id
    
    payload = {"id": user_id, "role": "customer", "email": email_clean}
    access_token = generate_access_token(payload)
    refresh_token = generate_refresh_token(payload)
    
    response.set_cookie(
        key="refreshToken",
        value=refresh_token,
        httponly=True,
        max_age=30 * 24 * 60 * 60,
        path="/api/auth",
        samesite="lax"
    )
    
    serialized_user = serialize_doc(user_doc)
    serialized_user.pop("password", None)
    
    return {
        "success": True,
        "data": {
            "user": serialized_user,
            "accessToken": access_token,
            "refreshToken": refresh_token
        },
        "message": "Registration successful"
    }

@router.post("/login")
async def login(body: UserLoginSchema, response: Response):
    db = get_db()
    email_clean = body.email.lower().strip()
    user = await db.users.find_one({"email": email_clean})
    
    if not user or not verify_password(body.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("isActive", True):
        raise HTTPException(status_code=401, detail="Account deactivated")
    
    user_id = str(user["_id"])
    role = user.get("role", "customer")
    
    payload = {"id": user_id, "role": role, "email": email_clean}
    access_token = generate_access_token(payload)
    refresh_token = generate_refresh_token(payload)
    
    response.set_cookie(
        key="refreshToken",
        value=refresh_token,
        httponly=True,
        max_age=30 * 24 * 60 * 60,
        path="/api/auth",
        samesite="lax"
    )
    
    serialized_user = serialize_doc(user)
    serialized_user.pop("password", None)
    
    return {
        "success": True,
        "data": {
            "user": serialized_user,
            "accessToken": access_token,
            "refreshToken": refresh_token
        },
        "message": "Login successful"
    }

@router.post("/refresh-token")
async def refresh_token(request: Request, response: Response, body: Optional[dict] = None):
    token = None
    if body and "refreshToken" in body:
        token = body["refreshToken"]
    elif request.cookies.get("refreshToken"):
        token = request.cookies.get("refreshToken")
        
    if not token:
        raise HTTPException(status_code=400, detail="Refresh token required")
    
    try:
        decoded = decode_refresh_token(token)
        user_id = decoded.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        db = get_db()
        user = await db.users.find_one({"_id": to_object_id(user_id)})
        if not user or not user.get("isActive", True):
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        role = user.get("role", "customer")
        payload = {"id": user_id, "role": role, "email": user.get("email")}
        new_access_token = generate_access_token(payload)
        new_refresh_token = generate_refresh_token(payload)
        
        response.set_cookie(
            key="refreshToken",
            value=new_refresh_token,
            httponly=True,
            max_age=30 * 24 * 60 * 60,
            path="/api/auth",
            samesite="lax"
        )
        
        return {
            "success": True,
            "data": {
                "accessToken": new_access_token,
                "refreshToken": new_refresh_token
            }
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    db = get_db()
    # Populate wishlist products
    user_obj = await db.users.find_one({"_id": to_object_id(current_user["_id"])})
    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found")
    wishlist_ids = [to_object_id(pid) for pid in user_obj.get("wishlist", []) if is_valid_object_id(pid)]
    
    wishlist_products = []
    if wishlist_ids:
        cursor = db.products.find({"_id": {"$in": wishlist_ids}})
        wishlist_products = await cursor.to_list(length=100)
    
    serialized_user = serialize_doc(user_obj)
    serialized_user.pop("password", None)
    serialized_user["wishlist"] = serialize_doc(wishlist_products)
    
    return {"success": True, "data": {"user": serialized_user}}

@router.put("/profile")
async def update_profile(body: UserUpdateProfileSchema, current_user: dict = Depends(get_current_user)):
    update_data = {}
    if body.name is not None:
        update_data["name"] = body.name
    if body.phone is not None:
        update_data["phone"] = body.phone
    if body.avatar is not None:
        update_data["avatar"] = body.avatar
        
    update_data["updatedAt"] = datetime.now(timezone.utc)
    
    db = get_db()
    user = await db.users.find_one_and_update(
        {"_id": to_object_id(current_user["_id"])},
        {"$set": update_data},
        return_document=True
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    serialized_user = serialize_doc(user)
    serialized_user.pop("password", None)
    return {"success": True, "data": {"user": serialized_user}, "message": "Profile updated"}

@router.put("/change-password")
async def change_password(body: ChangePasswordSchema, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"_id": to_object_id(current_user["_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not verify_password(body.currentPassword, user.get("password", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
        
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": hash_password(body.newPassword), "updatedAt": datetime.now(timezone.utc)}}
    )
    return {"success": True, "data": {}, "message": "Password changed successfully"}

@router.post("/addresses")
async def add_address(address: AddressSchema, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"_id": to_object_id(current_user["_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    addresses = user.get("addresses", [])
    address_dict = address.model_dump()
    address_dict["_id"] = str(ObjectId())
    
    if address_dict.get("isDefault"):
        for addr in addresses:
            addr["isDefault"] = False
            
    addresses.append(address_dict)
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"addresses": addresses, "updatedAt": datetime.now(timezone.utc)}}
    )
    return {"success": True, "data": {"addresses": serialize_doc(addresses)}, "message": "Address added"}

@router.put("/addresses/{address_id}")
async def update_address(address_id: str, address_data: AddressSchema, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"_id": to_object_id(current_user["_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    addresses = user.get("addresses", [])
    target = None
    for addr in addresses:
        if str(addr.get("_id")) == address_id:
            target = addr
            break
            
    if not target:
        raise HTTPException(status_code=404, detail="Address not found")
        
    newData = address_data.model_dump()
    if newData.get("isDefault"):
        for addr in addresses:
            addr["isDefault"] = False
            
    target.update(newData)
    target["_id"] = address_id
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"addresses": addresses, "updatedAt": datetime.now(timezone.utc)}}
    )
    return {"success": True, "data": {"addresses": serialize_doc(addresses)}, "message": "Address updated"}

@router.delete("/addresses/{address_id}")
async def delete_address(address_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"_id": to_object_id(current_user["_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    addresses = [a for a in user.get("addresses", []) if str(a.get("_id")) != address_id]
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"addresses": addresses, "updatedAt": datetime.now(timezone.utc)}}
    )
    return {"success": True, "data": {"addresses": serialize_doc(addresses)}, "message": "Address deleted"}

@router.get("/wishlist")
async def get_wishlist(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"_id": to_object_id(current_user["_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    wishlist_ids = [to_object_id(pid) for pid in user.get("wishlist", []) if is_valid_object_id(pid)]
    
    products = []
    if wishlist_ids:
        cursor = db.products.find({"_id": {"$in": wishlist_ids}})
        products = await cursor.to_list(length=100)
        
    return {"success": True, "data": {"wishlist": serialize_doc(products)}}

@router.post("/wishlist/{product_id}")
async def toggle_wishlist(product_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"_id": to_object_id(current_user["_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    wishlist = [str(x) for x in user.get("wishlist", [])]
    if product_id in wishlist:
        wishlist.remove(product_id)
        msg = "Removed from wishlist"
    else:
        wishlist.append(product_id)
        msg = "Added to wishlist"
        
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"wishlist": wishlist, "updatedAt": datetime.now(timezone.utc)}}
    )
    return {"success": True, "data": {"wishlist": wishlist}, "message": msg}

@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordSchema):
    db = get_db()
    email_clean = body.email.lower().strip()
    user = await db.users.find_one({"email": email_clean})
    
    if not user:
        return {"success": True, "data": {"message": "If an account with that email exists, a password reset link has been sent."}}
        
    raw_token = secrets.token_hex(32)
    hashed_token = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"resetPasswordToken": hashed_token, "resetPasswordExpires": expires}}
    )
    
    await send_password_reset_email(user["email"], raw_token)
    return {"success": True, "data": {"message": "If an account with that email exists, a password reset link has been sent."}}

@router.post("/reset-password")
async def reset_password(body: ResetPasswordSchema):
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
    hashed_token = hashlib.sha256(body.token.encode('utf-8')).hexdigest()
    db = get_db()
    
    user = await db.users.find_one({
        "resetPasswordToken": hashed_token,
        "resetPasswordExpires": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"password": hash_password(body.password), "updatedAt": datetime.now(timezone.utc)},
            "$unset": {"resetPasswordToken": "", "resetPasswordExpires": ""}
        }
    )
    return {"success": True, "data": {"message": "Password has been reset successfully"}}
