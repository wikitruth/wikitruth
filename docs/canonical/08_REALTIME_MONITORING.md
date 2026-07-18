# Canonical Card: Realtime and Monitoring

## Purpose

Define the current realtime event channel and client monitoring behavior.

## Realtime Channel

- Realtime uses Server-Sent Events at `/api/realtime/events`.
- On connect:
- emits a `connected` event
- tracks subscriber count
- emits periodic heartbeat events
- Event bus is in-memory publish/subscribe by default.
- `REALTIME_EVENT_ADAPTER=mongo` enables durable, TTL-bounded cross-process fan-out for multi-worker deployments while preserving immediate local delivery.

## Monitoring Ingestion

- Client runtime error reports are accepted at `/api/monitoring/errors`.
- CSP violation reports are accepted at `/api/monitoring/csp`.
- Ingestion guards:
- same-origin trust checks (origin/referer/host)
- content-type validation
- per-IP rate limiting

## Monitoring to Realtime Bridge

- Accepted monitoring events are logged and then published to realtime stream (`monitoring.error`, `monitoring.csp`).
- Admin-facing UI can consume this stream for live operational awareness.

## Operational Invariant

Realtime monitoring remains best-effort. Memory mode is process-local; Mongo mode shares short-lived events across processes but is not a permanent audit log. Privileged actions continue to use the immutable entry-event audit chain.
