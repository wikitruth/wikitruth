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

- [ ] Remove client-version and client-platform headers from rate-limit keys.
- [ ] Key authenticated sessions by stable server-established principal and
      anonymous requests by trusted request IP.
- [ ] Preserve the existing bounded rate response contract and cleanup logic.
- [ ] Add regression tests proving spoofed client headers cannot create fresh
      buckets and distinct authenticated principals remain isolated.

## Visual Regression

- [ ] Add a deterministic Playwright configuration for critical desktop and
      mobile routes with fixed locale, timezone, motion, viewport, and mocked data.
- [ ] Cover the global shell, Home, Explore, an entry page, authentication, and
      a representative administrator surface.
- [ ] Generate and visually review committed baseline images.
- [ ] Prove a second comparison run passes without updating snapshots.
- [ ] Add documented commands for reviewing and intentionally updating the
      baselines.

## Focused Coverage

- [ ] Cover timeline list, visualization, revision, query serialization, and
      error behavior.
- [ ] Cover notification service preference/delivery and failure behavior.
- [ ] Cover passkey-management recovery, last-credential, assurance, and
      request-failure edge states required by the canonical identity contract.
- [ ] Cover administrator list/detail load, retry, mutation, and not-found
      failures.
- [ ] Record focused and aggregate coverage evidence.

## Final Verification

- [ ] Run targeted server/client tests after each group.
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
