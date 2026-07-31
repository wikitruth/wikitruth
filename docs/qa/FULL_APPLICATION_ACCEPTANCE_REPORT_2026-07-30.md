# Full Application Acceptance Report

Date: 2026-07-30
Result: Local acceptance passed with documented residual risks
Branch: `develop`

## Scope And Claim Boundary

This pass tested the local modern Wikitruth implementation, its retained legacy
comparison surfaces, and the local Fix The Philippines tenant. It did not deploy
or change production, migrate production content, call production write APIs, or
modify DNS, proxies, VPS services, or production PM2 processes.

"Full application" means every distinct route pattern and representative screen
family in the active React route table, plus the role and mutation workflows
listed below. It does not mean every possible database record or every external
provider. Live social-login callbacks, outbound email delivery, physical
authenticators, destructive restore against retained data, and production
topology remain separate acceptance stages.

## Runtime And Visual Coverage

- Local application: PM2 process `35` from this repository, HTTPS port `9443`.
- Route inventory: all `140` active React route patterns resolved and rendered.
- Visual matrix: `294` renders, consisting of `147` desktop screens at
  `1440x1000` and `147` mobile screens at `390x844`.
- Human review: all captures were reviewed through `18` contact sheets, with
  direct full-resolution review of representative and suspicious screens.
- Automated visual checks: no unexpected danger alert, error boundary, page
  exception, first-party request failure, missing textual heading, or document
  overflow remained.
- Tenant isolation: `fixthephilippines.org` was forced to `127.0.0.1` in Chrome.
  The manifest confirms that production was not contacted and that the FixPH
  logo, shell, navigation, home structure, civic sections, and responsive layout
  were distinct from Wikitruth.
- Disposable route fixtures were removed. Sessions, memberships, groups, pages,
  categories, statuses, reputation snapshots, notifications, users, accounts,
  and admin records all had zero residue.

The generated screenshots and manifests remain under the gitignored
`docs/qa/artifacts/` tree. The route audit entry point is
`npm run test:acceptance:routes`.

## Functional Verification

| Area | Result |
| --- | --- |
| Server tests | `90` suites, `363` tests passed |
| Client tests | `103` suites, `253` tests passed |
| Client coverage | 65.03% statements, 52.33% branches, 49.60% functions, 65.73% lines |
| Cross-browser smoke | `56` scenarios passed in Chromium, Firefox, WebKit, and mobile Chrome |
| Public browser QA | `14` route/viewport checks passed with headings, focus, no overflow, and no app console errors |
| Semantic legacy/modern parity | Topic, argument, question, answer, issue, opinion, and artifact passed at desktop and mobile widths |
| Authenticated parity | All seven entry families passed for reader, contributor, screener, reviewer, and administrator roles |
| Civic/FixPH | Tenant lifecycle, membership, jurisdiction, civic record, knowledge links, lifecycle transition, and mobile layout passed |
| Agent/API | Credential creation, bearer auth, rotation, old-secret rejection, mobile management, revocation, and current-secret rejection passed |
| Passkeys | Passwordless signup, primary and backup passkeys, recovery codes, logout, and passwordless sign-in passed on the canonical dev origin |
| Governance | Content-policy pilot completed; epistemic factual/ethical consensus, administrator override, reversal, revisions, and hash-chain audit passed |
| Contracts and builds | OpenAPI `279` mounted operations, modern/legacy types, lint/guardrails, server/client production builds, and Storybook build passed |
| Performance | Real HTTPS 2xx responses: 50 samples each; p95 auth 123.0 ms, topics 67.3 ms, search 41.2 ms; all budgets passed |

The performance harness also passed a negative control: pointing it at redirect-only
HTTP port `8000` now fails on HTTP `301` instead of reporting redirect throughput
as application performance.

## Corrections Implemented

- Added semantic level-one headings to signup and shared admin CRUD screens
  without changing their visual scale.
- Formatted structured account and administrator names instead of displaying
  `[object Object]`.
