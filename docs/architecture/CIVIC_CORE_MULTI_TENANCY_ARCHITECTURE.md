# Civic Core Multi-Tenancy Architecture

## Decision

FixPH becomes the first configured tenant of a reusable Civic Core powered by Wikitruth. The default operating model is a shared application with strict tenant isolation. Dedicated deployments and independent frontends are supported through the same build and versioned APIs, without backend forks.

## System Boundaries

| Boundary | Owns |
| --- | --- |
| Wikitruth Core | Topic, Argument, Question, Answer, Artifact, Opinion, Issue, moderation, revision, change request, search, notification |
| Civic Core | Institution, office, person, project, observation, incident, action, election, candidate, historical outcome |
| Civic tenant | Domains, country/jurisdiction identity, branding, locale, currency, geography, navigation, features, policy version |
| Deployment profile | Shared or dedicated database, media storage, secrets, listener, proxy, and frontend |

## Knowledge Reuse

| Civic meaning | Wikitruth model |
| --- | --- |
| Subject or policy area | Topic |
| Claim, allegation, position, or analysis | Argument |
| Public question | Question |
| Official or community response | Answer |
| Contract, report, image, video, or source | Artifact |
| Discussion or objection | Opinion |
| Content-quality or governance dispute | Issue |

`CivicEntryLink` connects a tenant-owned civic record to one of these existing entries using a typed relationship. Links validate target existence and visibility and return a safe entry preview. Civic records remain responsible for structured public-accountability metadata.

## Core Data Contracts

### CivicTenant

- Stable string `tenantId` and ISO country code.
- One or more domains.
- Public title, navigation title, slogan, logos, favicon, and theme tokens.
- Default locale, supported locales, timezone, currency, and date formatting preferences.
- Configurable geography levels and address-field labels.
- Ordered section definitions and feature flags.
- Moderation policy version and optional election-system identifier.
- Shared/dedicated deployment metadata that contains no secrets.

### Jurisdiction

- Tenant-scoped hierarchy with country, region, province/state, city/municipality, district, and local levels.
- Configurable labels allow country-specific structures without changing the core schema.
- Civic records may reference a jurisdiction while retaining a human-readable location snapshot.

### TenantMembership

- Tenant-scoped roles: reader, contributor, screener, reviewer, and tenant admin.
- Global platform administrators retain emergency platform authority but do not silently become the recorded tenant actor.
- Mutations require both a valid Wikitruth identity and an authorized tenant role.

### CivicEntryLink

- Tenant, civic record, Wikitruth object type/name/id, relationship, creator, and timestamps.
- Unique per tenant, record, relationship, and target.
- Supported relationships: subject, claim, question, answer, evidence, discussion, review issue.

## Tenant Resolution

1. Resolve the host through configured domains.
2. Resolve an explicit tenant path when using `/api/v1/tenants/:tenantId/*`.
3. Resolve tenant identity permitted by the authenticated membership for mutations.
4. Reject conflicting host, path, or membership context.
5. Permit public reads only for active tenants and public records.

Local development may use `CIVIC_DEFAULT_TENANT_ID`; the built-in compatibility default is `fixtheph` until persisted tenant bootstrap is complete.

## API Contract

- `/api/civic/*` resolves the tenant from host or configured local default.
- `/api/v1/tenants/:tenantId/civic/*` is the explicit versioned contract for shared, dedicated, and headless clients.
- Tenant metadata and jurisdictions are public for active tenants.
- Tenant, jurisdiction, membership, and relationship mutations are role-gated and audited.
- Existing API consumers retain backward compatibility while receiving tenant identifiers in responses.

## Deployment Modes

| Mode | Contract |
| --- | --- |
| Shared | Multiple tenants, one build, tenant-scoped database rows and media prefixes |
| Dedicated | Same build and API with a fixed tenant, separate database/media/secrets |
| Headless | Independent frontend with tenant-scoped bearer/session access to versioned APIs |

## Migration

- Bootstrap a persisted `fixtheph` tenant from the current application definition.
- Backfill existing civic records with `tenantId=fixtheph`, `countryCode=PH`, and the closest jurisdiction when available.
- Convert legacy `artifactIds` and `issueIds` to `CivicEntryLink` rows while retaining read compatibility during transition.
- Replace hardcoded FixPH, `PH`, `PHP`, `en-PH`, and barangay/province assumptions with tenant configuration.
- Validate isolation with a fictional second tenant before any additional public country rollout.

## Non-Goals

- No production deployment is authorized by this architecture.
- No automatic unresolved-content expiry.
- No React Native delivery.
- No country-specific backend fork.
- No forced conversion of platform users into public-person records or community groups into institutions.
