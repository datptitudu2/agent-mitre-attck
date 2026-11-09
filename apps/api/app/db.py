"""Client nhẹ kết nối Supabase PostgREST bằng httpx (tối ưu dung lượng bundle trên Vercel)."""

from typing import Any, Dict, List, Optional

import httpx

from apps.api.app.config import Settings, get_settings


class SupabaseNotConfiguredError(RuntimeError):
    """Ném ra khi chưa cấu hình SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY trong .env.local."""


class SupabaseRestClient:
    """Wrapper gọn nhẹ gọi PostgREST / RPC của Supabase bằng Service Role ở phía Backend."""

    def __init__(self, settings: Optional[Settings] = None) -> None:
        self.settings = settings or get_settings()

    def _ensure_configured(self) -> None:
        if not self.settings.is_supabase_configured:
            raise SupabaseNotConfiguredError(
                "Chưa cấu hình SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong .env.local."
            )

    @property
    def rest_base_url(self) -> str:
        return f"{self.settings.supabase_url.rstrip('/')}/rest/v1"

    def _headers(self, extra: Optional[Dict[str, str]] = None) -> Dict[str, str]:
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
        headers = self._headers()
        if limit is not None:
            headers["Range-Unit"] = "items"
            headers["Range"] = f"0-{max(limit - 1, 0)}"
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(
                f"{self.rest_base_url}/{table}",
                params=params or {},
                headers=headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def upsert(
        self,
        table: str,
        rows: List[Dict[str, Any]] | Dict[str, Any],
        on_conflict: Optional[str] = None,
        return_representation: bool = False,
    ) -> List[Dict[str, Any]]:
        self._ensure_configured()
        prefer = [
            "resolution=merge-duplicates",
            "return=representation" if return_representation else "return=minimal",
        ]
        params: Dict[str, Any] = {}
        if on_conflict:
            params["on_conflict"] = on_conflict
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{self.rest_base_url}/{table}",
                params=params,
                json=rows,
                headers=self._headers({"Prefer": ",".join(prefer)}),
            )
            resp.raise_for_status()
            if return_representation and resp.content:
                return resp.json()
            return []

    async def delete(self, table: str, params: Dict[str, Any]) -> None:
        self._ensure_configured()
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.delete(
                f"{self.rest_base_url}/{table}",
                params=params,
                headers=self._headers({"Prefer": "return=minimal"}),
            )
            resp.raise_for_status()

    async def rpc(
        self, fn_name: str, payload: Optional[Dict[str, Any]] = None
    ) -> Any:
        self._ensure_configured()
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{self.rest_base_url}/rpc/{fn_name}",
                json=payload or {},
                headers=self._headers(),
            )
            resp.raise_for_status()
            if resp.content:
                return resp.json()
            return None


def get_db_client() -> SupabaseRestClient:
    return SupabaseRestClient(get_settings())