- Removed password hashes, reset credentials, mobile tokens, and provider data
  from admin user API responses using an explicit server-side allowlist.
- Retained recursive client-side credential redaction as defense in depth.
- Added regression coverage for heading semantics, structured names, and server
  and client credential suppression.
- Added a route-derived visual audit that resolves all parameterized routes,
  expands civic sections, checks both viewports, verifies a forced-local tenant,
  captures evidence, and proves fixture cleanup.
- Made the visual audit fail on unexpected danger alerts and distinguish only
  narrowly expected navigation cleanup from real request failures.
- Repaired the benchmark to use the HTTPS application, require 2xx responses,
  bound samples below the API rate limit, and report honest burst measurements.
- Repaired the webpack development proxy to use the HTTPS local backend. API
  context requests now return `200` instead of redirecting through port `8000`.

## Observations That Are Not Missing Software

The content-policy pilot reports local content-quality work rather than absent
features:

- two exact-title duplicate candidate groups need moderator review;
- none of three sampled artifacts currently has richer provenance;
- none of three sampled artifacts currently has a source-quality review;
- five accepted critical issues remain unresolved.

Production content was intentionally not imported or altered. These findings
should be addressed during content preparation, not by inventing test content in
this functionality pass.

Six older `passkey-e2e-*` users and six older `parity_*` users predate this run.
Current-run route fixtures have zero residue. The older identities were not
deleted because they were not created by this pass and no destructive cleanup
authorization was given.

## Residual Risks

- The 2026-07-31 safe dependency pass reduced the production tree from `16` to
  `13` unique advisory identifiers. `npm audit --omit=dev` reports `30` affected
  package nodes (`1` low, `6` moderate, `17` high, and `6` critical); this node
  count is higher than the earlier `25` because the newer brace-expansion
  advisory propagates through additional retained legacy parents after lockfile
  deduplication. Critical direct findings remain in the explicitly deferred
  Jade/Dust/Kraken legacy renderer dependencies.
- React Router `7.18.2` is flagged for an RSC-mode CSRF advisory. This application
  uses browser routing and does not configure React Server Components, so the
  affected mode is not active. The latest `react-router-dom` 7 release remains
  in the scanner range; a major router migration should be isolated rather than
  hidden by a downgrade.
- The machine is running Node `25.9.0`, above the declared `<25` engine bound.
  Preflight passes and bcrypt loads, but supported local and deployment runtimes
  should use Node 22 or 24.
- Storybook preview bundles produce size warnings. The production client build
  succeeds and is route-split; Storybook bundle warnings are not production
  bundle regressions.

## Completed Hardening Follow-Up

All four recommendations from the original acceptance pass were subsequently
approved, implemented, independently verified, and committed:

1. Paginated/searchable administrator collections and direct detail APIs:
   `7f43efc4`.
2. Trusted-principal and trusted-network rate-limit identity:
   `560c3fef`.
3. Reviewed deterministic critical-route visual baselines:
   `16e8bf4f`.
4. Focused timeline, notification, passkey, and administrator failure coverage:
   `a3cb7ee6`.

The completion checklist and evidence are in
`docs/plans/completed/MODERN_APPLICATION_HARDENING_CHECKLIST_PLAN_2026-07-30.md`.

## Future Considerations

The 2026-07-31 product decision keeps the current responsive Explore density,
deterministic modern GeoPattern palette, governed relationship actions instead
of cosmetic Move/Swap duplication, and concise browser titles. Reconsider these
only under a separately approved UX, relationship-semantics, branding, or SEO
scope.

Legacy-renderer retirement, React Native delivery, automatic content expiry,
broad strict-debate enforcement, root-folder hygiene, and real-world content
operations remain deferred. A future production release must separately verify
supported Node 22/24, real SMTP delivery, physical-device passkeys, content
migration, and explicitly authorized deployment.

## Final Verdict

No unresolved functional or visual defect was found in the tested local route,
role, tenant, authentication, governance, and agent matrices after remediation.
This is a local software acceptance result, not production deployment approval.
