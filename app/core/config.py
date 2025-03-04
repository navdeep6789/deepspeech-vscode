from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    APP_NAME: str = "Speech-to-Text Service"
    DEBUG: bool = False
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    SUPPORTED_AUDIO_FORMATS: list = ["wav", "mp3", "ogg", "flac"]
    UPLOAD_DIR: str = "uploads"

    class Config:
        env_file = ".env"

settings = Settings()