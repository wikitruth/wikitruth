# Controller Guardrails (2026-02-26)

## Scope

Targeted hardening for legacy-backed controller hotspots referenced by the modernization plan:

- `controllers/groups.ts`
- `controllers/topics.ts`
- `controllers/async/clipboard.ts`

## Resolved Risks

1. `GRP-001` Private group visibility bug
- Status: Resolved
- Change: fixed membership predicate in `controllers/groups.ts` so private groups render only when the current user is an actual member.

2. `TOP-001` Group topic privacy ambiguity
- Status: Resolved
- Change: codified group-topic behavior in `controllers/topics.ts` with explicit rationale: group-scoped topics remain private by default.

3. `CLP-001` Orphan `threadId` on root `ArgumentLink` writes
- Status: Resolved
- Change: `controllers/async/clipboard.ts` now seeds `threadId` to self `_id` after upsert when missing.

## Active Guardrails

1. `CLP-002` Cross privacy-domain move protection
- Status: Active guardrail
- Rule: clipboard move flow blocks topic moves between diary-private and public domains until a formal ownership migration workflow exists.

2. `CLP-003` Children-count update strategy
- Status: Active guardrail
- Rule: per-entry children-count updates are intentionally retained for correctness. Batch optimization is deferred and must preserve count consistency invariants.

## Follow-up Backlog

- [ ] `CLP-004` Add transactional/batched children-count update strategy with invariant tests.
- [ ] `CLP-005` Add explicit migration flow for diary/public ownership transfer with policy checks.
