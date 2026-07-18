# Epistemic Kernel and Agent API Checklist Plan (2026-07-18)

## Objective

Harden Wikitruth's truth-validation core so factual and ethical decisions are
derived from transparent channel-specific review, while preserving a governed
administrator final-say mechanism and enabling scoped software agents to make
auditable contributions through the same moderation lifecycle as people.

## Constraints

- [ ] Consensus remains the normal decision path; administrator overrides are explicit exceptions, never silent edits.
- [ ] Every final decision and override records reasoning, evidence, policy version, actor, timestamp, and audit history.
- [ ] Agent credentials are hashed, scoped, revocable, rate-limited, and attached to a real accountable user identity.
- [ ] Agent contributions start pending and receive no automatic screening or verdict privileges.
- [ ] Do not deploy to production or modify VPS, proxy, DNS, or production process state.
- [ ] Keep legacy rendering and React Native explicitly deferred.
- [ ] Keep source files within the repository size rule wherever practical.

## 1. Canonical Contracts and Architecture

- [x] Document channel-specific voting, consensus policy, and administrator final-say semantics.
- [x] Document scoped API-client identity, token lifecycle, contribution behavior, and attribution.
- [x] Document governed graph mutations, durable reputation outcomes, tenant extension validation, and public-discovery requirements.
- [x] Reconcile affected canonical cards and policy handbooks before implementation.

## 2. Verdict Consensus and Final Say

- [ ] Extend verdict votes with channel, channel status, evidence, confidence, expertise, conflict declaration, and policy version.
- [ ] Replace the fixed threshold with versioned configurable quorum and supermajority rules.
- [ ] Compute factual and ethical summaries independently, including abstentions and conflict exclusions.
- [ ] Allow reviewers to submit channel votes without directly mutating the final verdict.
- [ ] Automatically publish a final verdict when valid consensus is reached and the issue-first gate passes.
- [ ] Allow administrators to publish, replace, or clear a final verdict through a required reasoned override.
- [ ] Persist final-decision provenance, including consensus summary or override metadata.
- [ ] Expose decision history and override state in API and moderation UI.
- [ ] Add server and client regression coverage for voting, consensus, overrides, and legacy compatibility.

## 3. Durable Reputation and Trusted Ranking

- [ ] Credit only reviewed contributions and decisions that remain valid after the durability window.
- [ ] Stop granting quality credit for raw privileged activity or unvalidated vote volume.
- [ ] Track upheld and overturned review outcomes explicitly.
- [ ] Make trusted ranking evidence-first, with reputation as a bounded secondary input.
- [ ] Version the new formula and explain every dimension in API/UI output.

## 4. Governed Knowledge Graph

- [ ] Require contributor role and onboarding for outline link creation.
- [ ] Add privacy/context validation and prevent links to inaccessible targets.
- [ ] Record graph revisions, privileged audit events, and subscriber notifications.
- [ ] Add typed relationship semantics for child, support, oppose, related, evidence, source, and dependency links.
- [ ] Cover unauthorized, duplicate, private-target, and successful graph mutations with tests.

## 5. Scoped Agent Contribution APIs

- [ ] Add a dedicated API-client credential model with hashed token secret, prefix, scopes, status, expiry, use metadata, and rate policy.
- [ ] Add administrator create/list/rotate/revoke APIs; return raw secrets only once.
- [ ] Authenticate API clients before CSRF evaluation and attach their accountable user identity to the request.
- [ ] Enforce least-privilege scopes across read, contribution, graph, civic, moderation, and administration operations.
- [ ] Expose agent capability and identity endpoints under `/api/v1/agent/*`.
- [ ] Permit scoped agents to use the standard seven entry contribution endpoints with pending screening and normal duplicate/onboarding checks.
- [ ] Record API-client identity in revisions and audit events without exposing secrets.
- [ ] Add per-client rate limiting, expiry, revocation, and last-used tracking.
- [ ] Publish complete OpenAPI schemas, examples, and an agent integration runbook.

## 6. Generic Civic Tenant Extensions

- [ ] Replace Philippines-specific civic defaults with resolved tenant context.
- [ ] Define and validate a bounded tenant-owned extension schema contract.
- [ ] Validate civic record extension values on create and update.
- [ ] Store extension data separately from typed common civic fields.
- [ ] Render configured extension fields in civic create/edit/detail pages.
- [ ] Keep geography configuration generic while preserving FixPH compatibility through tenant configuration.
- [ ] Keep platform and tenant administrator authorization scopes distinct.
- [ ] Add multi-country extension, isolation, and invalid-payload tests.

## 7. Accessibility, Discoverability, API, and Runtime

- [ ] Restore visible keyboard focus and add automated focus-style regression coverage.
- [ ] Generate host-aware root, entry, and civic-tenant sitemaps without stale `/app` URLs.
- [ ] Render entry-specific title, description, canonical, OpenGraph, and structured data in the initial server response.
- [ ] Complete OpenAPI coverage for all mounted public and governed API surfaces.
- [ ] Give `/api/v1` an explicit contract/version policy and agent-safe error semantics.
- [ ] Replace recursive outline N+1 traversal with bounded batched traversal.
- [ ] Add an optional durable realtime event adapter while retaining local in-memory development behavior.
- [ ] Add repeatable API/database load tests and publish measured results.

## 8. Flagship Epistemic Workflow Pilot

- [ ] Create an idempotent disposable pilot fixture with a topic, claim, artifacts, provenance, source-quality reviews, issue, and reviewers.
- [ ] Exercise channel votes, consensus publication, administrator override, override reversal, revision history, reader signal, appeal, and civic evidence link.
- [ ] Verify audit-chain integrity and cleanup every disposable identity and record.
- [ ] Report agreement, decision path, provenance coverage, revisions, unresolved issues, and cleanup evidence.
- [ ] Keep real-world content seeding and reviewer recruitment as explicit operating work rather than fabricated completion.

## 9. Verification and Closure

- [ ] Run focused server/client suites after each implementation group.
- [ ] Run full server and client suites, lint, type checks, source guardrails, and production builds.
- [ ] Run OpenAPI, accessibility, SEO, load, audit-chain, policy-pilot, and flagship-pilot checks.
- [ ] Restart and verify only the local PM2 Wikitruth process if runtime verification requires it.
- [ ] Browser-test public, reviewer, administrator, agent-management, and civic flows at desktop and mobile widths.
- [ ] Record final QA evidence and reconcile canonical implementation status.
- [ ] Complete a separate verification pass with no pending or deferred items in this plan.
- [ ] Move this plan to `docs/plans/completed/` only after that separate pass succeeds.
