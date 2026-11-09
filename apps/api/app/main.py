"""Khởi tạo ứng dụng FastAPI chính của ATT&CK Lab."""

from datetime import datetime, timezone
import logging

from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apps.api.app.auth import AuthenticatedUser, get_current_user
from apps.api.app.config import Settings, get_settings
from apps.api.app.middleware import register_middlewares_and_handlers
from apps.api.app.routers import (
    cases_and_content,
    entities_and_diff,
    matrix_and_techniques,
    versions_and_sync,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)


def create_app(settings: Settings | None = None) -> FastAPI:
    cfg = settings or get_settings()

    application = FastAPI(
        title="ATT&CK Lab API",
        description="API nội bộ phục vụ trực quan hoá và học tập MITRE ATT&CK (Giáo dục phòng thủ).",
        version="0.2.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "If-None-Match", "X-Sync-Secret"],
        expose_headers=["ETag", "X-Response-Time-Ms"],
    )

    register_middlewares_and_handlers(application, cfg.rate_limit_per_minute)

    api_router = APIRouter(prefix="/api")

    @api_router.get("/health", tags=["System"])
    async def healthcheck(current_settings: Settings = Depends(get_settings)):
        return {
            "status": "ok",
            "service": "attack-lab-api",
            "supabase_configured": current_settings.is_supabase_configured,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    @api_router.get("/me", tags=["Auth"])
    async def read_current_user(user: AuthenticatedUser = Depends(get_current_user)):
        return {"user": user.model_dump()}

    api_router.include_router(versions_and_sync.router)
    api_router.include_router(matrix_and_techniques.router)
    api_router.include_router(entities_and_diff.router)
    api_router.include_router(cases_and_content.router)

    application.include_router(api_router)
    return application


app = create_app()
