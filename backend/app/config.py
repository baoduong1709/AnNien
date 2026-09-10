import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "AnNien Backend Gateway"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = int(os.getenv("PORT", "8080"))

    # Google Cloud & Gemini Settings
    # Target region for Cloud Run: asia-southeast1 (Singapore)
    GCP_PROJECT_ID: Optional[str] = os.getenv("GCP_PROJECT_ID", "annien-care")
    GCP_LOCATION: str = os.getenv("GCP_LOCATION", "asia-southeast1")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # AI Models (Google latest models per requirements)
    # Gemini Multimodal Live API model (BidiGenerateContent)
    GEMINI_LIVE_MODEL: str = os.getenv("GEMINI_LIVE_MODEL", "gemini-3.1-flash-live-preview")
    # Fallback live model
    GEMINI_LIVE_MODEL_FALLBACK: str = os.getenv("GEMINI_LIVE_MODEL_FALLBACK", "gemini-2.5-flash-native-audio-preview-12-2025")
    # Memory extraction & diary analysis model (Optimal balance of intelligence and cost)
    GEMINI_FLASH_MODEL: str = os.getenv("GEMINI_FLASH_MODEL", "gemini-2.0-flash")
    # Semantic search embedding model
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-005")

    # Live API Voice configuration
    # Options: Aoede, Puck, Charon, Fenrir, Kore. Aoede & Puck are warm and articulate for elders
    LIVE_VOICE_NAME: str = os.getenv("LIVE_VOICE_NAME", "Aoede")

    # Audio Parameters
    INPUT_SAMPLE_RATE: int = 16000  # 16kHz PCM input from client microphone
    OUTPUT_SAMPLE_RATE: int = 24000 # 24kHz PCM output from Gemini Live
    AUDIO_CHANNELS: int = 1         # Mono
    AUDIO_SAMPLE_WIDTH: int = 2     # 16-bit linear PCM (2 bytes per sample)

    # Google Cloud TTS configuration (for deterministic medical & emergency alerts)
    TTS_LANGUAGE_CODE: str = "vi-VN"
    TTS_VOICE_NAME: str = "vi-VN-Wavenet-A" # Warm Vietnamese female voice

    # Cloud Firestore Collections
    FIRESTORE_DATABASE: str = "(default)"
    COLLECTION_MEMORIES: str = "elder_memories"
    COLLECTION_MEDICATIONS: str = "elder_medications"
    COLLECTION_MOODS: str = "elder_moods"
    COLLECTION_SOS_LOGS: str = "elder_sos_logs"

    # Emergency Contact Configuration
    EMERGENCY_CONTACT_PHONE: str = os.getenv("EMERGENCY_CONTACT_PHONE", "115")
    PRIMARY_CAREGIVER_NAME: str = os.getenv("PRIMARY_CAREGIVER_NAME", "Người thân")
    PRIMARY_CAREGIVER_PHONE: str = os.getenv("PRIMARY_CAREGIVER_PHONE", "0900000000")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


settings = Settings()
