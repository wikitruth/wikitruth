# Civic Tenant Setup

## Purpose

Create a branded country or jurisdiction instance on the shared Wikitruth Civic Core, or run the same build as a dedicated/headless deployment. This runbook does not authorize production deployment.

## Shared Instance

1. Sign in as a platform administrator.
2. Open `/admin/civic-tenants`.
3. Bootstrap built-in tenants once to persist the FixPH compatibility configuration.
4. Create a tenant ID, country code, domains, locale, timezone, currency, colors, geography levels, and ordered sections.
5. Use the explicit tenant-admin bootstrap panel to grant the first selected user tenant administration. This action is audited and does not make every platform administrator a country administrator.
6. Add jurisdictions and later tenant memberships through the tenant-scoped API.
7. Pointing a domain, changing a proxy, or deploying remains a separate production operation requiring explicit authorization.

The shared API resolves the host automatically:

```text
GET /api/civic/tenant
GET /api/civic/records
```

The explicit versioned contract is:

```text
GET /api/v1/tenants/:tenantId/civic/tenant
GET /api/v1/tenants/:tenantId/civic/records
```

## Dedicated Instance

Use the same repository and build. Set:

```bash
CIVIC_FIXED_TENANT_ID=fix-example
MONGODB_URI=mongodb://127.0.0.1:27017/fix-example
MONGODB_DBNAME=fix-example
MONGODB_BACKUP_ROOT=/path/to/fix-example-backups
CIVIC_CORS_ORIGINS=https://civic.fix-example.org
```

Use separate secrets and media storage. `CIVIC_FIXED_TENANT_ID` causes conflicting explicit tenant routes to fail closed.

## Headless Frontend

- Consume `/api/v1/tenants/:tenantId/civic/*`.
- Use tenant-scoped session or bearer identity and configure exact frontend origins in the comma-separated `CIVIC_CORS_ORIGINS` allowlist.
- Read public branding/localization from the tenant endpoint.
- Do not fork Civic Core or redefine Wikitruth entry semantics in the frontend.

## FixPH Migration

Preview the idempotent migration:

```bash
npm run migrate:civic-core
```

Apply only after reviewing the counts and taking a verified backup:

```bash
npm run migrate:civic-core:apply
```

The migration bootstraps `fixtheph`, backfills legacy civic records, converts legacy Artifact/Issue arrays into typed links, and creates tenant-scoped indexes. It does not delete compatibility fields.

## Local FixPH QA Tenant

Keep the production FixPH domains in tenant configuration, but make the app switcher stay on the local shared instance by adding this to the ignored local `.env`:

```bash
CIVIC_TENANT_HOME_URL_OVERRIDES=fixtheph=/civic
```

Bootstrap the local tenant and upsert deterministic public QA records covering every civic record kind:

```bash
npm run setup:local-fixph
```

The setup refuses non-loopback MongoDB hosts before making any changes. It is idempotent and labels all generated records with `local-fixph-qa-v1`. Remove only those fixtures with:

```bash
npm run setup:local-fixph:clean
```

Open `/civic` on the local Wikitruth host to test the overview, all tenant sections, filtering, jurisdictions, and record detail pages. Do not add local hostnames to the production tenant domain list.

## Isolation Verification

- Requests for one tenant never return another tenant's civic records.
- Conflicting host and explicit tenant IDs return `409`.
- Mutations require an active tenant membership or the temporary non-admin FixPH global-role compatibility path.
- Backups include tenant, jurisdiction, membership, link, and civic-record collections.
- Use `tests/fixtures/civic-tenants/fix-example.json` as the fictional non-Philippine test tenant.
