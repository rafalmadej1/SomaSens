from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "gemma4"
    ollama_timeout_seconds: float = Field(default=120, gt=0)
    jwt_secret_key: str = Field(min_length=32)
    jwt_issuer: str = "somasense-api"
    jwt_audience: str = "somasense-client"
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
