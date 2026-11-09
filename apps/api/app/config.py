"""Cấu hình ứng dụng đọc từ biến môi trường / .env.local (an toàn, không chứa secret cứng)."""

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Tập hợp biến môi trường cho FastAPI và CLI đồng bộ dữ liệu."""

    model_config = SettingsConfigDict(
        env_file=(str(ROOT_DIR / ".env.local"), str(ROOT_DIR / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "ATT&CK Lab API"
    app_env: str = "development"

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    github_token_dispatch: str = ""
    github_repo: str = ""
    github_workflow_file: str = "sync.yml"
    github_workflow_ref: str = "main"

    sync_admin_secret: str = ""
    rate_limit_per_minute: int = 120

    @property
    def is_supabase_configured(self) -> bool:
        url = self.supabase_url.strip()
        key = self.supabase_service_role_key.strip()
        return bool(
            url
            and key
            and "your-project-ref" not in url
            and "your-supabase-service-role" not in key
        )

    @property
    def cors_origins(self) -> List[str]:
        return [
            origin.strip()
            for origin in self.allowed_origins.split(",")
            if origin.strip()
        ]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
