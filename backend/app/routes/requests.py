from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
from app.database import requests_collection, food_collection
from app.models.request import PickupRequestCreate, PickupRequestResponse, PickupRequestUpdate
from app.middleware.auth import get_current_user, role_required

router = APIRouter(prefix="/requests", tags=["Pickup Requests"])


def req_doc_to_response(doc):
    return PickupRequestResponse(
        id=str(doc["_id"]),
        food_id=doc["food_id"],
        food_name=doc.get("food_name", ""),
        ngo_id=doc["ngo_id"],
        ngo_name=doc.get("ngo_name", ""),
        status=doc["status"],
        created_at=doc["created_at"],
    )


@router.post("", response_model=PickupRequestResponse, status_code=201)
async def create_request(req: PickupRequestCreate, user=Depends(role_required(["ngo"]))):
    food = await food_collection.find_one({"_id": ObjectId(req.food_id)})
    if not food:
        raise HTTPException(status_code=404, detail="Food donation not found")
    if food["status"] != "available":
        raise HTTPException(status_code=400, detail="Food is no longer available")

    existing = await requests_collection.find_one({
        "food_id": req.food_id,
        "ngo_id": user["id"],
        "status": {"$in": ["pending", "accepted"]},
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already requested this donation")

    doc = {
        "food_id": req.food_id,
        "food_name": food["food_name"],
        "ngo_id": user["id"],
        "ngo_name": user["name"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    }
    result = await requests_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return req_doc_to_response(doc)


@router.get("/my", response_model=list[PickupRequestResponse])
async def my_requests(user=Depends(get_current_user)):
    query = {}
    if user["role"] == "ngo":
        query["ngo_id"] = user["id"]
    elif user["role"] == "restaurant":
        my_foods = await food_collection.find({"donor_id": user["id"]}).to_list(500)
        food_ids = [str(f["_id"]) for f in my_foods]
        query["food_id"] = {"$in": food_ids}

    cursor = requests_collection.find(query).sort("created_at", -1)
    reqs = await cursor.to_list(length=100)
    return [req_doc_to_response(r) for r in reqs]


@router.patch("/{request_id}/status", response_model=PickupRequestResponse)
async def update_request_status(
    request_id: str,
    update: PickupRequestUpdate,
    user=Depends(role_required(["restaurant", "admin"])),
):
    if update.status not in ["accepted", "completed", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    req = await requests_collection.find_one({"_id": ObjectId(request_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    await requests_collection.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": update.status}},
    )

    if update.status == "accepted":
        await food_collection.update_one(
            {"_id": ObjectId(req["food_id"])},
            {"$set": {"status": "reserved"}},
        )
    elif update.status == "completed":
        await food_collection.update_one(
            {"_id": ObjectId(req["food_id"])},
            {"$set": {"status": "picked_up"}},
        )

    req["status"] = update.status
    return req_doc_to_response(req)
