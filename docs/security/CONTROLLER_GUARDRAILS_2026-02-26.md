# Controller Guardrails (2026-02-26)

## Scope

Targeted hardening for legacy-backed controller hotspots referenced by the modernization plan:

- `server/src/controllers/groups.ts`
- `server/src/controllers/topics.ts`
- `server/src/controllers/async/clipboard.ts`

## Resolved Risks

1. `GRP-001` Private group visibility bug
- Status: Resolved
- Change: fixed membership predicate in `server/src/controllers/groups.ts` so private groups render only when the current user is an actual member.

2. `TOP-001` Group topic privacy ambiguity
- Status: Resolved
- Change: codified group-topic behavior in `server/src/controllers/topics.ts` with explicit rationale: group-scoped topics remain private by default.

3. `CLP-001` Orphan `threadId` on root `ArgumentLink` writes
- Status: Resolved
- Change: `server/src/controllers/async/clipboard.ts` now seeds `threadId` to self `_id` after upsert when missing.

## Active Guardrails

1. `CLP-002` Cross privacy-domain move protection
- Status: Active guardrail
- Rule: clipboard move flow blocks topic moves between diary-private and public domains until a formal ownership migration workflow exists.

2. `CLP-003` Children-count update strategy
- Status: Active guardrail
- Rule: per-entry children-count updates are intentionally retained for correctness. Batch optimization is deferred and must preserve count consistency invariants.

3. `MON-001` Monitoring endpoint CSRF exception protection
- Status: Active guardrail
- Rule: `/api/monitoring/errors` is exempted from CSRF token checks to support `sendBeacon`, but only accepts same-origin JSON payloads and is rate-limited per client IP.
- Enforcement:
  - origin/referer host must match request host
  - `Content-Type` must be `application/json`
  - per-IP event rate capped in one-minute windows

4. `MOD-001` Moderation API role boundaries
- Status: Active guardrail
- Rule: modern moderation endpoints keep role-gated boundaries equivalent to legacy behavior.
- Enforcement:
  - `/api/moderation/screening` requires `screener` or `admin`
  - `/api/moderation/verdict`, `/api/moderation/take-ownership`, and `/api/moderation/delete` require `admin`
  - convert/verdict updates are restricted to topic/argument targets

## Follow-up Backlog

- [x] `CLP-004` Add transactional/batched children-count update strategy with invariant tests.
  - Implemented: `flowUtils.updateChildrenCountBatch(...)` now deduplicates parent-update tasks and supports transactional execution when sessions are available.
  - Implemented: `server/src/services/childrenCountGuardrails.ts` enforces children-count invariants (`total = accepted + pending + rejected`) before writes.
  - Test coverage: `tests/server/children-count-guardrails.test.js`.
- [x] `CLP-005` Add explicit migration flow for diary/public ownership transfer with policy checks.
  - Implemented endpoint: `POST /api/moderation/ownership-migration`.
  - Policy checks:
    - admin-only
    - root-topic-only (prevents partial subtree drift)
    - blocks group-owned topics from this flow
    - requires explicit diary target username
    - blocks cross-user diary transfer unless ownership is intentionally reassigned first
  - Follow-through: subtree privacy/owner fields are migrated and descendants are re-synced with count recalculation.
