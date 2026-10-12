from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional

class Settings(BaseSettings):
    APP_NAME: str = "Adaptive Learning Platform"
    APP_ENV: str = "development"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: str | List[str] = ["http://localhost:5173"]
    
    DATABASE_URL: str
    TEST_DATABASE_URL: str
    
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: Optional[str] = None
    
    STORAGE_ROOT: str = "./storage"
    MAX_UPLOAD_SIZE_MB: int = 100
    FFMPEG_FRAME_INTERVAL_SECONDS: int = 60
    
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    EMBEDDING_BATCH_SIZE: int = 32
    
    QDRANT_HOST: str = "qdrant" # internal docker service name
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION_NAME: str = "resource_chunks"
    
    GEMINI_API_KEY: Optional[str] = None
    LLM_MODEL: str = "gemini-2.5-flash"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
