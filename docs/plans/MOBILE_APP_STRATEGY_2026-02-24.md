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
- [x] Auth endpoints now support both session and mobile token lifecycle (`/api/auth/token`, `/api/auth/token/refresh`, `/api/auth/token/revoke`).
- [x] Dedicated mobile token model (access + refresh token issuance/revocation) is implemented with refresh-token rotation and revocation.
- [x] Formal API schema (OpenAPI/JSON Schema) is published for mobile-critical endpoints.
- [x] Consistent success/error envelope is enforced by API middleware.
- [x] Cursor-based pagination contract (`limit`, `cursor`, `nextCursor`) is available for mobile-read critical list endpoints.
- [x] Rate-limit and quota response contract (headers + `RATE_LIMITED`) is implemented and documented.
- [x] Contract-level deprecation policy and sunset headers are emitted by API contract middleware.
- [x] Binary/media upload contract documented for mobile clients.
- [x] Baseline realtime channel now available via SSE (`/api/realtime/events` and `/api/v1/realtime/events`).
- [x] Mobile-specific observability tags (client version, platform, build number) are integrated in API telemetry.
- [x] End-to-end contract tests for mobile critical path endpoints are now in server CI (`mobile-api-contracts`, `openapi-contract`, `request-context`).

## Required Backlog Before Mobile Build Starts

1. [x] Add token-based auth endpoints and refresh rotation policy.
2. [x] Define and publish OpenAPI spec for mobile MVP endpoints.
3. [x] Normalize success response shape for MVP endpoints.
4. [x] Add pagination contract (`limit`, `cursor`, `nextCursor`) where list volume requires it.
5. [x] Add contract tests in CI for auth, home/topics/search, and core entry reads.
6. [x] Define mobile error code taxonomy and map from current server errors (`RATE_LIMITED`, envelope-level request IDs).

## Binary/Media Upload Contract (MVP)

Current mobile-compatible media flow is metadata-first through the artifacts API:

1. `POST /api/artifacts`
- Required fields: `title`, `description` (or `content`), `topicId` (or `ownerId`)
- Optional fields: `source`, `private`
- Response: `{ success: true, artifact: { ... } }` with canonical artifact id and ownership metadata.

2. `PUT /api/artifacts/entry/{id}`
- Supports metadata updates (title/content/source/privacy/topic ownership).
- Response: `{ success: true, artifact: { ... } }`.

3. Binary payload rule for mobile clients
- The API currently expects artifact metadata and a resolvable media `source` reference; it does not currently accept raw multipart file bytes in this endpoint family.
- Mobile clients should upload file bytes via the project’s storage channel and pass the resulting stable URL/reference in `source`.
- Server-side validation failures for incomplete metadata should be handled as standard API errors (`400` with envelope/error payload).

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
