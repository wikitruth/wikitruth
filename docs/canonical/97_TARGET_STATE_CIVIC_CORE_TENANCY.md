# Canonical Card: Civic Core and Country Tenancy

## Purpose

Define the reusable civic-accountability platform contract that powers FixPH and future country or jurisdiction instances.

## Platform Layers

- Wikitruth Core owns topics, claims, questions, answers, artifacts, opinions, review issues, revisions, moderation, search, and notifications.
- Civic Core owns structured institutions, offices, public people, projects, elections, candidates, incidents, observations, actions, locations, and outcomes.
- A civic tenant configures jurisdiction, domains, branding, localization, navigation, policy, and enabled features.
- FixPH is the first civic tenant and must not remain a Philippines-specific code fork.

## Reuse Contract

- Civic records link to existing Wikitruth entries through typed relationships: subject, claim, question, answer, evidence, discussion, and review issue.
- Platform users and community groups are not interchangeable with public officials and civic institutions; optional links may connect them without merging their identities.
- Real-world civic incidents remain civic records. Wikitruth `Issue` remains a content-quality or governance review object.

## Isolation Contract

- Every civic record, jurisdiction, membership, relationship, audit operation, query, cache, export, and backup is tenant-scoped.
- Host-derived, path-derived, and authenticated tenant context must agree for mutations or fail closed.
- Tenant administrator and platform administrator are distinct scopes.
- Shared and dedicated deployments use the same code and API contracts; country-specific backend forks are not canonical.

## Configuration Contract

- Country and jurisdiction assumptions are configuration, not hardcoded UI or schema defaults.
- Configuration includes ISO country code, locale, timezone, currency, geography labels, domains, branding, navigation, feature flags, and policy version.
- Common civic fields remain typed; country-specific extensions require a tenant-owned validated schema.
- Tenant extension schemas are declarative data contracts, never executable code, and civic records store only values that pass the resolved tenant schema.

## Delivery Contract

- Canonical APIs are versioned and explicitly tenant-addressable under `/api/v1/tenants/:tenantId/civic/*`.
- Host-scoped `/api/civic/*` remains a compatibility alias for the resolved tenant.
- A branded tenant may run in the shared Wikitruth application, in a dedicated deployment of the same build, or through an independent frontend consuming the same APIs.

## Target State Status

- Core tenancy is `implemented`; validated tenant record extensions and country-neutral persistence defaults are active hardening work under the 2026-07-18 epistemic-kernel plan.
- FixPH is the first persisted compatibility tenant; shared, dedicated, and headless profiles use the same models and APIs.
- A fictional second tenant verified country, currency, geography, branding, navigation, isolation, and responsive rendering.
- Detailed architecture: `docs/architecture/CIVIC_CORE_MULTI_TENANCY_ARCHITECTURE.md`.
- Completed checklist: `docs/plans/completed/CIVIC_CORE_MULTI_TENANCY_CHECKLIST_PLAN_2026-07-13.md`.
- QA evidence: `docs/qa/CIVIC_CORE_MULTI_TENANCY_SIGNOFF_2026-07-13.md`.
