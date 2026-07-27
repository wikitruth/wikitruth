# Legacy vs Modern Functional and Visual Audit (2026-07-28)

## Decision Boundary

This pass evaluates functionality, page structure, responsive behavior, and
legacy-replacement coverage. It does **not** migrate or copy live production
content into the local database, deploy code, restart production, or change a
VPS/proxy/domain. Production content migration remains a separate pre-deploy
operation requiring explicit authorization.

Parameterized content pages are evaluated by their shared page family rather
than by treating every database record as a unique implementation.

## Assessment

**The local modern application implements the non-deferred legacy feature
families and the broader modern administration, governance, authentication,
and civic surfaces.** This pass did not find a missing core legacy page family
in modern code. It did find three unambiguous presentation defects, which were
corrected:

1. The Wikitruth wordmark disappeared across the entire phone/tablet range
   instead of only at the legacy `xxs` breakpoint.
2. Member directories repeated a username as both title and subtitle when no
   distinct display name existed.
3. Long profile names could widen and clip the mobile profile header.

The tenant-operations access-denied state also lacked a structural page
heading. It now keeps the page identity and metadata while showing the access
message.

This is not a claim that production is ready to switch immediately. Production
still runs the legacy renderer and live content migration, deployment,
production smoke testing, and rollback readiness remain separate release work.

## Evidence Collected

| Evidence | Current result |
| --- | --- |
| Live public visual baseline | Home, Explore, Search, Visualize, all seven semantic entry families, create pages, groups, and members were inspected read-only. |
| Live authenticated baseline | The existing production administrator account was used only for read-only page inspection. The first 30 routes rendered successfully before the known legacy members-directory crash described below stopped the sweep. |
| Current local signed-in surface audit | 109 distinct representative routes rendered at desktop and `390x844` mobile sizes: 218 renders total. Public, authentication, account, authoring, member, group, moderation, admin, civic, error, entry, discussion, answer-list, and edit surfaces were included. |
| Public modern browser audit | 14 route/viewport checks passed with headings, focus, no horizontal overflow, and no application console errors. |
| Semantic legacy/modern parity | Topic, argument, question, answer, issue, opinion/comment, and artifact families passed in modern and local legacy rendering, including action presence and `390px` overflow checks. |
| Authenticated parity | Reader, contributor, screener, reviewer, and administrator action checks passed across all seven entry families. The disposable identity, account, administrator, and sessions were removed. |
| Current audit fixture cleanup | The comprehensive runner removed its disposable user/account/administrator/session records and reported `disposableIdentityRemoved: true`. |

Raw screenshots and manifests are retained locally under the gitignored
`docs/qa/artifacts/*-2026-07-28/` directories. They intentionally contain no
passwords and are not production content migration artifacts.

## Page and Section Coverage

| Surface family | Legacy observation | Modern/local result | Status |
| --- | --- | --- | --- |
| Global shell | Branded navbar, application links, account controls, contextual sidebar, footer | Equivalent tenant-aware shell, mobile drawer, notifications, Create entry point, role switch, and modern account controls | Complete; wordmark breakpoint fixed in this pass |
| Home | Mission hero, application GeoPatterns, rich Latest Posts rows | Mission hero, tenant/application cards, GeoPatterns, rich contextual rows, lifecycle and compact status indicators | Complete |
| Explore | Category GeoPatterns, type tabs, dense child previews, pagination/more links | Responsive category grid, all semantic tabs, richer filters, ranking, lifecycle filters, contextual rows, no mobile overflow | Complete; density choice needs review |
| Search | Type tabs and legacy result metadata | Semantic tabs, status icons, excerpts, parent context, counts, filters, and keyboard navigation | Complete |
| Visualize | Legacy hierarchy visualization | Bounded outline-tree graph with topic counts and responsive controls | Complete |
| Lists | Legacy redirects some families through Explore; issue/comment list templates have malformed headings/titles | Dedicated modern lists for topics, facts, questions, answers, artifacts, issues, opinions/comments, groups, and members | Complete; legacy malformed headings intentionally not copied |
| Entry families | Topic, fact, question, answer, artifact, issue, and comment templates with breadcrumbs, actions, Details, related content, and discussion | All seven modern families retain the shared visual language and add lifecycle, provenance, source quality, revision, moderation, and governance context | Complete |
| Create and edit | Legacy editors for all semantic families and groups | Guarded create/edit flows for all families, group creation, duplicate checks, suggestions/change requests, and artifact provenance | Complete |
| Discussion | Entry-bound comments plus legacy discuss routes | Entry-bound discussion for every family, dedicated answer discussion/answers, revision context, relevance/supersession, comment URL aliases | Complete |
| Members and profiles | Contributor/screener/reviewer/admin directories, profile tabs, diary, pages, settings | Role directories, deterministic avatars, profile scorecard, contribution/topic/journal/following/page/settings tabs, privacy controls | Complete; duplicate names and mobile header fixed |
| Groups | Directory, create, profile, posts, and members | Persistent About/Posts/Members navigation, rich group activity, create and membership flows | Complete |
| Account and authentication | Sign in/up, recovery, account, verification, Fast Switch | Legacy flows plus passkeys, recovery controls, onboarding, verification, notifications, role-aware sessions, and signed handoff/continue routes | Complete; empty handoff URLs correctly reject missing signed inputs |
| Moderation and governance | Screening, conversion, outline linking, ownership and privileged actions | Screening, convert, link/outline, merge, revisions, rollback, change requests, signals, appeals, verdicts, issue gates, overrides, audit chain | Complete; legacy action wording choice needs review |
| Administration | User/account/admin/group/category/status management and backup | Equivalent CRUD, secure backup/restore and install recovery, audit, signals, anonymous proposals, API clients, verdicts, civic tenants, and tenant operations | Complete; denied tenant-operations heading fixed |
| Civic/FixCountry | FixPH appears as a distinct tenant application in the shared legacy instance | Host-resolved tenant branding/navigation plus civic overview, government, projects, observations, locations, incidents, elections, actions, history, records, membership, and jurisdiction operations | Complete local product baseline |
| Utility and recovery | Clipboard, outline linking, About, Contact, Help Us, install, errors | Equivalent utility routes plus timeline, Create wizard, anonymous proposal flow, branded `404`, `500`, and `503` | Complete |

