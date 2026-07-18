# ADR-006: Realtime SSE Baseline for React Client

- Status: Accepted
- Date: 2026-02-24

## Context

The enhancement roadmap calls for realtime updates in the modern React surface, but full bidirectional collaboration infrastructure is out of scope for the current stabilization wave.

## Decision

Implement a baseline Server-Sent Events (SSE) channel with minimal operational risk:

1. Add `/api/realtime/events` (and `/api/v1/realtime/events` through existing v1 compatibility routing).
2. Use a lightweight in-memory event bus (`server/src/services/realtimeEvents.ts`) for publish/subscribe fan-out.
3. Stream initial `connected` and periodic `heartbeat` events to keep the channel alive.
4. Publish `monitoring.error` events from the monitoring controller as the first concrete realtime signal.
5. Provide a typed React client channel utility (`client/src/services/realtime/channel.ts`) for subscribing with `EventSource`.
6. Keep in-memory delivery as the development default and support an opt-in Mongo adapter for durable, cross-process PM2 fan-out.

## Consequences

- React client gets a production-safe realtime transport without requiring WebSocket infrastructure.
- `REALTIME_EVENT_ADAPTER=mongo` persists a short-lived event envelope and polls for events emitted by other processes; a TTL index bounds retention.
- Future phases can add Redis/NATS fan-out, channel authorization rules, and richer event taxonomies without changing the basic client contract.
