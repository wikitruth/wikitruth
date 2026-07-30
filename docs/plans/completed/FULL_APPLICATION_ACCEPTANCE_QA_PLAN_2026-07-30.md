# Full Application Acceptance and Visual QA Plan

Date: 2026-07-30
Status: Completed

## Objective

Validate the local modern Wikitruth application end to end across every unique
screen family, supported role, tenant, important data state, and user-facing
interaction. Repair unambiguous defects and usability regressions as they are
found. Record product changes or genuinely new features for review rather than
silently changing intended behavior.

This is a local implementation and acceptance pass. It does not authorize a
production deployment, production restart, DNS/proxy change, or production
content migration.

## Coverage Contract

The React route table currently contains 140 route patterns. Parameterized
aliases that render the same component are tested as one screen family, then
their URL, discussion/tab, access-control, empty/error, and responsive states
are tested separately where behavior differs. This avoids claiming that every
possible database record is a separate implementation while still covering
every distinct application path.

The acceptance result must distinguish:

- automated tests from browser-observed behavior;
- a rendered page from a completed interaction;
- local software verification from external-provider or physical-authenticator
  verification;
- safe disposable create/update/delete flows from destructive operational
  controls that are intentionally inspected without execution;
- implemented behavior from product ideas awaiting approval.

## Screen Families

- [x] Global Wikitruth shell: header, navigation, mobile drawer, contextual
  sidebar, footer, tenant switching, theme/branding, loading and error boundary.
- [x] Public discovery: Home, Explore, topic/category drill-down, Search,
  Visualize, timeline, policies, About/content, Contact, Help Us, and Install.
- [x] Authentication: sign in, sign up, sign out, forgot/reset password,
  onboarding, verification, auth continue/handoff rejection and valid handoff.
- [x] Account: overview, settings, privacy, sessions, passkey management,
  recovery controls, notifications and notification preferences.
- [x] Semantic directories: topics, arguments/facts, questions, answers,
  artifacts, issues, opinions/comments, groups, and members by role.
- [x] Semantic entries: topic, argument/fact, question, answer, artifact, issue,
  and opinion/comment, including friendly and ID URLs, discussion/answer tabs,
  actions, source/provenance, lifecycle, translations, history, evidence export,
  graph links, and responsive content.
- [x] Authoring: Create wizard, anonymous proposal, all semantic create forms,
  supported edit forms, rich text, validation, duplicate suggestions, artifact
  upload/provenance, clipboard, and outline linking.
- [x] Groups: directory, create, About, Posts, Members, join/leave and role-aware
  membership actions.
- [x] Member profiles: public/private profile, topics, journal/diary,
  contributions, following, pages, page creation/view, and profile settings.
- [x] Moderation and governance: screening, conversion, change requests,
  signals/appeals, verdict list/update, consensus and administrator override,
  merge/rollback, issue gates, audit trail, and access-denied states.
- [x] Administration: dashboard; user, account, administrator, admin-group,
  category, and status lists/details; backup/restore safety UI; anonymous
  proposals; API clients; knowledge health; civic tenants and operations.
- [x] Civic/FixCountry: local FixPH host resolution, distinct shell/home/nav,
  overview and all section tabs, record detail, responses/corrections,
  membership, jurisdiction administration, and mobile layout.
- [x] Agent/API: client creation/revocation, authentication, scopes,
  idempotency, contribution flow, audit attribution, rate/error envelopes,
  evidence and graph exports.
- [x] Recovery/error states: protected-route redirects, unauthorized/forbidden,
  missing records, arbitrary 404, intentional 500/503, offline/API failure,
  empty/loading/retry states, and invalid signed links.

## Role and State Matrix

- [x] Signed-out visitor.
- [x] Reader/member.
- [x] Contributor.
- [x] Screener.
- [x] Reviewer.
- [x] Global administrator.
- [x] Civic tenant member and civic tenant administrator.
- [x] Scoped API client/agent.
- [x] Empty, populated, loading, validation-error, permission-denied,
  not-found, server-error, accepted/disputed/draft, and archived/superseded
  states where supported.

## Interaction and Visual Matrix

- [x] Desktop at 1440 x 1000 and mobile at 390 x 844 for every representative
  screen family; use an intermediate width for shell breakpoint checks.
- [x] No uncaught application errors, failed first-party requests, horizontal
  overflow, obscured controls, clipped text, broken images, or accidental empty
  headings.
- [x] Menus, dropdowns, tabs, pagination, sorting, filters, accordions, modals,
  tooltips, copy/download actions, and keyboard focus states.
- [x] Form submit, validation, cancellation, dirty-state handling, success/error
  feedback, and destructive-action confirmation.
- [x] Accessible names, heading order, labels, keyboard reachability, visible
  focus, contrast-sensitive states, reduced-motion behavior, and zoom/reflow.
- [x] Tenant-specific logo, wordmark, colors, navigation, links, home structure,
  metadata, and isolation on local Wikitruth and FixPH hostnames.

## Verification Checklist

- [x] Capture the current branch, runtime, database/fixture, host, browser, and
  toolchain baseline without recording credentials.
- [x] Generate a traceable route-to-screen-family inventory from the active
  route configuration and compare it with browser manifests.
- [x] Run lint, modern and legacy type checks, source guardrails, server tests,
  client tests, coverage, production builds, OpenAPI coverage, documentation
  drift, performance budgets, and dependency/security inspection.
- [x] Run public browser checks and semantic legacy/modern parity at desktop and
  mobile sizes.
- [x] Run disposable authenticated parity for reader, contributor, screener,
  reviewer, and administrator roles and verify cleanup.
- [x] Run disposable authoring, moderation, civic/FixPH, and scoped-agent/API
  scenarios, including idempotency and audit attribution.
- [x] Run passkey unit/integration coverage and a local browser ceremony where
  the current dev origin and browser virtual authenticator support it.
- [x] Perform a captured visual review of every unique screen family and important
  interaction state, retaining screenshots/manifests only in gitignored QA
  artifact directories.
- [x] Repair obvious functional, accessibility, responsive, consistency, and
  feedback defects with regression tests.
- [x] Rebuild and restart only the local PM2 process when compiled output changes;
  verify health, route behavior, and the corrected flows after restart.
- [x] Commit completed implementation and test groups separately with concise
  semantic messages.
- [x] Publish a dated QA report containing coverage, fixes, evidence, residual
  risks, limitations, and new-feature proposals requiring approval.
- [x] Perform a separate final verification pass. Move this plan to
  `docs/plans/completed/` only if no item is pending or deferred.

## Safety Boundaries

- Use disposable local identities and content for mutation tests, then verify
  cleanup. Do not use or document real credentials.
- Inspect backup restore, account deletion, role escalation, tenant deletion,
  and similar destructive controls without executing them against retained
  data unless a disposable fixture proves the full operation safely.
- Do not contact production services for write operations and do not deploy.
- Do not add a new product feature without approval. Missing behavior already
  required by active documentation, broken existing controls, accessibility
  repairs, and low-risk consistency improvements may be implemented directly.

## Completion Evidence

The separate final verification pass completed on 2026-07-30. All local checklist
items passed within the coverage contract above. Results, limitations, residual
risks, and proposals requiring approval are recorded in
`docs/qa/FULL_APPLICATION_ACCEPTANCE_REPORT_2026-07-30.md`.
