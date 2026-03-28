import math
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from app.database import food_collection, users_collection
from app.models.food import FoodCreate, FoodResponse, SmartScore
from app.middleware.auth import get_current_user, role_required
from app.ml.demand_predictor import (
    predict_high_demand,
    predict_demand_for_donation,
    compute_smart_score,
)

router = APIRouter(prefix="/food", tags=["Food Donations"])


def haversine(lat1, lng1, lat2, lng2):
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def food_doc_to_response(doc, distance=None, smart_match=None, demand=None):
    return FoodResponse(
        id=str(doc["_id"]),
        food_name=doc["food_name"],
        quantity=doc["quantity"],
        expiry_time=doc["expiry_time"],
        location=doc["location"],
        address=doc.get("address", ""),
        donor_id=doc["donor_id"],
        donor_name=doc.get("donor_name", ""),
        status=doc["status"],
        is_high_demand=doc.get("is_high_demand", False),
        created_at=doc["created_at"],
        distance=distance,
        demand_score=demand["score"] if demand else doc.get("demand_score"),
        demand_level=demand["level"] if demand else doc.get("demand_level"),
        smart_match=SmartScore(**smart_match) if smart_match else None,
    )


@router.post("", response_model=FoodResponse, status_code=201)
async def add_food(food: FoodCreate, user=Depends(role_required(["restaurant"]))):
    is_hd = await predict_high_demand(food.location.lat, food.location.lng)
    demand = await predict_demand_for_donation(
        food.quantity, food.expiry_time, food.location.lat, food.location.lng
    )

    doc = {
        "food_name": food.food_name,
        "quantity": food.quantity,
        "expiry_time": food.expiry_time,
        "location": {"lat": food.location.lat, "lng": food.location.lng},
        "address": food.address or "",
        "donor_id": user["id"],
        "donor_name": user["name"],
        "status": "available",
        "is_high_demand": is_hd or demand["level"] == "High",
        "demand_score": demand["score"],
        "demand_level": demand["level"],
        "created_at": datetime.now(timezone.utc),
    }
    result = await food_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return food_doc_to_response(doc, demand=demand)


@router.get("", response_model=list[FoodResponse])
async def list_food(user=Depends(get_current_user)):
    cursor = food_collection.find({"status": "available"}).sort("created_at", -1)
    foods = await cursor.to_list(length=100)
    return [food_doc_to_response(f) for f in foods]


@router.get("/my", response_model=list[FoodResponse])
async def my_food(user=Depends(role_required(["restaurant"]))):
    cursor = food_collection.find({"donor_id": user["id"]}).sort("created_at", -1)
    foods = await cursor.to_list(length=100)

    # Enrich with live demand scores
    results = []
    for f in foods:
        demand = await predict_demand_for_donation(
            f["quantity"], f["expiry_time"],
            f["location"]["lat"], f["location"]["lng"]
        )
        results.append(food_doc_to_response(f, demand=demand))
    return results


@router.get("/nearby", response_model=list[FoodResponse])
async def nearby_food(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: float = Query(default=50.0, description="Radius in km"),
    user=Depends(role_required(["ngo"])),
):
    cursor = food_collection.find({"status": "available"})
    all_foods = await cursor.to_list(length=500)

    nearby = []
    for f in all_foods:
        d = haversine(lat, lng, f["location"]["lat"], f["location"]["lng"])
        if d <= radius:
            nearby.append((f, round(d, 2)))

    nearby.sort(key=lambda x: x[1])
    return [food_doc_to_response(f, d) for f, d in nearby]
