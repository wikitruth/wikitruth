# Admin Security, Observability, and Privacy Local Verification

Date: 2026-08-04  
Result: Pass  
Branch: `develop`

## Scope and Claim Boundary

This verification covers the local React Router security migration,
administrator permission management, operational telemetry and alerting, and
privacy operations. It does not claim a push, public deployment, production
data operation, off-host backup, or production readiness approval.

## Implemented Milestones

- React Router now resolves only to patched `react-router@8.3.0`; the affected
  React Server Component APIs are not used by Wikitruth.
- Administrator access now uses a catalog-backed permission matrix with direct
  overrides, inherited group grants, self-protection, last-capable-admin
  protection, and privileged audit evidence.
- System Operations now provides bounded health history, sanitized events,
  deduplicated alerts, configurable rules, acknowledgement/resolution, and
  explicit unknown/unavailable states.
- Privacy operations now provide governed export and anonymization lifecycles,
  legal holds, preview-before-execute controls, one-time expiring downloads,
  protected-account blockers, session revocation, and stable pseudonymous
  public attribution.

## Automated Verification

| Check | Result |
| --- | --- |
| Server tests | 115 suites / 458 tests passed |
| Client tests | 127 suites / 388 tests passed |
| Server production build | Passed |
| Client production build | Passed |
| Smoke/type/lint/guardrails | Passed; only pre-existing file-size warnings remained |
| OpenAPI coverage | 306 mounted operations covered |
| Documentation drift | Passed |
| Router dependency tree | Only `react-router@8.3.0` |
| Production dependency audit | No React Router finding; 21 retained legacy-renderer/toolchain package nodes |

The retained production-audit findings remain isolated to the deferred
Jade/Dust/Kraken renderer dependency chain. No forced audit override or unsafe
major substitution was applied.

## Browser and Responsive Verification

The local PM2 Wikitruth process was restarted after successful build and test
gates. HTTPS port `9443` returned `200`; no other PM2 application was restarted.

The installed Chrome browser was used to inspect:

- administrator access summary, groups, searchable permission matrix, and
  protected sticky action area;
- System Operations health, telemetry history, alerts, alert rules, and backup
  boundary;
- administrator privacy queue and filters;
- authenticated self-service Privacy & Data workspace.

Desktop checks used `1440x1000` in light mode. Mobile checks used `390x844` in
dark mode. All tested mobile pages reported document width equal to viewport
width (`390px`) with no horizontal overflow. Loading and empty states rendered
with named controls and semantic regions. No first-party console error was
captured; observed warnings/errors came from an unrelated installed browser
extension and were excluded by source/message.

A disposable local administrator was used only for read-only screen inspection.
Its session, web-session, user, account, administrator, notification, and
privacy-request targets were removed and then verified at zero residue.

## Concept Fidelity

Five temporary ImageGen concepts were generated and visually reviewed before
implementation: permissions desktop, operations desktop/mobile, and privacy
desktop/mobile. They were preview-only and were not copied into the product or
committed.

The implementation adopted the concepts' compact hierarchy, measured status
cards, searchable access matrix, responsive filters, clear destructive-action
separation, and stacked mobile layouts. It intentionally retained Wikitruth's
existing application header, horizontal administrator navigation, contextual
sidebar, typography, and component language instead of introducing the
concepts' new full-height left administration rail.

## Deferred Work

Legacy security isolation, migration/cutover controls, verified off-host
backups, and large-scale spam cleanup remain explicitly deferred in
`docs/plans/deferred/V2_LAUNCH_READINESS_DEFERRED_CHECKLIST_2026-08-04.md`.
The local System Operations page correctly reports that off-site verification
is unavailable rather than implying protection that has not been implemented.

## Local Commits

- `42d0d710` - React Router security migration
- `59984be5` - administrator permission management
- `b9f814d2` - permission matrix typing correction
- `3a10cfe8` - operational telemetry and alerting
- `e671fb41` - governed privacy operations

No commit in this milestone was pushed or deployed by this verification pass.
