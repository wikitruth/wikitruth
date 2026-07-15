# Legacy, Modern, and Live Visual Audit (2026-07-15)

## Assessment

The modern web application now satisfies the non-deferred local legacy-
replacement criteria covered by this audit. It retains the stronger filtering,
governance, responsive behavior, security controls, and civic tenancy already
present in modern while closing the information-density, navigation, identity,
and rendering defects found during the initial comparison. A separate final
verification pass succeeded after remediation.

This audit supersedes the visual-alignment conclusions in the 2026-04-22 matrix
and the statement that the earlier 274-render sweep proved full page parity.
Route presence, HTTP `200`, and zero horizontal overflow are useful checks, but
they are not sufficient evidence of content or feature parity.

## Scope and Method

- Compared local modern and local legacy against the same MongoDB data at
  `1280x800` and `390x844`.
- Rendered 89 distinct route cases as 153 modern/legacy route rows and 306 total
  desktop/mobile page renders.
- Ran semantic checks for all seven core entry families: topic, argument,
  question, answer, issue, opinion/comment, and artifact.
- Ran a fresh disposable authenticated audit across reader, contributor,
  screener, reviewer, and administrator roles for all seven entry families.
- Visually inspected the current live `wikitruth.net` legacy application for
  Home, Explore, topic entry, artifact entry, sign-in, navigation, and content
  presentation. This was read-only production inspection.
- Configured and populated an isolated local FixPH tenant, then inspected its
  overview and all seven section pages on desktop and mobile.
- Reconciled visual observations against route declarations, component code,
  API responses, and local PM2 errors before classifying them.

Raw screenshots and manifests are intentionally gitignored under
`docs/qa/artifacts/visual-audit-2026-07-15/`. The authenticated manifest is
redacted and confirms that disposable user, account, and administrator records
were removed after the run.

## Remediation Outcome

- Rich shared entry rows now preserve semantic status, parent context, excerpts,
  authorship, dates, interactions, and artifact media across Home, Explore,
  Search, lists, group posts, journals, and related-entry sections.
- Visualization uses the bounded depth-four outline hierarchy; group pages share
  persistent About/Posts/Members navigation; answer discussion is a declared
  route; and member avatars are deterministic and differentiated.
- Account, authoring/editing, current-member workspace, moderation, outline, and
  administration routes guard before mounting; arbitrary direct routes receive
  the branded React `404`; mobile breadcrumbs remain visible; FixPH keeps the
  active section in view; and the no-op `Remember me` field was removed.
- Legacy public-route crashes are guarded, missing groups return `404`, and
  asynchronous legacy controller failures are forwarded to Express rather than
  terminating the shared process.
- Topic creator/editor identity now survives response serialization, and topic
  parent, verdict, tag, and link metadata match the useful legacy context.
- Final evidence: 306 renders with zero regressions/navigation failures/`5xx`/
  request failures/modern overflows; seven semantic families passed; all five
  disposable roles passed with cleanup; 61 server suites / 266 tests and 83
  client suites / 203 tests passed; smoke guardrails and builds passed.

## Priority Findings

### Critical Legacy Runtime Hazards (Resolved Locally)

These are legacy defects, not regressions in modern. They matter while legacy
remains mounted in the same process because a visual comparison can interrupt
unrelated modern requests.

| ID | Finding | Evidence | Impact |
| --- | --- | --- | --- |
| `LEG-CRASH-01` | Anonymous `GET /legacy/topics/create` throws while reading `isAdmin` from an undefined user/role value. | `legacy/server/controllers/topics.ts:278`; PM2 restarted during the sweep. | A public legacy route can terminate the shared process. |
| `LEG-CRASH-02` | `GET /legacy/members/contributors` throws while reading `_id` from `null`. | `legacy/server/controllers/members.ts:53`; PM2 restarted again. | A public member-list route can terminate the shared process. |

The two crashes raised local PM2 process `35` from 37 to 39 restarts. Modern
`/arguments/create` and `/members/screeners` were collateral connection refusals
during those restart windows and both returned `200` when retried. They are not
modern route failures.

`ef6792ff` corrected the two named routes. `aa7ced4f` then added missing-group
guards and an asynchronous legacy-router boundary. The final 306-render run did
not restart PM2; the current local restart count is `45`, including intentional
local rebuild restarts during remediation.

