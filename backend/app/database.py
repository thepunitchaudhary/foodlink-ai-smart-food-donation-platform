from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings


class Database:
    client: AsyncIOMotorClient = None
    _db = None

    @classmethod
    def get_db(cls):
        if cls.client is None:
            settings = get_settings()
            cls.client = AsyncIOMotorClient(
                settings.MONGODB_URL,
                serverSelectionTimeoutMS=5000,
            )
            cls._db = cls.client.foodlink
        return cls._db


def get_db():
    return Database.get_db()


# Lazy collection accessors
class _LazyCollection:
    def __init__(self, name):
        self._name = name

    def __getattr__(self, item):
        return getattr(get_db()[self._name], item)


users_collection = _LazyCollection("users")
food_collection = _LazyCollection("food_donations")
requests_collection = _LazyCollection("pickup_requests")
