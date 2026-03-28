import os
from functools import lru_cache

class Settings:
    def __init__(self):
        self.MONGODB_URL = os.getenv("MONGODB_URL")
        self.JWT_SECRET = os.getenv("JWT_SECRET")
        self.JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
        self.JWT_EXPIRY_MINUTES = int(os.getenv("JWT_EXPIRY_MINUTES", 1440))
        self.GROQ_API_KEY = os.getenv("GROQ_API_KEY")

@lru_cache()
def get_settings():
    return Settings()