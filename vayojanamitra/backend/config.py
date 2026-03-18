import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Explicitly load .env file
load_dotenv()

class Settings(BaseSettings):
    # Database Configuration
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DB_NAME", "vayojanamitra")
    
    # AI Configuration
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    DEFAULT_AI_MODEL: str = os.getenv("DEFAULT_AI_MODEL", "deepseek/deepseek-chat")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "embedding-001")
    
    # JWT Configuration
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-this-secret-key-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 7 * 24 * 60  # 7 days
    
    # ChromaDB Configuration
    CHROMA_PATH: str = os.getenv("CHROMA_PATH", "./chroma_db")
    
    # CORS Configuration
    FRONTEND_URLS: str = os.getenv("FRONTEND_URLS", "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177")
    
    # Business Logic Configuration
    BPL_THRESHOLD: int = int(os.getenv("BPL_THRESHOLD", "100000"))
    MIDDLE_INCOME_THRESHOLD: int = int(os.getenv("MIDDLE_INCOME_THRESHOLD", "300000"))
    
    # Text Processing Configuration
    MAX_TEXT_LENGTH: int = int(os.getenv("MAX_TEXT_LENGTH", "8000"))
    MIN_TEXT_LENGTH: int = int(os.getenv("MIN_TEXT_LENGTH", "100"))

    @property
    def frontend_origins(self) -> list:
        """Parse frontend URLs into a list for CORS."""
        return [url.strip() for url in self.FRONTEND_URLS.split(",") if url.strip()]

settings = Settings()