### High-Priority Modern Gaps (Resolved)

| ID | Finding | Confirmation | Recommended correction |
| --- | --- | --- | --- |
| `MOD-PARITY-01` | Core list and feed rows display raw screening codes such as `0` and `1` instead of `unverified`, `accepted`, or another user-facing status. | Every `EntryRow` family prints `entry.screening.status` directly; local APIs return numeric legacy codes. | Centralize screening status presentation and test every entry family. |
| `MOD-PARITY-02` | Home, Explore, Search, list pages, and related-entry sections lose meaningful legacy context. Missing information includes parent/topic context, excerpts, author/editor, status text, reply/root/expand actions, interaction counts, timestamps, and artifact media previews. | Same-data desktop/mobile comparison; live `wikitruth.net` also retains these rich row surfaces. | Introduce a shared canonical entry-summary/card component with family-specific media and metadata. |
| `MOD-PARITY-03` | The modern base visualization is not a complete knowledge graph. It renders `Wikitruth` plus at most 14 recent Home API topics and adds related entries only after selection. | `VisualizePage.tsx` uses `/api/home`; it does not call the existing `/api/outline/tree` API, which supports depth up to four. | Build the graph from the outline tree and merge related entry nodes without losing current controls. |
| `MOD-PARITY-04` | Group overview, posts, and members do not share the legacy About/Posts/Members navigation. Posts are not discoverable from the overview. | The three modern components have separate headings and Back/View buttons; no shared group tab component exists. | Add a shared group header and persistent tabs on all group subroutes. |
| `MOD-PARITY-05` | Entry author hydration is incomplete. The modern topic sample shows `(Unknown author)` while legacy identifies `root`. | Modern falls back to `(Unknown author)` when `createUsername` is absent. | Hydrate creator/editor identity consistently in entry APIs and use a safe semantic fallback only for truly deleted identities. |

All five items are implemented and covered. The final topic screenshot and API
response identify `root`; all seven entry families use semantic rich rows; the
outline graph and shared group navigation are present.

### Medium-Priority Modern Gaps (Resolved)

| ID | Finding | Confirmation | Recommended correction |
| --- | --- | --- | --- |
| `MOD-UX-01` | Entry breadcrumbs are present in the DOM on mobile but are visually covered by the two-row fixed header. The art bar becomes the first visible entry element. | Same topic at `390x844`: legacy breadcrumb is visible; modern breadcrumb occupies the fixed-header collision area. | Make mobile body/header offset match the expanded navbar height and add a visual regression assertion for breadcrumb visibility. |
| `MOD-UX-02` | Direct navigation to an unknown modern URL returns Express plain text `Cannot GET ...` instead of the branded React 404 page. | The server serves the React shell only for enumerated route patterns; the client wildcard is not reached for arbitrary direct URLs. | Add a safe final HTML-shell fallback after API, static, and legacy routing. |
| `MOD-UX-03` | Anonymous protected pages render operational UI and then expose raw `401`/`403` request errors. This affects Notifications and most Admin pages; civic operations uses a cleaner sign-in message. | Public sweep shows `Notification request failed: 401`, `Admin request failed: 403`, and full tenant/admin forms before authorization succeeds. | Add route-level auth/role guards and a consistent sign-in or forbidden state before protected data/forms mount. |
| `MOD-UX-04` | FixPH section navigation is horizontally scrollable but gives no overflow cue and does not scroll the active section into view. `Projects`, later sections, and `Public Memory` can be active off-screen. | Desktop/mobile visual inspection and `.wt-civic-sections` source review. | Add active-item `scrollIntoView`, edge affordances, and keyboard-visible scroll behavior. |
| `MOD-UX-05` | The Sign In page's `Remember me` checkbox is cosmetic. | `LoginPage` collects `rememberMe` but calls `login(username, password)`; `AuthContext` and `authApi` have no remember option. | Implement a server-backed session-duration choice or remove the checkbox. |
| `MOD-UX-06` | Artifact list rows can render `Edited by on <date>` when editor data is absent. | `ArtifactsPage.tsx` interpolates `artifact.editorUsername` unconditionally. | Use a conditional sentence and hydrate the editor where possible. |
| `MOD-UX-07` | Modern member avatars use uniform flat placeholders while legacy patterns make rows easier to distinguish. | Side-by-side member/profile inspection. | Reuse deterministic geometric/avatar patterns or an equally differentiated modern treatment. |

