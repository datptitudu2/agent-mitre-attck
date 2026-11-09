"""Middleware bảo mật, rate-limit nhẹ và chuẩn hoá phản hồi lỗi JSON cho FastAPI."""

from collections import defaultdict, deque
import logging
import time
from typing import Callable, Deque, Dict

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("attack_lab.api")


class SlidingWindowRateLimiter:
    """Giới hạn tần suất gọi API nhẹ theo IP trong phạm vi instance hiện hành."""

    def __init__(self, max_requests_per_minute: int = 120) -> None:
        self.max_requests = max(10, max_requests_per_minute)
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)

    def allow(self, client_key: str) -> bool:
        now = time.monotonic()
        window_start = now - 60.0
        bucket = self._hits[client_key]
        while bucket and bucket[0] < window_start:
            bucket.popleft()
        if len(bucket) >= self.max_requests:
            return False
        bucket.append(now)
        return True


def register_middlewares_and_handlers(
    app: FastAPI, max_requests_per_minute: int = 120
) -> None:
    limiter = SlidingWindowRateLimiter(max_requests_per_minute)

    @app.middleware("http")
    async def security_and_rate_limit_middleware(
        request: Request, call_next: Callable
    ):
        client_ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or (request.client.host if request.client else "unknown")
        )
        if request.url.path != "/api/health" and not limiter.allow(client_ip):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": {
                        "code": "RATE_LIMITED",
                        "message": "Bạn gửi quá nhiều yêu cầu trong 1 phút. Vui lòng thử lại sau giây lát.",
                    }
                },
                headers={
                    "X-Robots-Tag": "noindex, nofollow, noarchive",
                    "Cache-Control": "no-store",
                },
            )

        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)

        response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Response-Time-Ms"] = str(elapsed_ms)

        # Chính sách Cache CDN cho Vercel Hobby: cache các endpoint GET đọc dữ liệu ATT&CK theo Authorization,
        # đồng thời cấm cache các route thông tin cá nhân/quản trị hoặc phản hồi lỗi.
        path = request.url.path
        if "cache-control" not in response.headers:
            is_sensitive_path = (
                path == "/api/me"
                or path.startswith("/api/admin")
                or request.query_params.get("check_remote") == "true"
            )
            if request.method == "GET" and response.status_code == 200 and not is_sensitive_path and path != "/api/health":
                response.headers["Cache-Control"] = "public, max-age=300, s-maxage=1800, stale-while-revalidate=86400"
                response.headers["Vary"] = "Authorization"
            elif response.status_code >= 400 or is_sensitive_path:
                response.headers["Cache-Control"] = "no-store"

        logger.info(
            "api_request method=%s path=%s status=%s duration_ms=%s ip=%s",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
            client_ip,
        )
        return response

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": f"HTTP_{exc.status_code}",
                    "message": str(exc.detail),
                }
            },
            headers={"X-Robots-Tag": "noindex, nofollow, noarchive"},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, exc: RequestValidationError
    ):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Tham số đầu vào không hợp lệ.",
                    "details": exc.errors(),
                }
            },
            headers={"X-Robots-Tag": "noindex, nofollow, noarchive"},
        )
