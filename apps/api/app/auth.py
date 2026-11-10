"""Xác thực JWT của Supabase (ưu tiên JWKS bất đối xứng ES256/RS256 + fallback HS256) và kiểm tra Allowlist."""

from functools import lru_cache
import hmac
from typing import Any, Dict, Optional

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWKClient
from pydantic import BaseModel

from apps.api.app.config import Settings, get_settings
from apps.api.app.db import SupabaseNotConfiguredError, SupabaseRestClient, get_db_client

ASYMMETRIC_ALGS = {"ES256", "RS256", "EdDSA"}
bearer_scheme = HTTPBearer(auto_error=False)


class AuthenticatedUser(BaseModel):
    """Thông tin người dùng đã xác thực hợp lệ và nằm trong allowlist."""

    id: str
    email: str
    role: str = "member"
    display_name: str = ""


@lru_cache(maxsize=4)
def _get_jwks_client(jwks_url: str) -> PyJWKClient:
    """Khởi tạo PyJWKClient có cache key tự động theo kid."""
    return PyJWKClient(jwks_url, cache_keys=True, lifespan=3600)


def verify_supabase_jwt(token: str, settings: Settings) -> Dict[str, Any]:
    """Xác thực chữ ký & claims của Supabase JWT bằng JWKS (hoặc HS256 legacy nếu cấu hình)."""
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token đăng nhập không đúng định dạng JWT.",
        ) from exc

    alg = header.get("alg", "")
    base_url = settings.supabase_url.rstrip("/")
    expected_issuer = f"{base_url}/auth/v1" if base_url else None

    try:
        if alg in ASYMMETRIC_ALGS:
            if not base_url:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Backend chưa được cấu hình SUPABASE_URL để kiểm tra JWKS.",
                )
            jwks_url = f"{expected_issuer}/.well-known/jwks.json"
            signing_key = _get_jwks_client(jwks_url).get_signing_key_from_jwt(token)
            decode_kwargs: Dict[str, Any] = {
                "algorithms": list(ASYMMETRIC_ALGS),
                "audience": "authenticated",
            }
            if expected_issuer:
                decode_kwargs["issuer"] = expected_issuer
            payload = jwt.decode(token, signing_key.key, **decode_kwargs)
        elif alg == "HS256" and settings.supabase_jwt_secret.strip():
            decode_kwargs = {
                "algorithms": ["HS256"],
                "audience": "authenticated",
            }
            if expected_issuer and "your-project-ref" not in expected_issuer:
                decode_kwargs["issuer"] = expected_issuer
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret.strip(),
                **decode_kwargs,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Thuật toán ký token '{alg}' không được hỗ trợ hoặc thiếu cấu hình xác thực.",
            )
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        ) from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không thể xác thực chữ ký phiên đăng nhập.",
        ) from exc

    sub = str(payload.get("sub") or "").strip()
    email = str(payload.get("email") or "").strip().lower()
    if not sub or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token thiếu định danh người dùng (sub/email).",
        )
    return payload


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
    db: SupabaseRestClient = Depends(get_db_client),
) -> AuthenticatedUser:
    """Dependency kiểm tra người dùng đã đăng nhập VÀ còn nằm trong bảng allowed_emails."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu đăng nhập để truy cập dữ liệu ATT&CK Lab.",
        )

    payload = verify_supabase_jwt(credentials.credentials, settings)
    user_id = str(payload["sub"])
    email = str(payload["email"]).strip().lower()

    # Kiểm tra đối chiếu trực tiếp với allowed_emails để thu hồi quyền tức thì khi xoá email
    try:
        allowed_rows = await db.select(
            "allowed_emails",
            params={"email": f"eq.{email}", "select": "email,role"},
            limit=1,
        )
    except SupabaseNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    if not allowed_rows:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản không nằm trong danh sách được phép truy cập (allowlist).",
        )

    role = allowed_rows[0].get("role", "member")
    display_name = (
        (payload.get("user_metadata") or {}).get("display_name")
        or email.split("@")[0]
    )

    return AuthenticatedUser(
        id=user_id,
        email=email,
        role=role,
        display_name=display_name,
    )


async def require_admin(
    x_sync_secret: Optional[str] = Header(default=None, alias="X-Sync-Secret"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
    db: SupabaseRestClient = Depends(get_db_client),
) -> AuthenticatedUser:
    """Cho phép Admin đã đăng nhập HOẶC secret token quản trị nội bộ (cho CLI/Workflow)."""
    configured_secret = settings.sync_admin_secret.strip()
    if configured_secret and x_sync_secret and hmac.compare_digest(
        x_sync_secret.strip(), configured_secret
    ):
        return AuthenticatedUser(
            id="system-admin",
            email="system@attacklab.internal",
            role="admin",
            display_name="System Admin Token",
        )

    user = await get_current_user(credentials=credentials, settings=settings, db=db)
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ quản trị viên (role=admin) mới được thực hiện thao tác này.",
        )
    return user

