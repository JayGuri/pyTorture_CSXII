"""
Supabase client wrapper using httpx for PostgREST API calls.
This avoids the schema-cache issue in supabase-py 2.x while
keeping the same API surface used throughout the codebase.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx

from src.config.env import env


class _QueryBuilder:
    """Minimal PostgREST query builder that mirrors supabase-py's API."""

    def __init__(self, url: str, headers: Dict[str, str], table: str):
        self._url = f"{url}/rest/v1/{table}"
        self._headers = {**headers}
        self._params: Dict[str, str] = {}
        self._body: Any = None
        self._method = "GET"
        self._count_mode: Optional[str] = None
        self._single = False

    # ─── SELECT chain ─────────────────────────────────────
    def select(self, columns: str = "*", *, count: Optional[str] = None) -> "_QueryBuilder":
        self._params["select"] = columns
        if count:
            self._count_mode = count
            self._headers["Prefer"] = f"count={count}"
        return self

    # ─── FILTERS ──────────────────────────────────────────
    def eq(self, column: str, value: Any) -> "_QueryBuilder":
        self._params[column] = f"eq.{value}"
        return self

    def gt(self, column: str, value: Any) -> "_QueryBuilder":
        self._params[column] = f"gt.{value}"
        return self

    def gte(self, column: str, value: Any) -> "_QueryBuilder":
        self._params[column] = f"gte.{value}"
        return self

    def ilike(self, column: str, pattern: str) -> "_QueryBuilder":
        self._params[column] = f"ilike.{pattern}"
        return self

    # ─── MODIFIERS ────────────────────────────────────────
    def order(self, column: str, *, desc: bool = False) -> "_QueryBuilder":
        direction = "desc" if desc else "asc"
        self._params["order"] = f"{column}.{direction}"
        return self

    def limit(self, count: int) -> "_QueryBuilder":
        self._params["limit"] = str(count)
        return self

    def range(self, start: int, end: int) -> "_QueryBuilder":
        self._headers["Range"] = f"{start}-{end}"
        self._headers["Range-Unit"] = "items"
        return self

    def single(self) -> "_QueryBuilder":
        self._single = True
        self._headers["Accept"] = "application/vnd.pgrst.object+json"
        return self

    # ─── MUTATIONS ────────────────────────────────────────
    def insert(self, data: Any) -> "_QueryBuilder":
        self._method = "POST"
        self._body = data
        self._headers["Prefer"] = "return=representation"
        return self

    def upsert(self, data: Any, *, on_conflict: str = "") -> "_QueryBuilder":
        self._method = "POST"
        self._body = data
        prefer = "return=representation,resolution=merge-duplicates"
        self._headers["Prefer"] = prefer
        if on_conflict:
            self._params["on_conflict"] = on_conflict
        return self

    def update(self, data: Any) -> "_QueryBuilder":
        self._method = "PATCH"
        self._body = data
        self._headers["Prefer"] = "return=representation"
        return self

    def delete(self) -> "_QueryBuilder":
        self._method = "DELETE"
        self._headers["Prefer"] = "return=representation"
        return self

    # ─── EXECUTE ──────────────────────────────────────────
    def execute(self) -> "_QueryResult":
        with httpx.Client(timeout=15) as client:
            if self._method in ("POST", "PATCH"):
                r = client.request(
                    self._method,
                    self._url,
                    headers={**self._headers, "Content-Type": "application/json"},
                    params=self._params,
                    json=self._body,
                )
            elif self._method == "DELETE":
                r = client.request(
                    self._method,
                    self._url,
                    headers=self._headers,
                    params=self._params,
                )
            else:
                r = client.request(
                    self._method,
                    self._url,
                    headers=self._headers,
                    params=self._params,
                )

            # Don't crash on PGRST schema-cache errors (404) — return empty data
            if r.status_code == 404:
                return _QueryResult(data=[] if not self._single else None, count=0)

            if r.status_code == 400:
                try:
                    detail = r.json()
                except ValueError:
                    detail = r.text
                raise ValueError(
                    "PostgREST 400 Bad Request | "
                    f"method={self._method} url={self._url} params={self._params} detail={detail}"
                )

            r.raise_for_status()

            data = r.json() if r.text else []
            if self._single and isinstance(data, list):
                data = data[0] if data else None

            # Parse count from Content-Range header
            count = None
            if self._count_mode:
                content_range = r.headers.get("Content-Range", "")
                if "/" in content_range:
                    total = content_range.split("/")[-1]
                    if total != "*":
                        count = int(total)

            return _QueryResult(data=data if not self._single else data, count=count)


class _RPCBuilder:
    """Execute Supabase RPC functions."""

    def __init__(self, url: str, headers: Dict[str, str], fn_name: str, params: Dict[str, Any]):
        self._url = f"{url}/rest/v1/rpc/{fn_name}"
        self._headers = headers
        self._params = params

    def execute(self) -> "_QueryResult":
        with httpx.Client(timeout=15) as client:
            r = client.post(
                self._url,
                headers={**self._headers, "Content-Type": "application/json"},
                json=self._params,
            )
            if r.status_code == 404:
                return _QueryResult(data=[], count=None)
            r.raise_for_status()
            data = r.json() if r.text else []
            return _QueryResult(data=data, count=None)


class _QueryResult:
    def __init__(self, data: Any, count: Optional[int]):
        self.data = data
        self.count = count


class SupabaseClient:
    """Lightweight Supabase client using httpx directly."""

    def __init__(self, url: str, key: str):
        self.url = url.rstrip("/")
        self.key = key
        self._headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
        }

    def table(self, name: str) -> _QueryBuilder:
        return _QueryBuilder(self.url, self._headers, name)

    def from_(self, name: str) -> _QueryBuilder:
        return self.table(name)

    def rpc(self, fn_name: str, params: Dict[str, Any]) -> _RPCBuilder:
        return _RPCBuilder(self.url, self._headers, fn_name, params)


# ─── Singleton ────────────────────────────────────────────
supabase = SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
