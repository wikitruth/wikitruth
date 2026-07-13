# Authenticated Civic Browser QA Sign-Off (2026-07-13)

## Result

`PASS`. Tenant administration and governed civic contribution were exercised end to end in the locally running application using installed Google Chrome. The run used disposable identities and data, removed all mutable fixtures, retained only immutable privileged audit evidence, and made no production, VPS, proxy, or DNS change.

## Environment

- Application: `https://wikitruth.example.com:9443` on local PM2 process `35` (`wikitruth`).
- Browser: Google Chrome `150.0.7871.115`, launched through the Playwright `chrome` channel.
- Desktop viewport: `1280x800`.
- Mobile viewport: `390x844`.
- Tenant under test: `fixtheph`, plus a disposable tenant used to verify platform tenant create/update/inactivate behavior.
- Runner: `npm run test:civic:authenticated:disposable -- https://wikitruth.example.com:9443`.

## Flow Under Test

The flow under test was: platform administrator login -> tenant configuration -> tenant membership and jurisdiction administration -> tenant member login -> civic record creation and owner edit -> Wikitruth knowledge-link add/remove -> reviewer lifecycle decision -> authenticated mobile rendering -> administrator deactivation and cleanup.

## Browser Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Page identity | Pass | Expected login, Civic Tenants, Civic Operations, Incidents & Observations, and civic record headings and URLs were reached. |
| Meaningful rendering | Pass | Each page exposed the expected forms, status regions, list items, and record detail controls before the runner continued. |
| Framework/runtime errors | Pass | No page exception or browser console error was captured across either authenticated context. |
| Interaction state | Pass | Every create, update, link, transition, deactivate, and membership action was followed by an asserted URL, heading, field state, or success status. |
| Responsive behavior | Pass | The authenticated incidents workspace did not exceed the `390px` viewport width. |
| Fixture isolation | Pass | Users, memberships, jurisdictions, records, and the disposable tenant all had zero residue; no credentials were retained. |

## Workflows Verified

- Create a country tenant, edit its navigation title, and make it inactive through the platform tenant editor.
- Search active users without exposing the full user directory, assign tenant-scoped contributor and reviewer roles, edit the membership, and deactivate it.
- Create and rename a jurisdiction, reject unsafe hierarchy behavior in automated API coverage, then deactivate the jurisdiction.
- Create a screened incident as a tenant contributor and edit the contributor-owned record.
- Preserve unedited nested project, location, observation, and election fields during partial server updates while allowing displayed location fields to be cleared intentionally.
- Add and remove a Wikitruth artifact relationship from the civic record.
- Transition the record to a reviewed lifecycle state with a required reason.
- Enforce tenant membership roles in the modern UI instead of relying on the account's globally selected role.

## Defects Closed During Verification

- Added the missing modern tenant membership and jurisdiction administration surface.
- Added an explicit current-actor tenant-role contract at `/api/civic/me`.
- Added owner/reviewer record editing and restricted knowledge-link and lifecycle controls to tenant-authorized actors.
- Prevented partial record edits from replacing unrelated nested civic data.
- Prevented jurisdiction hierarchy cycles and added privileged jurisdiction update/deactivation events.
- Fixed Chrome validation of tenant IDs by escaping the hyphen in the HTML pattern.
- Normalized minimized tenant configuration objects so the editor always receives valid JSON defaults.

## Regression Evidence

- Full server suite: 56 suites, 251 tests passed.
- Full client suite: 74 suites, 178 tests passed.
- Focused civic client suite: 6 suites, 18 tests passed after the final edit-path correction.
- Legacy/modern parity: 3 server suites / 9 tests and 6 client suites / 31 tests passed.
- Modern and legacy TypeScript, zero-error lint, production build, performance budgets, source guardrails, compatibility isolation/imports, server paths, OpenAPI contract, documentation drift, and `git diff --check` passed.

The repeatable runner writes its redacted manifest under the ignored `docs/qa/artifacts/civic-browser-disposable-YYYY-MM-DD/` directory. Immutable audit events are intentionally not deleted because deleting privileged audit history would invalidate the audit-chain contract.
