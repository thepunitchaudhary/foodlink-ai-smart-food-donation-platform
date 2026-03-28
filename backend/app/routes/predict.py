from fastapi import APIRouter, Depends, Query
from datetime import datetime
from pydantic import BaseModel
from app.middleware.auth import get_current_user
from app.ml.demand_predictor import predict_demand_for_donation, get_grid_stats

router = APIRouter(prefix="/predict-demand", tags=["Demand Prediction"])


class DemandRequest(BaseModel):
    quantity: int
    expiry_time: datetime
    lat: float
    lng: float


@router.post("")
async def predict_demand(req: DemandRequest, user=Depends(get_current_user)):
    """
    Predict demand score for a potential donation.
    Returns: score (0-100), level (High/Medium/Low), and factor breakdown.
    """
    result = await predict_demand_for_donation(
        req.quantity, req.expiry_time, req.lat, req.lng
    )
    return result


@router.get("/heatmap")
async def demand_heatmap(user=Depends(get_current_user)):
    """
    Get demand heatmap data — grid cells with donation/pickup stats.
    Used for map overlays showing high-demand zones.
    """
    grid_data = await get_grid_stats()
    cells = []
    for key, v in grid_data.items():
        ratio = v["pickups"] / max(v["donations"], 1)
        cells.append({
            "lat": v["lat"],
            "lng": v["lng"],
            "donations": v["donations"],
            "pickups": v["pickups"],
            "pickup_ratio": round(ratio, 2),
            "intensity": "high" if ratio > 0.6 else "medium" if ratio > 0.3 else "low",
        })
    return {"cells": cells}
