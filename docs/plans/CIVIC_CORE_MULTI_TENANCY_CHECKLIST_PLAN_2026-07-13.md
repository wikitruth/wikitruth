# Civic Core Multi-Tenancy Checklist Plan (2026-07-13)

## Objective

Convert FixPH into the first tenant of a reusable, isolated Civic Core that reuses Wikitruth knowledge models and supports shared, dedicated, and headless country/jurisdiction deployments from one codebase.

## Constraints

- [ ] Preserve current FixPH routes and existing civic records through compatibility defaults and migration tooling.
- [ ] Do not deploy to production or modify VPS, proxy, DNS, or production process state.
- [ ] Keep legacy rendering and React Native explicitly deferred.
- [ ] Keep source files within the repository size rule wherever practical.

## 1. Architecture and Contracts

- [ ] Add approved canonical Civic Core and tenancy card.
- [ ] Add detailed architecture and migration decisions.
- [ ] Define typed tenant, jurisdiction, membership, link, and tenant-context contracts.
- [ ] Define shared, dedicated, and headless deployment profiles without code forks.

## 2. Persistence and Isolation

- [ ] Add `CivicTenant`, `Jurisdiction`, `TenantMembership`, and `CivicEntryLink` models and indexes.
- [ ] Add `tenantId`, `countryCode`, and optional `jurisdictionId` to `CivicRecord` with FixPH compatibility defaults.
- [ ] Include all new collections in backup/export configuration.
- [ ] Add tenant-scoped unique indexes and fail-closed query helpers.
- [ ] Register CivicRecord as a first-class object type for audit, revision, change-request, and notification services.

## 3. Tenant Resolution and APIs

- [ ] Resolve active tenant from host, explicit tenant route, or local default.
- [ ] Enforce agreement between host, route, and authenticated tenant membership for mutations.
- [ ] Add public tenant metadata and jurisdiction APIs.
- [ ] Add administrator tenant, jurisdiction, and membership management APIs.
- [ ] Add explicit `/api/v1/tenants/:tenantId/civic/*` routes while preserving `/api/civic/*`.
- [ ] Scope overview, list, detail, create, update, transition, and candidate comparison by tenant.

## 4. Wikitruth Knowledge Integration

- [ ] Add validated CivicEntryLink create/list/delete APIs.
- [ ] Support Topic, Argument, Question, Answer, Artifact, Opinion, and Issue relationships.
- [ ] Validate target existence, privacy, and relationship/object compatibility.
- [ ] Return safe linked-entry previews from civic detail APIs.
- [ ] Convert legacy artifact/issue references into compatibility links.
- [ ] Record revisions, audit events, and notifications for civic mutations and relationship changes.

## 5. Configurable Civic Frontend

- [ ] Add a reusable tenant configuration client and provider/hook.
- [ ] Remove hardcoded FixPH name, country code, currency, locale, geography, and section assumptions from civic pages.
- [ ] Apply tenant branding through scoped CSS variables without changing the global Wikitruth theme.
- [ ] Render tenant-configured section labels, order, icons, descriptions, and feature flags.
- [ ] Add jurisdiction selection/filtering and configurable geography labels.
- [ ] Add linked Wikitruth knowledge/evidence display and contributor link controls.
- [ ] Preserve responsive desktop/mobile behavior and direct route loading.

## 6. Bootstrap and Migration

- [ ] Bootstrap the `fixtheph` tenant from the current static application definition.
- [ ] Add idempotent backfill for existing civic records and legacy Artifact/Issue references.
- [ ] Add a fictional second tenant fixture proving country, currency, geography, branding, and data isolation.
- [ ] Document shared, dedicated, and headless setup using environment-driven configuration.

## 7. Verification and Closure

- [ ] Add model, resolver, authorization, isolation, API, link-validation, migration, and OpenAPI tests.
- [ ] Add client tenant-config, branding, navigation, jurisdiction, link, and compatibility tests.
- [ ] Run full server and client suites, production builds, lint, modern/legacy type checks, and source guardrails.
- [ ] Restart and verify only the local PM2 Wikitruth process.
- [ ] Browser-test the FixPH tenant and fictional second tenant at desktop and mobile widths with no relevant console errors.
- [ ] Record final QA evidence and reconcile canonical status.
- [ ] Move this plan to `docs/plans/completed/` only after a separate verification pass succeeds with no pending or deferred plan items.
