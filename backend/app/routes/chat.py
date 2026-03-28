import json
import re
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.middleware.auth import get_current_user
from app.config import get_settings
from app.database import food_collection, requests_collection
from app.ml.demand_predictor import get_analytics_insights, predict_demand_for_donation

router = APIRouter(prefix="/chat", tags=["AI Chatbot"])

settings = get_settings()

SYSTEM_PROMPT = """You are FoodLink AI Assistant, an intelligent chatbot for a food donation platform.

You MUST detect the user's intent and respond with a JSON object. Always respond ONLY with valid JSON.

Possible intents:
1. "add_food" - User wants to add/donate food. Extract: food_name, quantity, expiry_hours, lat, lng, address
2. "view_food" - User wants to see their donations or available food
3. "predict_demand" - User asks about demand prediction for an area/donation
4. "request_pickup" - NGO wants to request a food pickup
5. "get_recommendations" - NGO wants smart recommendations for best pickup
6. "get_analytics" - Admin asks for analytics, stats, insights
7. "general" - General questions about the platform

Response format:
{
  "intent": "one_of_above",
  "reply": "friendly response message",
  "data": {extracted data if any}
}

For add_food, extract as much as possible:
{"intent": "add_food", "reply": "...", "data": {"food_name": "...", "quantity": 10, "expiry_hours": 2, "address": "..."}}

For general questions, just provide a helpful reply:
{"intent": "general", "reply": "helpful message", "data": {}}

User's role: {role}
Always be friendly, concise, and action-oriented."""


class ChatRequest(BaseModel):
    message: str
    role: Optional[str] = "restaurant"


class ChatResponse(BaseModel):
    reply: str
    action: Optional[str] = None
    data: Optional[dict] = None
    intent: Optional[str] = None


async def call_groq(message: str, role: str) -> dict:
    """Call Groq API via LangChain for intent detection."""
    api_key = settings.GROQ_API_KEY
    if not api_key:
        return fallback_intent(message, role)

    try:
        from langchain_groq import ChatGroq
        from langchain_core.messages import SystemMessage, HumanMessage

        llm = ChatGroq(
            model="llama3-8b-8192",
            api_key=api_key,
            temperature=0.3,
            max_tokens=500,
        )

        response = llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT.replace("{role}", role)),
            HumanMessage(content=message),
        ])

        text = response.content.strip()

        # Extract JSON from response
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return {"intent": "general", "reply": text, "data": {}}

    except Exception:
        # Fallback: simple keyword-based intent detection
        return fallback_intent(message, role)


def fallback_intent(message: str, role: str) -> dict:
    """Simple keyword-based fallback when Groq API is unavailable."""
    msg = message.lower()

    if any(w in msg for w in ["add", "donate", "post", "share", "plates", "servings"]):
        # Try to extract quantity
        nums = re.findall(r'\d+', message)
        quantity = int(nums[0]) if nums else 10

        # Try to extract food name
        food_words = message.split()
        food_name = "Food Donation"
        for i, w in enumerate(food_words):
            if w.lower() in ["plates", "servings", "kg", "portions"]:
                food_name = " ".join(food_words[max(0, i-3):i])
                break

        return {
            "intent": "add_food",
            "reply": f"I'll help you add a donation of {quantity} servings of {food_name}. Please confirm the details in the form.",
            "data": {"food_name": food_name or "Food Donation", "quantity": quantity, "expiry_hours": 4}
        }

    elif any(w in msg for w in ["analytics", "stats", "statistics", "insights", "report"]):
        return {"intent": "get_analytics", "reply": "Fetching platform analytics for you...", "data": {}}

    elif any(w in msg for w in ["recommend", "best pickup", "suggestion", "what should", "best option"]):
        return {"intent": "get_recommendations", "reply": "Finding the best pickup options for you...", "data": {}}

    elif any(w in msg for w in ["pickup", "request", "collect", "pick up"]):
        return {"intent": "request_pickup", "reply": "Let me find available donations for pickup...", "data": {}}

    elif any(w in msg for w in ["demand", "predict", "forecast", "high demand", "prediction"]):
        return {"intent": "predict_demand", "reply": "Analyzing demand patterns...", "data": {}}

    elif any(w in msg for w in ["my food", "my donation", "view", "show", "list", "see"]):
        return {"intent": "view_food", "reply": "Here are the available donations...", "data": {}}

    else:
        return {
            "intent": "general",
            "reply": "I'm FoodLink AI Assistant! I can help you:\n"
                     "🍽️ **Restaurants**: Add food donations, predict demand\n"
                     "🤝 **NGOs**: Find best pickups, get recommendations\n"
                     "📊 **Admins**: View analytics and insights\n\n"
                     "Try: 'Add 50 plates biryani' or 'Show best pickup' or 'Show analytics'",
            "data": {}
        }