All seven items are implemented and revalidated at `1280x800` and `390x844`.
Unauthorized journals now render an explicit private state without an avoidable
`403`, and answer discussion no longer makes a suffix-as-ID API request.

### Route and Baseline Clarifications

| ID | Finding | Classification |
| --- | --- | --- |
| `BASELINE-01` | Local legacy returns `404` for `/legacy/members/dsalunga/topics`, `/legacy/about`, `/legacy/help-us`, `/legacy/http/500`, `/legacy/errors/503`, and six legacy admin collection routes. | The old matrix lists these as aligned, but the currently mounted legacy baseline cannot render them. This is tracker drift, not a modern defect. |
| `BASELINE-02` | Local legacy Sign Up and Contact raise `Missing required parameters: sitekey`. | Local legacy reCAPTCHA configuration gap. Modern should still be tested with a configured provider before rollout. |
| `BASELINE-03` | The original audit found no declared answer discussion route. | Resolved by implementing the focused route; desktop/mobile render `200` with no console or request errors. |
| `BASELINE-04` | The local legacy admin dashboard and backup page are reachable anonymously and expose operational controls and local filesystem paths. | Legacy security hazard. Modern routes and APIs guard anonymous access before operational UI mounts. |

## Page-Family Results

| Page family | Current result | Discrepancies and improvements |
| --- | --- | --- |
| Global shell/header/sidebar | Verified | Modern adds Create, tenant/application links, policy-aware contribution, and a responsive sidebar. Mobile breadcrumbs are visible without document overflow. |
| Home | Parity with modern enhancements | Hero sections, geometric art, semantic rich rows, interaction context, and artifact media are present. |
| Explore | Parity with modern enhancements | Search, sort, lifecycle, ranking, and rich result rows exceed the legacy control set without losing row context. |
| Search | Parity with modern enhancements | Result tabs/counts and rich parent, excerpt, status, author, date, and interaction metadata are present. |
| Seven list pages | Verified | All list routes use semantic status and shared metadata/media presentation; artifact author grammar is conditional. |
| Seven create/edit families | Verified and protected | Modern forms are generally more complete, with privacy, classification, provenance, references, and governed fields. Anonymous direct access receives a sign-in state with a safe return URL before forms mount. |
| Topic/argument/question/answer/issue/opinion/artifact entries | Verified | Breadcrumbs, action menus, parent/tag/verdict context, identity, rich related rows, and all five role behaviors passed. Artifact metadata remains improved. |
| Discussion/reply | Verified | Dedicated discussion routes include answers; modern Reply actions remain role-aware. |
| Artifact entry | Improved | Modern uses friendly file size/date formatting and full-date tooltip; live legacy still shows raw byte/date strings. Download/content/topic/source behavior remains available. |
| Groups | Verified with modern enhancements | Overview/posts/members share persistent navigation; category/create controls and rich post rows improve the legacy flow. |
| Members/profiles | Verified with modern enhancements | Deterministic avatars and reputation scorecards add value; private journal policy renders without forbidden requests. |
| Login/signup/account | Verified | Sign-in aligns, safe return URLs work, and provider availability is reported honestly. The no-op `Remember me` control is removed. Local legacy reCAPTCHA remains unconfigured. |
| Moderation/action menus | Functional parity verified | Disposable reader/contributor/screener/reviewer/admin checks passed all seven entry families. Modern terminology differs intentionally and adds signals/appeals. |
| Admin | Verified and protected | Modern administrative/governance surfaces guard before mount. Several local legacy comparison routes remain unavailable baseline gaps. |
| Visualize | Verified | Drag, momentum, fullscreen, metrics, topic selection, and the bounded depth-four outline hierarchy are present. |
| Static/help/install/error | Modern surfaces verified | Local legacy baseline remains unavailable for several comparison URLs; direct modern unknown routes receive the branded React `404` with status `404`. |
| FixPH/Civic Core | Verified local tenant | All configured sections render without modern overflow; active horizontal navigation auto-centers with visible edge affordances. |

## Live `wikitruth.net` Comparison

