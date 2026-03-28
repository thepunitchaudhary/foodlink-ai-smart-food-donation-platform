from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PickupRequestCreate(BaseModel):
    food_id: str


class PickupRequestResponse(BaseModel):
    id: str
    food_id: str
    food_name: str
    ngo_id: str
    ngo_name: str
    status: str  # pending, accepted, completed
    created_at: datetime


class PickupRequestUpdate(BaseModel):
    status: str  # accepted, completed, rejected
