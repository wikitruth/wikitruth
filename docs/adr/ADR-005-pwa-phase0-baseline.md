# ADR-005: PWA Phase 0 Baseline

- Status: Accepted
- Date: 2026-02-24

## Context

The enhancement roadmap includes PWA support, but a full offline-first strategy is high-risk during ongoing parity and modernization work.

## Decision

Implement PWA Phase 0 with a constrained baseline:

1. Add a web app manifest (`public/manifest.webmanifest`).
2. Add a minimal app-shell service worker (`public/service-worker.js`) for React route shell/assets.
3. Register the service worker only in production environments through `client/src/utils/pwa.ts`.
4. Keep API/network behavior unchanged; no offline API mutation queue in this phase.

## Consequences

- Enables installability and baseline caching for React shell routes.
- Avoids changing data consistency behavior while legacy comparison mode remains active.
- Provides a safe foundation for future PWA phases (offline data strategies, background sync, notifications).
