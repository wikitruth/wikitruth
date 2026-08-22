"""Dependency-free client for Wikitruth's governed agent API."""

from __future__ import annotations

import json
import time
import uuid
from typing import Any, Dict, Generator, Iterable, Optional
from urllib import error, parse, request


class AgentApiError(RuntimeError):
    def __init__(self, status: int, payload: Any, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.payload = payload


class WikitruthAgentClient:
    def __init__(self, base_url: str, token: str, retries: int = 3, timeout: float = 30.0) -> None:
        if not token.startswith("wt_agent_"):
            raise ValueError("A Wikitruth agent token is required")
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.retries = max(0, min(10, retries))
        self.timeout = timeout

    def _headers(self, run: Optional[Dict[str, Any]] = None, idempotency_key: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
            "Accept-Version": "1",
        }
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        if run:
            headers["X-Agent-Run-Id"] = str(run["runId"])
            for source, target in (("model", "X-Agent-Model"), ("provider", "X-Agent-Provider"), ("purpose", "X-Agent-Purpose")):
                if run.get(source):
                    headers[target] = str(run[source])
            if run.get("sourceManifest"):
                headers["X-Agent-Source-Manifest"] = json.dumps(run["sourceManifest"])
        return headers

    @staticmethod
    def _key() -> str:
        return f"sdk-{uuid.uuid4()}"

    def _call(
        self,
        path: str,
        method: str = "GET",
        body: Any = None,
        run: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
    ) -> Any:
        headers = self._headers(run, idempotency_key)
        data = None
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        replay_safe = method in ("GET", "HEAD") or bool(idempotency_key)
        for attempt in range(self.retries + 1):
            response = None
            try:
                response = request.urlopen(request.Request(self.base_url + path, data=data, headers=headers, method=method), timeout=self.timeout)
                return json.loads(response.read().decode("utf-8"))
            except error.HTTPError as exc:
                payload = self._error_payload(exc)
                if not replay_safe or exc.code not in (429, 502, 503, 504) or attempt == self.retries:
                    message = payload.get("error", {}).get("message") if isinstance(payload, dict) else None
                    raise AgentApiError(exc.code, payload, message or "Agent API request failed") from exc
                retry_after = float(exc.headers.get("Retry-After", "0") or 0)
                time.sleep(min(30.0, retry_after or 0.25 * (2 ** attempt)))
            except error.URLError:
                if not replay_safe or attempt == self.retries:
                    raise
                time.sleep(min(5.0, 0.25 * (2 ** attempt)))
        raise AgentApiError(0, None, "Agent API request failed")

    @staticmethod
    def _error_payload(exc: error.HTTPError) -> Any:
        try:
            return json.loads(exc.read().decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return None

    def identity(self) -> Any:
        return self._call("/agent/identity")

    def capabilities(self) -> Any:
        return self._call("/agent/capabilities")

    def validate(self, commands: Iterable[Dict[str, Any]]) -> Any:
        return self._call("/agent/validate", "POST", {"commands": list(commands)})

    def create_entry(self, entry_type: str, payload: Dict[str, Any], run: Dict[str, Any], idempotency_key: Optional[str] = None) -> Any:
        return self._call(f"/{entry_type}s", "POST", payload, run, idempotency_key or self._key())

    def propose_edit(self, entry_type: str, entry_id: str, base_revision_id: str, payload: Dict[str, Any], run: Dict[str, Any], idempotency_key: Optional[str] = None) -> Any:
        body = dict(payload, baseRevisionId=base_revision_id)
        return self._call(f"/{entry_type}s/entry/{parse.quote(entry_id)}", "PUT", body, run, idempotency_key or self._key())

    def create_job(self, commands: Iterable[Dict[str, Any]], run: Dict[str, Any], idempotency_key: Optional[str] = None) -> Any:
        return self._call("/agent/jobs", "POST", {"commands": list(commands)}, run, idempotency_key or self._key())

    def get_job(self, job_id: str) -> Any:
        return self._call(f"/agent/jobs/{parse.quote(job_id)}")

    def cancel_job(self, job_id: str, run: Dict[str, Any], idempotency_key: Optional[str] = None) -> Any:
        return self._call(f"/agent/jobs/{parse.quote(job_id)}/cancel", "POST", {}, run, idempotency_key or self._key())

    def list_jobs(self, cursor: Optional[str] = None, limit: int = 25) -> Any:
        query = {"limit": str(limit)}
        if cursor:
            query["cursor"] = cursor
        return self._call("/agent/jobs?" + parse.urlencode(query))

    def iterate_jobs(self, limit: int = 25) -> Generator[Dict[str, Any], None, None]:
        cursor = None
        while True:
            page = self.list_jobs(cursor, limit)
            yield from page.get("items", [])
            cursor = page.get("nextCursor")
            if not cursor:
                break

    def activity(self, cursor: Optional[str] = None, run_id: Optional[str] = None, limit: int = 25) -> Any:
        query = {"limit": str(limit)}
        if cursor:
            query["cursor"] = cursor
        if run_id:
            query["runId"] = run_id
        return self._call("/agent/activity?" + parse.urlencode(query))

    def events(self) -> Generator[Dict[str, Any], None, None]:
        headers = self._headers()
        headers["Accept"] = "text/event-stream"
        with request.urlopen(request.Request(self.base_url + "/agent/events", headers=headers), timeout=self.timeout) as response:
            for raw_line in response:
                line = raw_line.decode("utf-8").strip()
                if line.startswith("data:"):
                    yield json.loads(line[5:].strip())
