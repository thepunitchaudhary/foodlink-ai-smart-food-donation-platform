from fastapi import APIRouter, HTTPException, status
from datetime import datetime, timezone
from bson import ObjectId
from app.database import users_collection
from app.models.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.middleware.auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(user: UserCreate):
    if user.role not in ["restaurant", "ngo", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role. Use: restaurant, ngo, or admin")

    existing = await users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "name": user.name,
        "email": user.email,
        "password": hash_password(user.password),
        "role": user.role,
        "created_at": datetime.now(timezone.utc),
    }
    result = await users_collection.insert_one(user_doc)
    user_id = str(result.inserted_id)

    token = create_access_token({"sub": user_id, "role": user.role})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            name=user.name,
            email=user.email,
            role=user.role,
            created_at=user_doc["created_at"],
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login(user: UserLogin):
    db_user = await users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(db_user["_id"])
    token = create_access_token({"sub": user_id, "role": db_user["role"]})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            name=db_user["name"],
            email=db_user["email"],
            role=db_user["role"],
            created_at=db_user["created_at"],
        ),
    )
