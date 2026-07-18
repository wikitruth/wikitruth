# Epistemic Kernel and Agent API Checklist Plan (2026-07-18)

## Objective

Harden Wikitruth's truth-validation core so factual and ethical decisions are
derived from transparent channel-specific review, while preserving a governed
administrator final-say mechanism and enabling scoped software agents to make
auditable contributions through the same moderation lifecycle as people.

## Constraints

- [x] Consensus remains the normal decision path; administrator overrides are explicit exceptions, never silent edits.
- [x] Every final decision and override records reasoning, evidence, policy version, actor, timestamp, and audit history.
- [x] Agent credentials are hashed, scoped, revocable, rate-limited, and attached to a real accountable user identity.
- [x] Agent contributions start pending and receive no automatic screening or verdict privileges.
- [x] Do not deploy to production or modify VPS, proxy, DNS, or production process state.
- [x] Keep legacy rendering and React Native explicitly deferred.
- [x] Keep source files within the repository size rule wherever practical.

## 1. Canonical Contracts and Architecture

- [x] Document channel-specific voting, consensus policy, and administrator final-say semantics.
- [x] Document scoped API-client identity, token lifecycle, contribution behavior, and attribution.
- [x] Document governed graph mutations, durable reputation outcomes, tenant extension validation, and public-discovery requirements.
- [x] Reconcile affected canonical cards and policy handbooks before implementation.

## 2. Verdict Consensus and Final Say

- [x] Extend verdict votes with channel, channel status, evidence, confidence, expertise, conflict declaration, and policy version.
- [x] Replace the fixed threshold with versioned configurable quorum and supermajority rules.
- [x] Compute factual and ethical summaries independently, including abstentions and conflict exclusions.
- [x] Allow reviewers to submit channel votes without directly mutating the final verdict.
- [x] Automatically publish a final verdict when valid consensus is reached and the issue-first gate passes.
- [x] Allow administrators to publish, replace, or clear a final verdict through a required reasoned override.
- [x] Persist final-decision provenance, including consensus summary or override metadata.
- [x] Expose decision history and override state in API and moderation UI.
- [x] Add server and client regression coverage for voting, consensus, overrides, and legacy compatibility.

## 3. Durable Reputation and Trusted Ranking

- [x] Credit only reviewed contributions and decisions that remain valid after the durability window.
- [x] Stop granting quality credit for raw privileged activity or unvalidated vote volume.
- [x] Track upheld and overturned review outcomes explicitly.
- [x] Make trusted ranking evidence-first, with reputation as a bounded secondary input.
- [x] Version the new formula and explain every dimension in API/UI output.

## 4. Governed Knowledge Graph

- [x] Require contributor role and onboarding for outline link creation.
- [x] Add privacy/context validation and prevent links to inaccessible targets.
- [x] Record graph revisions, privileged audit events, and subscriber notifications.
- [x] Add typed relationship semantics for child, support, oppose, related, evidence, source, and dependency links.
- [x] Cover unauthorized, duplicate, private-target, and successful graph mutations with tests.

## 5. Scoped Agent Contribution APIs

- [x] Add a dedicated API-client credential model with hashed token secret, prefix, scopes, status, expiry, use metadata, and rate policy.
- [x] Add administrator create/list/rotate/revoke APIs; return raw secrets only once.
- [x] Authenticate API clients before CSRF evaluation and attach their accountable user identity to the request.
- [x] Enforce least-privilege scopes across read, contribution, graph, civic, moderation, and administration operations.
- [x] Expose agent capability and identity endpoints under `/api/v1/agent/*`.
- [x] Permit scoped agents to use the standard seven entry contribution endpoints with pending screening and normal duplicate/onboarding checks.
- [x] Record API-client identity in revisions and audit events without exposing secrets.
- [x] Add per-client rate limiting, expiry, revocation, and last-used tracking.
- [x] Publish complete OpenAPI schemas, examples, source-scanned route coverage, and an agent integration runbook.

## 6. Generic Civic Tenant Extensions

- [x] Replace Philippines-specific civic defaults with resolved tenant context.
- [x] Define and validate a bounded tenant-owned extension schema contract.
- [x] Validate civic record extension values on create and update.
- [x] Store extension data separately from typed common civic fields.
- [x] Render configured extension fields in civic create/edit/detail pages.
- [x] Keep geography configuration generic while preserving FixPH compatibility through tenant configuration.
- [x] Keep platform and tenant administrator authorization scopes distinct, with audited explicit tenant-admin provisioning.
- [x] Add multi-country extension, isolation, and invalid-payload tests.

## 7. Accessibility, Discoverability, API, and Runtime

- [x] Restore visible keyboard focus and add automated focus-style regression coverage.
- [x] Generate host-aware root, entry, and civic-tenant sitemaps without stale `/app` URLs.
- [x] Render entry-specific title, description, canonical, OpenGraph, and structured data in the initial server response.
- [x] Complete OpenAPI coverage for all mounted public and governed API surfaces.
- [x] Give `/api/v1` an explicit contract/version policy and agent-safe error semantics.
- [x] Replace recursive outline N+1 traversal with bounded batched traversal.
- [x] Add an optional durable realtime event adapter while retaining local in-memory development behavior.
- [x] Add repeatable API/database load tests and publish measured local results.

## 8. Flagship Epistemic Workflow Pilot

- [x] Create an idempotent disposable pilot fixture with a topic, claim, artifacts, provenance, source-quality reviews, issue, and reviewers.
- [x] Exercise channel votes, consensus publication, administrator override, override reversal, revision history, reader signal, appeal, and civic evidence link.
- [x] Verify audit-chain integrity and cleanup every disposable identity and record.
- [x] Report agreement, decision path, provenance coverage, revisions, unresolved issues, and cleanup evidence.
- [x] Keep real-world content seeding and reviewer recruitment as explicit operating work rather than fabricated completion.

## 9. Verification and Closure

- [x] Run focused server/client suites after each implementation group.
- [x] Run full server and client suites, lint, type checks, source guardrails, and production builds.
- [x] Run OpenAPI, accessibility, SEO, load, audit-chain, policy-pilot, and flagship-pilot checks.
- [x] Restart and verify only the local PM2 Wikitruth process if runtime verification requires it.
- [x] Browser-test public, reviewer, administrator, agent-management, and civic flows at desktop and mobile widths.
- [x] Record final QA evidence and reconcile canonical implementation status.
- [x] Complete a separate verification pass with no pending or deferred items in this plan.
- [x] Move this plan to `docs/plans/completed/` only after that separate pass succeeds.

## Verification Evidence

The separate closure pass completed on 2026-07-18. See
`docs/qa/EPISTEMIC_AGENT_MODERNIZATION_SIGNOFF_2026-07-18.md` for test counts,
runtime evidence, browser coverage, performance measurements, audit verification,
and the explicit boundary between implemented behavior and real-world content
operations.
