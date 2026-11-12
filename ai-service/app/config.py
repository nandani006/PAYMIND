from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "ai-service/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    port: int = 8000
    host: str = "0.0.0.0"

    llm_provider: str = "gemini"

    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-1.5-flash"

    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o-mini"

    backend_api_key: Optional[str] = None

    llm_timeout_seconds: int = 15


settings = Settings()
