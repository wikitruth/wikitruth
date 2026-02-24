# Mobile App Strategy (2026-02-24)

## Objective

Define a low-risk path to deliver a modern mobile experience while keeping legacy and React web flows stable.

## Recommended Direction

Use **React Native + Expo** as the primary mobile stack.

Reasons:

1. Team already uses React/TypeScript in the web client.
2. Shared domain models and API client conventions can be reused.
3. Delivery speed is faster than native iOS/Android split teams for current roadmap scope.

## Delivery Phases

### Phase 0: API Contract Readiness (must complete first)

- Stabilize API response contracts used by mobile MVP.
- Add token-based auth suitable for mobile session persistence.
- Publish contract docs and smoke tests for mobile-critical endpoints.

### Phase 1: Mobile Read-Only MVP

- Home feed and topic browsing.
- Search and entry detail pages.
- Account sign-in and sign-out.

### Phase 2: Authenticated Contribution

- Create/edit flows for selected entities (topics/arguments/questions).
- Draft saving and optimistic updates.
- Basic push notification intake.

### Phase 3: Collaboration and Realtime

- Realtime updates for moderation and collaborative activities.
- Offline read cache with conflict-safe write queue.

## API Contract Readiness Checklist

Legend: `[x]` ready, `[~]` partial, `[ ]` missing

- [x] Versioned API route available (`/api/v1/*` compatibility).
- [~] Auth endpoints exist (`/api/auth/login`, `/api/auth/me`, `/api/auth/logout`) but rely on cookie session flow, not mobile token lifecycle.
- [ ] Dedicated mobile token model (access + refresh token issuance/revocation).
- [ ] Formal API schema (OpenAPI/JSON Schema) for mobile-critical endpoints.
- [~] Consistent error envelope exists for server-thrown errors, but success payload shape is not yet fully standardized across all endpoints.
- [ ] Cursor-based pagination contract for large collections.
- [ ] Rate-limit and quota response contract (headers + error codes) documented.
- [ ] Contract-level deprecation policy and sunset headers.
- [ ] Binary/media upload contract documented for mobile clients.
- [x] Baseline realtime channel now available via SSE (`/api/realtime/events` and `/api/v1/realtime/events`).
- [ ] Mobile-specific observability tags (client version, platform, build number) integrated in API telemetry.
- [ ] End-to-end contract tests for mobile critical path endpoints.

## Required Backlog Before Mobile Build Starts

1. Add token-based auth endpoints and refresh rotation policy.
2. Define and publish OpenAPI spec for mobile MVP endpoints.
3. Normalize success response shape for MVP endpoints.
4. Add pagination contract (`limit`, `cursor`, `nextCursor`) where list volume requires it.
5. Add contract tests in CI for auth, home/topics/search, and core entry reads.
6. Define mobile error code taxonomy and map from current server errors.

## Suggested Repository Layout

- `mobile/` (new workspace)
- `mobile/src/features/*`
- `mobile/src/services/api/*` (generated or shared contract-aware client)
- `mobile/src/types/*` (shared DTOs with strict boundaries from server models)

## Exit Criteria for "Mobile-Ready API"

1. All checklist items marked `[x]` for MVP scope.
2. Contract tests pass in CI on every PR.
3. Backward compatibility proven for web (`/api`) and versioned (`/api/v1`) clients.
4. Security review signs off token lifecycle and revocation behavior.
