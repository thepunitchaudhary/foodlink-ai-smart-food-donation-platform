import math
import numpy as np
from datetime import datetime, timezone
from sklearn.ensemble import RandomForestClassifier
from app.database import food_collection, requests_collection


def _grid_key(lat: float, lng: float, cell_size: float = 0.01) -> tuple:
    """Map lat/lng to a grid cell (~1km at equator)."""
    return (round(lat / cell_size) * cell_size, round(lng / cell_size) * cell_size)


def _hour_weight(hour: int) -> float:
    """Weight by time of day: peak lunch (11-14) and dinner (18-21) hours score higher."""
    if 11 <= hour <= 14:
        return 1.0
    elif 18 <= hour <= 21:
        return 0.9
    elif 7 <= hour <= 10:
        return 0.6
    else:
        return 0.3


def compute_demand_score(quantity: int, hours_until_expiry: float, hour_of_day: int,
                          grid_donations: int = 0, grid_pickups: int = 0) -> dict:
    """
    Compute a demand score for a food donation.
    Returns: { score: float 0-100, level: "High"/"Medium"/"Low", factors: {...} }
    """
    # Factor 1: Quantity score (more food = higher demand potential) — 0 to 25
    qty_score = min(25, (quantity / 100) * 25)

    # Factor 2: Urgency score (closer to expiry = more urgent pickup needed) — 0 to 30
    if hours_until_expiry <= 0:
        urgency_score = 0  # expired
    elif hours_until_expiry <= 3:
        urgency_score = 30
    elif hours_until_expiry <= 6:
        urgency_score = 25
    elif hours_until_expiry <= 12:
        urgency_score = 18
    elif hours_until_expiry <= 24:
        urgency_score = 10
    else:
        urgency_score = 5

    # Factor 3: Time-of-day weight — 0 to 20
    time_score = _hour_weight(hour_of_day) * 20

    # Factor 4: Historical area demand — 0 to 25
    if grid_donations > 0:
        pickup_ratio = grid_pickups / grid_donations
        area_score = min(25, pickup_ratio * 25 + (grid_donations / 10) * 5)
    else:
        area_score = 10  # neutral for new areas

    total = qty_score + urgency_score + time_score + area_score
    total = min(100, max(0, total))

    if total >= 65:
        level = "High"
    elif total >= 35:
        level = "Medium"
    else:
        level = "Low"

    # Confidence: how spread the top factor is vs others
    factor_vals = [qty_score, urgency_score, time_score, area_score]
    max_f = max(factor_vals)
    confidence = min(95, round(55 + (max_f / max(sum(factor_vals), 1)) * 40, 1))

    # Explanation
    reasons = []
    if urgency_score >= 25:
        reasons.append("short expiry time (high urgency)")
    if area_score >= 18:
        reasons.append("high NGO demand in this area")
    if qty_score >= 15:
        reasons.append("large quantity available")
    if time_score >= 14:
        reasons.append("peak mealtime hours")
    if not reasons:
        reasons.append("moderate factors across the board")

    explanation = f"{level} demand due to {', '.join(reasons)}."

    return {
        "score": round(total, 1),
        "level": level,
        "confidence": confidence,
        "explanation": explanation,
        "factors": {
            "quantity_score": round(qty_score, 1),
            "urgency_score": round(urgency_score, 1),
            "time_score": round(time_score, 1),
            "area_score": round(area_score, 1),
        }
    }


async def get_grid_stats() -> dict:
    """Get donation/pickup counts per grid cell from historical data."""
    all_foods = await food_collection.find().to_list(length=2000)
    all_requests = await requests_collection.find().to_list(length=2000)

    grid_data = {}
    food_id_to_grid = {}

    for f in all_foods:
        loc = f.get("location", {})
        if "lat" not in loc or "lng" not in loc:
            continue
        key = _grid_key(loc["lat"], loc["lng"])
        if key not in grid_data:
            grid_data[key] = {"donations": 0, "total_qty": 0, "pickups": 0, "lat": loc["lat"], "lng": loc["lng"]}
        grid_data[key]["donations"] += 1
        grid_data[key]["total_qty"] += f.get("quantity", 0)
        food_id_to_grid[str(f["_id"])] = key

    for r in all_requests:
        fid = r.get("food_id", "")
        if fid in food_id_to_grid and r.get("status") in ["accepted", "completed"]:
            grid_data[food_id_to_grid[fid]]["pickups"] += 1

    return grid_data


async def predict_high_demand(lat: float, lng: float) -> bool:
    """Predict if a location is in a high-demand area."""
    try:
        grid_data = await get_grid_stats()
        if len(grid_data) < 3:
            return False

        query_key = _grid_key(lat, lng)
        now = datetime.now(timezone.utc)
        hour = now.hour

        grid_d = grid_data.get(query_key, {"donations": 0, "total_qty": 0, "pickups": 0})
        result = compute_demand_score(
            quantity=50,
            hours_until_expiry=6,
            hour_of_day=hour,
            grid_donations=grid_d["donations"],
            grid_pickups=grid_d["pickups"],
        )
        return result["level"] == "High"
    except Exception:
        return False


async def predict_demand_for_donation(quantity: int, expiry_time: datetime,
                                       lat: float, lng: float) -> dict:
    """Full demand prediction for a specific donation."""
    try:
        grid_data = await get_grid_stats()
        now = datetime.now(timezone.utc)

        if expiry_time.tzinfo is None:
            hours_until_expiry = (expiry_time - now.replace(tzinfo=None)).total_seconds() / 3600
        else:
            hours_until_expiry = (expiry_time - now).total_seconds() / 3600

        query_key = _grid_key(lat, lng)
        grid_d = grid_data.get(query_key, {"donations": 0, "total_qty": 0, "pickups": 0})

        return compute_demand_score(
            quantity=quantity,
            hours_until_expiry=hours_until_expiry,
            hour_of_day=now.hour,
            grid_donations=grid_d["donations"],
            grid_pickups=grid_d["pickups"],
        )
    except Exception:
        return {"score": 50.0, "level": "Medium", "factors": {}}


