# Civic Core Multi-Tenancy Checklist Plan (2026-07-13)

## Objective

Convert FixPH into the first tenant of a reusable, isolated Civic Core that reuses Wikitruth knowledge models and supports shared, dedicated, and headless country/jurisdiction deployments from one codebase.

## Constraints

- [x] Preserve current FixPH routes and existing civic records through compatibility defaults and migration tooling.
- [x] Do not deploy to production or modify VPS, proxy, DNS, or production process state.
- [x] Keep legacy rendering and React Native explicitly deferred.
- [x] Keep source files within the repository size rule wherever practical.

## 1. Architecture and Contracts

- [x] Add approved canonical Civic Core and tenancy card.
- [x] Add detailed architecture and migration decisions.
- [x] Define typed tenant, jurisdiction, membership, link, and tenant-context contracts.
- [x] Define shared, dedicated, and headless deployment profiles without code forks.

## 2. Persistence and Isolation

- [x] Add `CivicTenant`, `Jurisdiction`, `TenantMembership`, and `CivicEntryLink` models and indexes.
- [x] Add `tenantId`, `countryCode`, and optional `jurisdictionId` to `CivicRecord` with FixPH compatibility defaults.
- [x] Include all new collections in backup/export configuration.
- [x] Add tenant-scoped unique indexes and fail-closed query helpers.
- [x] Register CivicRecord as a first-class object type for audit, revision, change-request, and notification services.

## 3. Tenant Resolution and APIs

- [x] Resolve active tenant from host, explicit tenant route, or local default.
- [x] Enforce agreement between host, route, and authenticated tenant membership for mutations.
- [x] Add public tenant metadata and jurisdiction APIs.
- [x] Add administrator tenant, jurisdiction, and membership management APIs.
- [x] Add explicit `/api/v1/tenants/:tenantId/civic/*` routes while preserving `/api/civic/*`.
- [x] Scope overview, list, detail, create, update, transition, and candidate comparison by tenant.

## 4. Wikitruth Knowledge Integration

- [x] Add validated CivicEntryLink create/list/delete APIs.
- [x] Support Topic, Argument, Question, Answer, Artifact, Opinion, and Issue relationships.
- [x] Validate target existence, privacy, and relationship/object compatibility.
- [x] Return safe linked-entry previews from civic detail APIs.
- [x] Convert legacy artifact/issue references into compatibility links.
- [x] Record revisions, audit events, and notifications for civic mutations and relationship changes.

## 5. Configurable Civic Frontend

- [x] Add a reusable tenant configuration client and provider/hook.
- [x] Remove hardcoded FixPH name, country code, currency, locale, geography, and section assumptions from civic pages.
- [x] Apply tenant branding through scoped CSS variables without changing the global Wikitruth theme.
- [x] Render tenant-configured section labels, order, icons, descriptions, and feature flags.
- [x] Add jurisdiction selection/filtering and configurable geography labels.
- [x] Add linked Wikitruth knowledge/evidence display and contributor link controls.
- [x] Preserve responsive desktop/mobile behavior and direct route loading.

## 6. Bootstrap and Migration

- [x] Bootstrap the `fixtheph` tenant from the current static application definition.
- [x] Add idempotent backfill for existing civic records and legacy Artifact/Issue references.
- [x] Add a fictional second tenant fixture proving country, currency, geography, branding, and data isolation.
- [x] Document shared, dedicated, and headless setup using environment-driven configuration.

## 7. Verification and Closure

- [ ] Add model, resolver, authorization, isolation, API, link-validation, migration, and OpenAPI tests.
- [ ] Add client tenant-config, branding, navigation, jurisdiction, link, and compatibility tests.
- [ ] Run full server and client suites, production builds, lint, modern/legacy type checks, and source guardrails.
- [ ] Restart and verify only the local PM2 Wikitruth process.
- [ ] Browser-test the FixPH tenant and fictional second tenant at desktop and mobile widths with no relevant console errors.
- [ ] Record final QA evidence and reconcile canonical status.
- [ ] Move this plan to `docs/plans/completed/` only after a separate verification pass succeeds with no pending or deferred plan items.