async def execute_intent(intent_data: dict, user: dict) -> dict:
    """Execute the detected intent by calling actual platform APIs."""
    intent = intent_data.get("intent", "general")
    data = intent_data.get("data", {})
    reply = intent_data.get("reply", "")

    try:
        if intent == "get_analytics":
            analytics = await get_analytics_insights()
            reply = (
                f"📊 **Platform Analytics**\n\n"
                f"🗑️ Waste Reduced: **{analytics.get('waste_reduced_pct', 0)}%**\n"
                f"📦 Total Qty Donated: **{analytics.get('total_qty_donated', 0)}** servings\n"
                f"🚚 Total Picked Up: **{analytics.get('total_qty_picked', 0)}** servings\n"
                f"🕐 Peak Hour: **{analytics.get('insights', {}).get('peak_donation_hour', 'N/A')}**\n"
                f"🔥 High Demand Zones: **{analytics.get('insights', {}).get('high_demand_count', 0)}**\n"
                f"📈 Avg Pickup Rate: **{analytics.get('insights', {}).get('avg_pickup_ratio', 0)}%**"
            )
            return {"reply": reply, "action": "show_analytics", "data": analytics, "intent": intent}

        elif intent == "view_food":
            if user["role"] == "restaurant":
                cursor = food_collection.find({"donor_id": user["id"]}).sort("created_at", -1)
            else:
                cursor = food_collection.find({"status": "available"}).sort("created_at", -1)
            foods = await cursor.to_list(length=10)

            food_list = []
            for f in foods:
                food_list.append({
                    "id": str(f["_id"]),
                    "food_name": f["food_name"],
                    "quantity": f["quantity"],
                    "status": f["status"],
                })

            if food_list:
                items = "\n".join([f"• **{f['food_name']}** — {f['quantity']} servings ({f['status']})" for f in food_list])
                reply = f"📦 **{'Your' if user['role'] == 'restaurant' else 'Available'} Donations:**\n\n{items}"
            else:
                reply = "No donations found yet."

            return {"reply": reply, "action": "view_food", "data": {"foods": food_list}, "intent": intent}

        elif intent == "predict_demand":
            lat = data.get("lat", 17.385)
            lng = data.get("lng", 78.4867)
            demand = await predict_demand_for_donation(
                quantity=data.get("quantity", 50),
                expiry_time=datetime.now(timezone.utc) + timedelta(hours=data.get("expiry_hours", 4)),
                lat=lat, lng=lng
            )
            reply = (
                f"🤖 **Demand Prediction**\n\n"
                f"Score: **{demand['score']}/100**\n"
                f"Level: **{demand['level']}**\n\n"
                f"{'🔥 High demand! Your food will be picked up quickly.' if demand['level'] == 'High' else '📊 Moderate demand in this area.' if demand['level'] == 'Medium' else '💡 Consider donating during peak hours (11AM-2PM or 6-9PM).'}"
            )
            return {"reply": reply, "action": "predict_demand", "data": demand, "intent": intent}

        elif intent == "add_food":
            reply = (
                f"✅ I've pre-filled the donation form for you:\n\n"
                f"🍽️ **{data.get('food_name', 'Food')}** — {data.get('quantity', 10)} servings\n"
                f"⏰ Expiry: {data.get('expiry_hours', 4)} hours\n\n"
                f"Please review and submit from the donation form."
            )
            return {"reply": reply, "action": "prefill_food", "data": data, "intent": intent}

        elif intent == "get_recommendations":
            reply = "🤖 Switching to **Smart Recommendations** view. The AI has ranked donations by urgency, distance, and quantity for you."
            return {"reply": reply, "action": "show_recommendations", "data": {}, "intent": intent}

        elif intent == "request_pickup":
            reply = "📋 Showing available donations for pickup. Click **Request Pickup** on any food card to proceed."
            return {"reply": reply, "action": "show_food", "data": {}, "intent": intent}

    except Exception as e:
        pass

    return {"reply": reply, "action": None, "data": data, "intent": intent}


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest, user=Depends(get_current_user)):
    """AI chatbot with intent detection and action execution."""
    intent_data = await call_groq(req.message, req.role or user["role"])
    result = await execute_intent(intent_data, user)
    return ChatResponse(**result)
