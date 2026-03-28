from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Location(BaseModel):
    lat: float
    lng: float


class FoodCreate(BaseModel):
    food_name: str
    quantity: int
    expiry_time: datetime
    location: Location
    address: Optional[str] = ""


class DemandFactors(BaseModel):
    quantity_score: Optional[float] = 0
    urgency_score: Optional[float] = 0
    time_score: Optional[float] = 0
    area_score: Optional[float] = 0


class DemandPrediction(BaseModel):
    score: float = 0
    level: str = "Medium"
    factors: DemandFactors = DemandFactors()


class SmartScore(BaseModel):
    smart_score: float = 0
    urgency_score: float = 0
    distance_score: float = 0
    distance_km: Optional[float] = None
    quantity_score: float = 0
    is_best_pickup: bool = False
    urgency_label: str = "🟢 Low"


class FoodResponse(BaseModel):
    id: str
    food_name: str
    quantity: int
    expiry_time: datetime
    location: Location
    address: str
    donor_id: str
    donor_name: str
    status: str
    is_high_demand: bool
    created_at: datetime
    distance: Optional[float] = None
    demand_score: Optional[float] = None
    demand_level: Optional[str] = None
    smart_match: Optional[SmartScore] = None


class FoodUpdate(BaseModel):
    status: Optional[str] = None
    quantity: Optional[int] = None
