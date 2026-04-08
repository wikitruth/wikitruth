# ADR-007: Canonical `server/src` Backend Layout

- Status: Accepted
- Date: 2026-04-08

## Context

Backend code evolved in root-level folders (`controllers`, `middlewares`, `models`, `services`, `types`, `utils`) with mixed entrypoints and path assumptions. This made migration sequencing and ownership boundaries harder to reason about.

## Decision

Adopt `server/src/*` as the canonical backend source of truth:

1. Move backend TypeScript modules into `server/src/`.
2. Keep root-level compatibility shims for moved modules so legacy requires and tests remain functional during transition.
3. Introduce canonical entrypoints at `server/src/app.ts` and `server/src/server.ts`.
4. Keep root `app.js` and `server.js` as forwarding shims only.
5. Restrict server TypeScript compilation scope to `server/src/**`.
6. Add import-path guard scripts to prevent regressions that escape canonical `server/src` boundaries.

## Consequences

- Backend implementation ownership is now centralized under `server/src`.
- Legacy root paths remain available through explicit shim compatibility.
- Build and runtime behavior remain stable while allowing future staged shim cleanup.