The production site is still legacy-rendered, so it is useful as a current
feature and information-density reference, not as a data-equality test. The
local database is an older sparse test dataset and should not be expected to
match production categories or records.

- Live Home and Explore remain useful information-density references. Local
  modern now retains parent context, excerpts, author/editor, semantic status,
  interaction controls/counts, and artifact media in shared rich rows.
- Live topic entries retain sub-topic/category/status labels and rich child row
  metadata. Local modern now retains those signals, resolves the inspected
  creator as `root`, and adds stronger governance affordances.
- Live artifact entries still display raw MIME type, byte count, and JavaScript
  date strings. Local modern's friendly units, friendly date, and raw-date
  tooltip are a confirmed improvement.
- Live has a larger, current category taxonomy. This is production content/data,
  not evidence of a missing modern feature.
- Modern navigation includes the legacy Groups, Members, Debates, Dictionary,
  and Manuscripts surfaces and adds Create, About, Contact, and tenant-aware
  application navigation.
- Live sign-in exposes configured Facebook login. Local modern reports social
  login as unavailable because local provider credentials are not configured;
  this is environment-dependent rather than a missing UI contract.
- A rapid sequence of live read-only navigations briefly received Nginx `502`
  responses; slower browser and `curl` retries returned `200`. This is recorded
  as a transient production availability observation, not a confirmed app
  defect and not part of the local implementation scope.

No production or VPS configuration, process, code, DNS, or proxy was changed
during this audit.

## Local FixPH Tenant

The local Wikitruth instance now has a deterministic FixPH QA tenant that does
not send the application switcher to `fixthephilippines.org`.

- Tenant: `fixtheph` / `Fix The Philippines`
- Local application URL: `/civic`
- Sections: People, Incidents & Observations, Projects, Organizations & Offices,
  Actions, Vote Wisely, and Public Memory
- Fixtures: one record for each of the ten civic record kinds, including one
  urgent incident, plus three jurisdictions
- Setup: `npm run setup:local-fixph`
- Reversible cleanup: `npm run setup:local-fixph:clean`
- Safety: setup refuses non-loopback MongoDB connections
- Implementation commit: `db81f613 feat(civic): add isolated local FixPH tenant setup`

The setup is idempotent and the browser app switch now resolves to same-origin
`/civic`. Local `.env` carries the ignored override; `.env.example` and the civic
tenant runbook document the portable configuration.

## Remediation Checklist

- [x] Replace raw screening integers with semantic labels across every row/card.
- [x] Restore canonical row metadata, context, interaction affordances, and
  artifact media in Home, Explore, Search, lists, and related sections.
- [x] Use the outline-tree API as the primary visualization graph source.
- [x] Add persistent shared group navigation.
- [x] Repair creator/editor hydration and artifact-list fallback grammar.
- [x] Prevent the mobile fixed header from covering breadcrumbs.
- [x] Serve the branded React 404 for arbitrary direct browser routes.
- [x] Add consistent route-level authentication and role guards.
- [x] Make FixPH active section navigation visible and discoverable.
- [x] Implement or remove the nonfunctional `Remember me` option.
- [x] Decide whether answers require a dedicated discussion route.
- [x] Isolate or harden the two crashing legacy routes while legacy remains
  mounted in the shared process.
- [x] Re-run the 306-render sweep and disposable five-role suite after fixes.

## Verification Evidence

- Public page-family sweep: 89 route cases, 306 renders, zero regressions,
  navigation failures, `5xx`, request failures, or modern overflow
- Semantic entry parity: seven families passed, desktop/mobile, no modern
  horizontal document overflow
- Authenticated entry parity: five roles across seven families passed with zero
  action errors and zero retained disposable identity records
- Anonymous access inventory: all modern authoring, screening, conversion,
  outline-mutation, account, and administration routes in the sweep rendered the
  protected sign-in state on desktop/mobile without mounting operational forms;
  the Create chooser remained public
- Local FixPH API: ten fixture records, six lifecycle statuses, one urgent
  record, all configured sections available
- Full regression: 61 server suites / 266 tests and 83 client suites / 203 tests
- Quality gates: lint, modern/legacy types, source guardrails, file-size budget,
  and production server/client builds passed
- Local runtime after remediation: PM2 process `35` online at restart count `45`;
  the final sweep caused no restart
