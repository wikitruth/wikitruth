# Modern Application Hardening Checklist Plan

Date: 2026-07-30
Status: In progress

## Objective

Complete the approved post-acceptance hardening work for the local modern
Wikitruth application: scalable administrator collections, trustworthy API
rate-limit identity, reviewed deterministic visual-regression baselines, and
focused coverage for under-tested timeline, notification, passkey, and
administrator failure paths.

This plan authorizes local implementation, tests, builds, local runtime
verification, and grouped commits. It does not authorize a push, production
deployment, production restart, DNS/proxy change, or content migration.

## Admin Collections

- [x] Add bounded server-side pagination and search to users, accounts,
      administrators, administrator groups, categories, and statuses.
- [x] Add direct role-gated detail endpoints so detail screens do not depend on
      loading the first collection page.
- [x] Preserve the administrator user response allowlist on collection and
      detail responses.
- [x] Update the modern client API and administrator list controls for search,
      page navigation, total counts, loading, empty, and error states.
- [x] Add server and client tests for paging, searching, direct lookup,
      redaction, not-found responses, and request failures.
- [x] Update the generated/checked OpenAPI contract where applicable.

## Rate-Limit Identity

- [x] Remove client-version and client-platform headers from rate-limit keys.
- [x] Key authenticated sessions by stable server-established principal and
      anonymous requests by trusted request IP.
- [x] Preserve the existing bounded rate response contract and cleanup logic.
- [x] Add regression tests proving spoofed client headers cannot create fresh
      buckets and distinct authenticated principals remain isolated.

## Visual Regression

- [x] Add a deterministic Playwright configuration for critical desktop and
      mobile routes with fixed locale, timezone, motion, viewport, and mocked data.
- [x] Cover the global shell, Home, Explore, an entry page, authentication, and
      a representative administrator surface.
- [x] Generate and visually review committed baseline images.
- [x] Prove a second comparison run passes without updating snapshots.
- [x] Add documented commands for reviewing and intentionally updating the
      baselines.
- [x] Refuse non-loopback visual targets by default and correct fixed-width
      route containers that could overlap the desktop context sidebar.

## Focused Coverage

- [x] Cover timeline list, visualization, revision, query serialization, and
      error behavior.
- [x] Cover notification service preference/delivery and failure behavior.
- [x] Cover passkey-management recovery, last-credential, assurance, and
      request-failure edge states required by the canonical identity contract.
- [x] Cover administrator list/detail load, retry, mutation, and not-found
      failures.
- [x] Record focused and aggregate coverage evidence.

Focused evidence: 34 tests passed across the four target suites. The selected
hardening surface reached 81.55% statements, 76.77% branches, 66.66% functions,
and 82.99% lines. Timeline and notification services each exceeded 97%
statement coverage.

Aggregate evidence: 104 client suites and 279 tests passed. Repository client
coverage reached 69.83% statements, 57.77% branches, 54.18% functions, and
70.55% lines, above the configured global thresholds.

## Final Verification

- [x] Run targeted server/client tests after each completed group.
- [ ] Run lint, TypeScript checks, source guardrails, full server/client tests,
      production builds, and OpenAPI coverage.
- [ ] Run the committed visual-regression comparison at desktop and mobile.
- [ ] Exercise the changed administrator flow in a rendered local browser and
      verify page identity, meaningful content, console health, responsive layout,
      search, pagination, and direct detail loading.
- [ ] Confirm the worktree contains only intended changes and no secrets or
      generated transient artifacts.
- [ ] Commit each completed group separately with concise semantic messages.
- [ ] Publish completion evidence and perform a separate final verification
      pass before moving this plan to `docs/plans/completed/`.

## Completion Gate

This plan is complete only when every checklist item has passed in a separate
verification pass, the reviewed baseline images are committed, and no pending
or deferred item remains.
