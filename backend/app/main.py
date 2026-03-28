from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, food, requests, admin
from app.routes import predict, recommendations, chat

app = FastAPI(
    title="FoodLink AI",
    description="Smart Food Donation Platform — AI + Data Science Powered",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(food.router)
app.include_router(requests.router)
app.include_router(admin.router)
app.include_router(predict.router)
app.include_router(recommendations.router)
app.include_router(chat.router)


@app.get("/")
async def root():
    return {"message": "FoodLink AI API is running", "version": "3.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
