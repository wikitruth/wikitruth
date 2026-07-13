# Civic Core Multi-Tenancy QA Sign-Off (2026-07-13)

## Result

`PASS`. The reusable Civic Core is implemented and verified locally. FixPH is the compatibility tenant, and the same build was verified with a fictional non-Philippine tenant. No production, VPS, proxy, or DNS change was made.

## Automated Verification

- Server: 56 suites, 251 tests passed.
- Client: 74 suites, 178 tests passed.
- Legacy/modern parity: server checklist, URL contracts, and 31 client checks passed.
- Performance budgets: auth, topic listing, and search passed.
- TypeScript: modern and legacy checks passed.
- Guardrails: suppressions, `any`, CommonJS, file size, server paths, compatibility isolation, and compatibility imports passed.
- Build: server and production client builds passed.
- OpenAPI, migration, tenant resolution, authorization, isolation, entry-link, headless CORS, and frontend tenant tests passed.

The final runs emitted only the existing `ts-jest` deprecation notice and pre-existing file-size warnings. No new guardrail exemption was added.

## Migration Verification

- A compressed local MongoDB archive was created and validated with `mongorestore --dryRun` before applying the migration.
- The idempotent local migration bootstrapped `fixtheph`.
- Existing civic records requiring backfill: `0`.
- Legacy Artifact/Issue links requiring conversion: `0`.
- A post-apply dry run remained clean.

## Runtime Verification

- Restarted only local PM2 process `35` (`wikitruth`).
- Process remained `online` after API and browser probes.
- `/api/civic/tenant`: `200`.
- `/api/civic/jurisdictions`: `200`.
- `/api/civic/overview`: `200`.
- `/api/v1/tenants/fixtheph/civic/tenant`: `200`.
- `/civic`: `200`.
- `/admin/civic-tenants`: `200`.
- Conflicting FixPH host and `fix-example` route: `409` fail-closed response.
- Public tenant metadata omitted `_id`, `createUserId`, and `editUserId`.
- Unconfigured cross-origin access remained fail-closed; exact-origin headless CORS and preflight behavior passed automated tests.
- No new PM2 error-log entry was recorded after the corrected runtime restart and probes.

## Authenticated Tenant Operations

- Platform tenant create/update/inactivate, tenant membership assignment/deactivation, jurisdiction create/update/deactivation, contributor record create/update, Wikitruth link add/remove, and reviewer lifecycle transition passed in Google Chrome `150.0.7871.115`.
- The authenticated mobile civic workspace had no horizontal overflow at `390x844`.
- Disposable users, memberships, jurisdictions, records, sessions, and tenant configuration were removed with zero mutable fixture residue and no retained credentials.
- Full evidence and the repeatable command are recorded in `docs/qa/CIVIC_AUTHENTICATED_BROWSER_SIGNOFF_2026-07-13.md`.

## Browser Matrix

| Tenant | Width | Verified |
| --- | ---: | --- |
| Fix The Philippines | 1280 | Title, branding, all configured sections, search/filter workspace, no console errors, no horizontal overflow |
| Fix The Philippines | 390 | Responsive navigation and filters, no console errors, no horizontal overflow |
| Fix Example | 1280 | Fictional title/logo, teal branding, `Public Works`, `District`, current-app sidebar, no console errors, no horizontal overflow |
| Fix Example | 390 | Responsive configured section and geography label, no console errors, no horizontal overflow |

The fictional tenant and temporary local host proxy were removed after QA. The reusable fixture remains at `tests/fixtures/civic-tenants/fix-example.json`.

## Closure

- Shared, dedicated, and headless setup is documented in `docs/runbooks/CIVIC_TENANT_SETUP.md`.
- Canonical architecture is implemented without a country-specific backend fork.
- Production rollout remains a separate operational action and was not performed.
