# Epistemic Product Completion Plan (2026-07-28)

## Goal

Complete the approved modern Wikitruth product capabilities that turn the
existing governance foundation into an understandable, evidence-durable,
agent-safe, and operationally maintainable truth-validation system.

## Boundaries

- No production/VPS deployment or production content migration.
- No automatic content expiry or deletion.
- Broad strict-debate enforcement remains deferred.
- React Native and legacy-renderer retirement remain deferred.
- Popularity, reputation, agents, and administrator access never establish
  truth automatically.

## Implementation Checklist

### 1. Canonical Contract

- [x] Reconcile the approved target-state cards with the current implementation.
- [x] Record the new consensus, evidence, agent, reader, operations, civic, and
  tenant-launch invariants before implementation.

### 2. Consensus and Reader Comprehension

- [x] Add versioned verdict policies with sensitivity-dependent quorum.
- [x] Enforce reviewer eligibility, expertise declarations, conflict details,
  and independence/affiliation limits.
- [x] Preserve material dissent and expose revalidation due dates.
- [x] Add a shared public `Why this verdict?` summary for verdict-bearing entries.
- [x] Preserve and visibly label audited administrator overrides.

### 3. Evidence Integrity and Freshness

- [x] Extend governed graph relationships with `supports`, `refutes`,
  `qualifies`, and `background` evidence semantics plus citation locators.
- [x] Add source snapshot/hash verification and link-health state without
  copying restricted source bodies by default.
- [x] Add non-destructive freshness/re-review policy and notification queues.
- [x] Expose claim evidence maps in entry APIs and modern reading UI.

### 4. Agent Reliability

- [x] Add replay-safe idempotency keys for agent mutations.
- [x] Add validation/dry-run contribution endpoints.
- [x] Capture agent run/model/provider/purpose/source-manifest attribution.
- [x] Add scoped agent activity/status endpoints and realtime event filtering.
- [x] Preserve pending screening and prohibit automatic final decisions.

### 5. Knowledge Operations

- [x] Add a unified knowledge-health API and administrator dashboard.
- [x] Cover evidence gaps, unresolved critical issues, quorum gaps,
  revalidation, stale/broken sources, duplicates, and unanswered questions.
- [x] Add safe filters, counts, queue links, and tests.

### 6. Product Workflow Completion

- [x] Add an inline contribution drawer for contextual replies and common
  child-entry creation while retaining full editors.
- [x] Complete opinion classification authoring, editing, reading, and filters.
- [x] Add explicit `Latest`, `Trending`, and `Top` Home buckets with published
  formulas that do not affect verdicts.
- [ ] Add configurable in-app, email-digest, and web-push preferences with a
  delivery outbox abstraction.

### 7. Global, Civic, and Interoperability Expansion

- [ ] Add revision-linked multilingual entry variants and reviewed publication.
- [ ] Add civic subject-response and correction-request workflows with history.
- [ ] Add graph-aware search filters and public evidence-bundle/JSON-LD exports.
- [ ] Add tenant-launch readiness validation, configuration preview, and
  portable tenant configuration export.

### 8. Verification and Closure

- [ ] Add server/client/OpenAPI regression coverage for every new contract.
- [ ] Run lint, modern/legacy type checks, source guardrails, and production builds.
- [ ] Run disposable agent, civic, role, and desktop/mobile browser verification.
- [ ] Restart and verify the local PM2 process only.
- [ ] Update canonical statuses and publish a local engineering signoff.
- [ ] Commit each major capability group semantically.

## Completion Rule

Move this plan to `docs/plans/completed/` only after a separate final
verification pass succeeds, all checklist items are complete, and no item in
this plan remains deferred. The separately deferred programs listed under
Boundaries do not block this plan because they are outside its approved scope.