## Production Legacy Defect Found

Read-only navigation to `https://wikitruth.net/members/contributors` caused the
live legacy process to return `502 Bad Gateway`; routes requested immediately
after it were therefore invalid audit results. The sweep was stopped, and the
site recovered to HTTP `200` without any deployment, restart, or configuration
change by this pass.

This matches a defect already fixed locally: named member-directory routes are
ordered ahead of username routes, rejected legacy controller promises are
forwarded to Express, and missing member/group routes return controlled `404`
responses. Current local `/members/contributors` rendered successfully at both
desktop and mobile sizes. The fix is **not live until a separately authorized
production deployment occurs**.

## Expected Flags, Not Defects

- `/auth/continue` and `/auth/handoff` returned `404` when opened without their
  required signed parameters. Their pages retained explanatory headings.
- The arbitrary not-found route returned HTTP `404`, as required.
- `/500` and `/503` exercised intentional error-state behavior.
- The current audit administrator had global administration rights but no
  civic-tenant administrator membership. `/admin/civic-operations` correctly
  denied tenant operations; the page now retains its title and heading.

## Legacy Defects Not Carried Forward

- Live `/issues`, `/opinions`, and `/comments/` produced no meaningful `h1` and
  titles beginning with `|`. Modern uses proper list headings and metadata.
- Live `/topics` redirected to Home. Modern has a dedicated topic directory.
- Legacy editor samples expose placeholder headings such as `Header 1` through
  `Header 3`; modern editor structure is semantic and task-specific.

## Product Decisions for Review

These are real differences, but changing them automatically would be a product
decision rather than an obvious parity repair.

| Decision | Current modern behavior | Recommendation |
| --- | --- | --- |
| Explore information density | Shows a bounded preview per category, then explicit More navigation, while adding filters and ranking. Legacy places more child rows directly on the page. | Keep the clearer modern default. Consider an optional Compact/Dense preference only if users need high-volume scanning. |
| GeoPattern exact palette | Modern preserves deterministic category art and family-level color identity but does not always reproduce every legacy color tile exactly. | Keep deterministic modern generation unless exact visual branding is declared a release requirement. |
| Move/Swap Link terminology | Modern integrates relationship changes through Link to, outline linking, merge, and governed revision flows rather than exposing every legacy menu label verbatim. | Validate the underlying relationship transformations with domain examples before adding a separate Swap Link action. Do not add a cosmetic duplicate. |
| Browser title tagline | Modern titles are concise; legacy appends the full Wikitruth tagline to most pages. | Keep concise titles unless an SEO/content review chooses a tenant-configurable suffix. |
| Local test identities | Existing local `passkey-e2e-*` records appear in member listings. They predate this audit and were not removed. | Add a targeted test-data retention/cleanup policy; do not treat local data deletion as parity work. |

## Implementation Changes in This Pass

- `client/src/styles/global.css`
  - Restores the legacy `hidden-xxs` cutoff at `479px` rather than hiding the
    wordmark throughout the `767px` mobile range.
  - Allows long profile names to wrap without widening the viewport.
- `client/src/pages/Members/common/MemberDirectoryPage.tsx`
  - Shows the username subtitle only when a distinct display name exists.
- `client/src/pages/Admin/CivicOperations/CivicOperationsPage.tsx`
  - Keeps PageMeta and the page heading in signed-out or access-denied states.
- Focused regression coverage was added for each behavior.

## Final Verification

- `npm run test:client -- --runInBand`: 94 suites / 233 tests passed.
- `npm run lint`: passed with no lint errors.
- `npm run type:check`: passed.
- `npm run type:check:legacy`: passed.
- Focused legacy async-router/runtime regressions: 2 suites / 7 tests passed.
- `npm run build:server`: passed.
- `npm run build:client`: passed with Webpack compilation successful.
- Local-only PM2 process `35` (`wikitruth`) was restarted after the build and
  remained online. `/`, `/members/contributors`, and `/api/home` returned HTTP
  `200` over the local HTTPS endpoint.
- Post-build Chrome checks confirmed:
  - the brand label is visible at `606px` and hidden at `390px`;
  - member-directory duplicate title/subtitle count is zero;
  - the tested long profile has `innerWidth === scrollWidth === 390`;
  - the profile title wraps inside a `390px` heading box.
- The production audit session was signed out after the read-only comparison.

## Release Boundary

No production deployment or content migration was performed. Before a future
modern production cutover, run a separately approved content migration rehearsal,
backup/restore verification, production-host tenant-resolution checks, signed-in
role smoke tests, and rollback rehearsal. Code/build readiness, migrated data,
deployment completion, and live verification must be reported as separate states.
