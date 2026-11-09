"""Lớp truy cập dữ liệu Supabase linh hoạt (ưu tiên Postgres Pooler DATABASE_URL qua psycopg, hỗ trợ fallback PostgREST)."""

import asyncio
from contextlib import contextmanager
import threading
from typing import Any, Dict, Iterator, List, Optional

import httpx
import psycopg
from psycopg.rows import dict_row

from apps.api.app.config import Settings, get_settings

_CONN_LOCK = threading.Lock()
_SHARED_CONN: Optional[psycopg.Connection] = None


class SupabaseNotConfiguredError(RuntimeError):
    """Ném ra khi chưa cấu hình DATABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY."""


class SupabaseDataClient:
    """Client thống nhất cho cả FastAPI (đọc nhẹ) và Sync CLI (batch upsert)."""

    def __init__(self, settings: Optional[Settings] = None) -> None:
        self.settings = settings or get_settings()

    def _ensure_configured(self) -> None:
        if not self.settings.is_supabase_configured:
            raise SupabaseNotConfiguredError(
                "Chưa cấu hình DATABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local."
            )

    def get_pg_conn(self, autocommit: bool = True) -> psycopg.Connection:
        """Mở kết nối Postgres mới (dùng cho giao dịch batch lớn của Sync CLI)."""
        if not self.settings.has_database_url:
            raise SupabaseNotConfiguredError("Chưa cấu hình DATABASE_URL.")
        return psycopg.connect(
            self.settings.database_url.strip(),
            autocommit=autocommit,
            row_factory=dict_row,
            connect_timeout=10,
            prepare_threshold=None,
        )

    @contextmanager
    def _reusable_read_conn(self) -> Iterator[psycopg.Connection]:
        """Tái sử dụng kết nối đọc đang mở để tránh bắt tay TLS lặp lại trên mỗi truy vấn nhỏ."""
        global _SHARED_CONN
        if not self.settings.has_database_url:
            raise SupabaseNotConfiguredError("Chưa cấu hình DATABASE_URL.")

        with _CONN_LOCK:
            if _SHARED_CONN is None or _SHARED_CONN.closed or _SHARED_CONN.broken:
                _SHARED_CONN = self.get_pg_conn(autocommit=True)
            try:
                yield _SHARED_CONN
            except psycopg.OperationalError:
                # Nếu kết nối nhàn rỗi bị đóng bởi Pooler, tự mở lại tức thì
                try:
                    _SHARED_CONN.close()
                except Exception:
                    pass
                _SHARED_CONN = self.get_pg_conn(autocommit=True)
                yield _SHARED_CONN

    async def fetch_all_sql(
        self, query: str, params: tuple[Any, ...] = ()
    ) -> List[Dict[str, Any]]:
        """Thực thi câu lệnh SQL SELECT trên thread pool, tự phục hồi nếu Pooler đóng kết nối cũ."""

        def _run() -> List[Dict[str, Any]]:
            global _SHARED_CONN
            for attempt in range(2):
                try:
                    with self._reusable_read_conn() as conn:
                        with conn.cursor() as cur:
                            cur.execute(query, params)
                            return list(cur.fetchall())
                except psycopg.OperationalError:
                    with _CONN_LOCK:
                        _SHARED_CONN = None
                    if attempt == 1:
                        raise
            return []

        return await asyncio.to_thread(_run)

    async def fetch_one_sql(
        self, query: str, params: tuple[Any, ...] = ()
    ) -> Optional[Dict[str, Any]]:
        rows = await self.fetch_all_sql(query, params)
        return rows[0] if rows else None

    async def execute_sql(self, query: str, params: tuple[Any, ...] = ()) -> None:
        def _run() -> None:
            with self._reusable_read_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, params)

        await asyncio.to_thread(_run)

    # --- Giao diện tương thích cho Auth Allowlist & Fallback PostgREST ---
    @property
    def rest_base_url(self) -> str:
        return f"{self.settings.supabase_url.rstrip('/')}/rest/v1"

    def _rest_headers(self, extra: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        key = self.settings.supabase_service_role_key.strip()
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }
        if extra:
            headers.update(extra)
        return headers

    async def select(
        self,
        table: str,
        params: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        self._ensure_configured()
        params = params or {}

        # Ưu tiên truy vấn SQL trực tiếp khi có DATABASE_URL
        if self.settings.has_database_url and table == "allowed_emails":
            email_filter = str(params.get("email") or "")
            if email_filter.startswith("eq."):
                target_email = email_filter[3:].strip().lower()
                return await self.fetch_all_sql(
                    "select email, role, note, added_at from public.allowed_emails where email = %s limit 1",
                    (target_email,),
                )
            return await self.fetch_all_sql(
                "select email, role, note, added_at from public.allowed_emails order by added_at desc"
            )

        if not self.settings.has_service_role_key:
            raise SupabaseNotConfiguredError(
                f"Truy vấn REST bảng {table} cần SUPABASE_SERVICE_ROLE_KEY hoặc viết qua fetch_all_sql."
            )

        headers = self._rest_headers()
        if limit is not None:
            headers["Range-Unit"] = "items"
            headers["Range"] = f"0-{max(limit - 1, 0)}"
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(
                f"{self.rest_base_url}/{table}",
                params=params,
                headers=headers,
            )
            resp.raise_for_status()
            return resp.json()


# Giữ bí danh tên cũ để toàn bộ test & module tương thích hoàn toàn
SupabaseRestClient = SupabaseDataClient


def get_db_client() -> SupabaseDataClient:
    return SupabaseDataClient(get_settings())
