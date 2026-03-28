from fastapi import APIRouter, Depends, Query
from app.database import food_collection
from app.middleware.auth import role_required
from app.ml.demand_predictor import compute_smart_score
from app.routes.food import food_doc_to_response
from app.models.food import SmartScore

router = APIRouter(prefix="/recommendations", tags=["Smart Recommendations"])


@router.get("")
async def get_recommendations(
    lat: float = Query(..., description="NGO latitude"),
    lng: float = Query(..., description="NGO longitude"),
    limit: int = Query(default=20, le=50),
    user=Depends(role_required(["ngo"])),
):
    """
    Smart food recommendations for NGOs.
    Ranks donations by composite score: urgency (45%) + distance (35%) + quantity (20%).
    Returns sorted results with 'Best Pickup' flagged.
    """
    cursor = food_collection.find({"status": "available"})
    all_foods = await cursor.to_list(length=500)

    scored_foods = []
    for f in all_foods:
        match = compute_smart_score(f, user_lat=lat, user_lng=lng)
        scored_foods.append((f, match))

    # Sort by smart_score descending
    scored_foods.sort(key=lambda x: x[1]["smart_score"], reverse=True)

    # Mark top item as best pickup
    results = []
    for i, (f, match) in enumerate(scored_foods[:limit]):
        if i == 0:
            match["is_best_pickup"] = True
        resp = food_doc_to_response(
            f,
            distance=match["distance_km"],
            smart_match=match,
        )
        results.append(resp)

    return results
