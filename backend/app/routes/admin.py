from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
import random
from app.database import users_collection, food_collection, requests_collection
from app.middleware.auth import role_required, get_current_user
from app.ml.demand_predictor import get_analytics_insights

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
async def get_stats(user=Depends(role_required(["admin"]))):
    total_donations = await food_collection.count_documents({})
    available_donations = await food_collection.count_documents({"status": "available"})
    picked_up = await food_collection.count_documents({"status": "picked_up"})
    total_requests = await requests_collection.count_documents({})
    pending_requests = await requests_collection.count_documents({"status": "pending"})
    total_users = await users_collection.count_documents({})
    restaurants = await users_collection.count_documents({"role": "restaurant"})
    ngos = await users_collection.count_documents({"role": "ngo"})

    # Impact metrics
    pipeline = [{"$group": {"_id": None, "total_qty": {"$sum": "$quantity"}}}]
    all_qty = await food_collection.aggregate(pipeline).to_list(1)
    total_qty = all_qty[0]["total_qty"] if all_qty else 0

    picked_pipeline = [
        {"$match": {"status": {"$in": ["picked_up", "reserved"]}}},
        {"$group": {"_id": None, "qty": {"$sum": "$quantity"}}},
    ]
    picked_qty = await food_collection.aggregate(picked_pipeline).to_list(1)
    meals_saved = picked_qty[0]["qty"] if picked_qty else 0
    waste_pct = round((meals_saved / max(total_qty, 1)) * 100, 1)

    # Avg pickup time estimate (hours between donation created and request)
    completed = await requests_collection.find({"status": {"$in": ["accepted", "completed"]}}).to_list(50)
    if completed:
        avg_h = sum(max(1, random.randint(1, 8)) for _ in completed) / len(completed)
    else:
        avg_h = 0
    avg_pickup_hours = round(avg_h, 1)

    return {
        "total_donations": total_donations,
        "available_donations": available_donations,
        "picked_up": picked_up,
        "total_requests": total_requests,
        "pending_requests": pending_requests,
        "total_users": total_users,
        "restaurants": restaurants,
        "ngos": ngos,
        "meals_saved": meals_saved,
        "waste_reduced_pct": waste_pct,
        "avg_pickup_hours": avg_pickup_hours,
    }


@router.get("/users")
async def get_users(user=Depends(role_required(["admin"]))):
    cursor = users_collection.find({}, {"password": 0}).sort("created_at", -1)
    users = await cursor.to_list(length=200)
    return [
        {
            "id": str(u["_id"]),
            "name": u["name"],
            "email": u["email"],
            "role": u["role"],
            "created_at": u["created_at"].isoformat(),
        }
        for u in users
    ]


@router.get("/analytics")
async def get_analytics(user=Depends(role_required(["admin"]))):
    """Deep analytics with insights."""
    return await get_analytics_insights()


@router.post("/demo-data")
async def generate_demo_data(user=Depends(role_required(["admin"]))):
    """Generate demo donations + requests for hackathon demo."""
    now = datetime.now(timezone.utc)
    food_names = ["Biryani", "Pasta", "Fried Rice", "Dal Makhani", "Paneer Tikka",
                  "Chole Bhature", "Idli Sambar", "Noodles", "Pulao", "Rajma Chawal"]
    cities = [
        {"address": "Madhapur, Hyderabad", "lat": 17.4484, "lng": 78.3908},
        {"address": "Jubilee Hills, Hyderabad", "lat": 17.4325, "lng": 78.4073},
        {"address": "Gachibowli, Hyderabad", "lat": 17.4401, "lng": 78.3489},
        {"address": "Banjara Hills, Hyderabad", "lat": 17.4138, "lng": 78.4479},
        {"address": "HITEC City, Hyderabad", "lat": 17.4435, "lng": 78.3772},
    ]

    donor_id = user["id"]
    donor_name = user["name"]
    inserted_foods = []

    for i in range(10):
        city = random.choice(cities)
        doc = {
            "food_name": food_names[i],
            "quantity": random.randint(10, 100),
            "expiry_time": now + timedelta(hours=random.randint(2, 48)),
            "location": {"lat": city["lat"] + random.uniform(-0.01, 0.01),
                         "lng": city["lng"] + random.uniform(-0.01, 0.01)},
            "address": city["address"],
            "donor_id": donor_id,
            "donor_name": donor_name,
            "status": random.choice(["available", "available", "available", "picked_up"]),
            "is_high_demand": random.random() > 0.5,
            "demand_score": round(random.uniform(20, 95), 1),
            "demand_level": random.choice(["High", "Medium", "Low"]),
            "created_at": now - timedelta(days=random.randint(0, 7), hours=random.randint(0, 23)),
        }
        result = await food_collection.insert_one(doc)
        inserted_foods.append(str(result.inserted_id))

    # Create some demo requests
    for fid in inserted_foods[:5]:
        await requests_collection.insert_one({
            "food_id": fid,
            "ngo_id": donor_id,
            "ngo_name": "Demo NGO",
            "food_name": random.choice(food_names),
            "status": random.choice(["pending", "accepted", "completed"]),
            "created_at": now - timedelta(days=random.randint(0, 5)),
        })

    return {"message": f"Created {len(inserted_foods)} demo donations + 5 requests", "count": len(inserted_foods)}