def compute_smart_score(food: dict, user_lat: float = None, user_lng: float = None) -> dict:
    """
    Smart matching score for NGO recommendations.
    score = urgency_weight * urgency + distance_weight * proximity + quantity_weight * qty_norm
    """
    now = datetime.now(timezone.utc)
    expiry = food.get("expiry_time", now)
    if expiry.tzinfo is None:
        hours_left = (expiry - now.replace(tzinfo=None)).total_seconds() / 3600
    else:
        hours_left = (expiry - now).total_seconds() / 3600

    # Urgency: inverse of hours left (capped)
    if hours_left <= 0:
        urgency = 0
    elif hours_left <= 2:
        urgency = 100
    elif hours_left <= 6:
        urgency = 80
    elif hours_left <= 12:
        urgency = 60
    elif hours_left <= 24:
        urgency = 40
    else:
        urgency = 20

    # Distance: inverse distance score (closer = higher)
    distance_score = 50  # default if no user location
    distance_km = None
    if user_lat is not None and user_lng is not None:
        loc = food.get("location", {})
        if "lat" in loc and "lng" in loc:
            R = 6371
            d_lat = math.radians(loc["lat"] - user_lat)
            d_lng = math.radians(loc["lng"] - user_lng)
            a = (math.sin(d_lat / 2) ** 2 +
                 math.cos(math.radians(user_lat)) * math.cos(math.radians(loc["lat"])) *
                 math.sin(d_lng / 2) ** 2)
            distance_km = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            # Closer = higher score, max at 0km, drops off
            distance_score = max(0, 100 - (distance_km * 2))

    # Quantity normalized
    qty = food.get("quantity", 0)
    qty_score = min(100, (qty / 100) * 100)

    # Weighted combination
    total = (urgency * 0.45) + (distance_score * 0.35) + (qty_score * 0.20)
    total = min(100, max(0, total))

    is_best = total >= 70

    return {
        "smart_score": round(total, 1),
        "urgency_score": urgency,
        "distance_score": round(distance_score, 1),
        "distance_km": round(distance_km, 2) if distance_km is not None else None,
        "quantity_score": round(qty_score, 1),
        "is_best_pickup": is_best,
        "urgency_label": "🔴 Critical" if urgency >= 80 else "🟡 Moderate" if urgency >= 40 else "🟢 Low",
    }


async def get_analytics_insights() -> dict:
    """Generate deep analytics insights for admin dashboard."""
    all_foods = await food_collection.find().to_list(length=2000)
    all_requests = await requests_collection.find().to_list(length=2000)

    # Donations over time (by date)
    donations_by_date = {}
    donations_by_hour = {}
    total_qty_donated = 0
    total_qty_picked = 0

    for f in all_foods:
        created = f.get("created_at")
        if created:
            date_key = created.strftime("%Y-%m-%d")
            donations_by_date[date_key] = donations_by_date.get(date_key, 0) + 1
            hour_key = created.hour
            donations_by_hour[hour_key] = donations_by_hour.get(hour_key, 0) + 1

        total_qty_donated += f.get("quantity", 0)
        if f.get("status") in ["picked_up", "reserved"]:
            total_qty_picked += f.get("quantity", 0)

    # Pickups by location
    grid_data = await get_grid_stats()
    top_locations = sorted(
        grid_data.items(),
        key=lambda x: x[1]["pickups"],
        reverse=True
    )[:10]

    pickups_by_location = [
        {
            "lat": v["lat"],
            "lng": v["lng"],
            "donations": v["donations"],
            "pickups": v["pickups"],
            "pickup_ratio": round(v["pickups"] / max(v["donations"], 1), 2),
        }
        for _, v in top_locations
    ]

    # Peak donation hours
    peak_hours = sorted(donations_by_hour.items(), key=lambda x: x[1], reverse=True)[:5]
    peak_hours_formatted = [{"hour": h, "label": f"{h:02d}:00", "count": c} for h, c in peak_hours]

    # High demand locations
    high_demand_locations = [
        {"lat": v["lat"], "lng": v["lng"], "donations": v["donations"], "pickups": v["pickups"]}
        for _, v in top_locations
        if v["pickups"] / max(v["donations"], 1) > 0.5
    ]

    # Waste reduced %
    waste_reduced = round((total_qty_picked / max(total_qty_donated, 1)) * 100, 1)

    # Donations timeline (sorted)
    timeline = sorted(donations_by_date.items())
    donations_timeline = [{"date": d, "count": c} for d, c in timeline]

    # Request status breakdown
    status_counts = {}
    for r in all_requests:
        s = r.get("status", "unknown")
        status_counts[s] = status_counts.get(s, 0) + 1

    return {
        "waste_reduced_pct": waste_reduced,
        "total_qty_donated": total_qty_donated,
        "total_qty_picked": total_qty_picked,
        "donations_timeline": donations_timeline,
        "pickups_by_location": pickups_by_location,
        "peak_hours": peak_hours_formatted,
        "high_demand_locations": high_demand_locations,
        "request_status_breakdown": status_counts,
        "insights": {
            "peak_donation_hour": peak_hours_formatted[0]["label"] if peak_hours_formatted else "N/A",
            "high_demand_count": len(high_demand_locations),
            "avg_pickup_ratio": round(
                np.mean([v["pickups"] / max(v["donations"], 1) for _, v in top_locations]) * 100, 1
            ) if top_locations else 0,
        },
    }
