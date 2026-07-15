# Legacy, Modern, and Live Visual Audit (2026-07-15)

## Assessment

The modern web application has broad functional coverage, but it is not yet a
complete legacy replacement at presentation and workflow-discoverability depth.
The current implementation has stronger filtering, governance, responsive
behavior, security controls, and civic tenancy than legacy. It also has several
confirmed information-loss, navigation, and rendering defects that the earlier
route-level signoff did not detect.

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

## Priority Findings

### Critical Legacy Runtime Hazards

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

### High-Priority Modern Gaps

| ID | Finding | Confirmation | Recommended correction |
| --- | --- | --- | --- |
| `MOD-PARITY-01` | Core list and feed rows display raw screening codes such as `0` and `1` instead of `unverified`, `accepted`, or another user-facing status. | Every `EntryRow` family prints `entry.screening.status` directly; local APIs return numeric legacy codes. | Centralize screening status presentation and test every entry family. |
| `MOD-PARITY-02` | Home, Explore, Search, list pages, and related-entry sections lose meaningful legacy context. Missing information includes parent/topic context, excerpts, author/editor, status text, reply/root/expand actions, interaction counts, timestamps, and artifact media previews. | Same-data desktop/mobile comparison; live `wikitruth.net` also retains these rich row surfaces. | Introduce a shared canonical entry-summary/card component with family-specific media and metadata. |
| `MOD-PARITY-03` | The modern base visualization is not a complete knowledge graph. It renders `Wikitruth` plus at most 14 recent Home API topics and adds related entries only after selection. | `VisualizePage.tsx` uses `/api/home`; it does not call the existing `/api/outline/tree` API, which supports depth up to four. | Build the graph from the outline tree and merge related entry nodes without losing current controls. |
| `MOD-PARITY-04` | Group overview, posts, and members do not share the legacy About/Posts/Members navigation. Posts are not discoverable from the overview. | The three modern components have separate headings and Back/View buttons; no shared group tab component exists. | Add a shared group header and persistent tabs on all group subroutes. |
| `MOD-PARITY-05` | Entry author hydration is incomplete. The modern topic sample shows `(Unknown author)` while legacy identifies `root`. | Modern falls back to `(Unknown author)` when `createUsername` is absent. | Hydrate creator/editor identity consistently in entry APIs and use a safe semantic fallback only for truly deleted identities. |

### Medium-Priority Modern Gaps

| ID | Finding | Confirmation | Recommended correction |
| --- | --- | --- | --- |
| `MOD-UX-01` | Entry breadcrumbs are present in the DOM on mobile but are visually covered by the two-row fixed header. The art bar becomes the first visible entry element. | Same topic at `390x844`: legacy breadcrumb is visible; modern breadcrumb occupies the fixed-header collision area. | Make mobile body/header offset match the expanded navbar height and add a visual regression assertion for breadcrumb visibility. |
| `MOD-UX-02` | Direct navigation to an unknown modern URL returns Express plain text `Cannot GET ...` instead of the branded React 404 page. | The server serves the React shell only for enumerated route patterns; the client wildcard is not reached for arbitrary direct URLs. | Add a safe final HTML-shell fallback after API, static, and legacy routing. |
| `MOD-UX-03` | Anonymous protected pages render operational UI and then expose raw `401`/`403` request errors. This affects Notifications and most Admin pages; civic operations uses a cleaner sign-in message. | Public sweep shows `Notification request failed: 401`, `Admin request failed: 403`, and full tenant/admin forms before authorization succeeds. | Add route-level auth/role guards and a consistent sign-in or forbidden state before protected data/forms mount. |
| `MOD-UX-04` | FixPH section navigation is horizontally scrollable but gives no overflow cue and does not scroll the active section into view. `Projects`, later sections, and `Public Memory` can be active off-screen. | Desktop/mobile visual inspection and `.wt-civic-sections` source review. | Add active-item `scrollIntoView`, edge affordances, and keyboard-visible scroll behavior. |
| `MOD-UX-05` | The Sign In page's `Remember me` checkbox is cosmetic. | `LoginPage` collects `rememberMe` but calls `login(username, password)`; `AuthContext` and `authApi` have no remember option. | Implement a server-backed session-duration choice or remove the checkbox. |
| `MOD-UX-06` | Artifact list rows can render `Edited by on <date>` when editor data is absent. | `ArtifactsPage.tsx` interpolates `artifact.editorUsername` unconditionally. | Use a conditional sentence and hydrate the editor where possible. |
| `MOD-UX-07` | Modern member avatars use uniform flat placeholders while legacy patterns make rows easier to distinguish. | Side-by-side member/profile inspection. | Reuse deterministic geometric/avatar patterns or an equally differentiated modern treatment. |

### Route and Baseline Clarifications

| ID | Finding | Classification |
| --- | --- | --- |
| `BASELINE-01` | Local legacy returns `404` for `/legacy/members/dsalunga/topics`, `/legacy/about`, `/legacy/help-us`, `/legacy/http/500`, `/legacy/errors/503`, and six legacy admin collection routes. | The old matrix lists these as aligned, but the currently mounted legacy baseline cannot render them. This is tracker drift, not a modern defect. |
| `BASELINE-02` | Local legacy Sign Up and Contact raise `Missing required parameters: sitekey`. | Local legacy reCAPTCHA configuration gap. Modern should still be tested with a configured provider before rollout. |
| `BASELINE-03` | `/answers/entry/:id/discussion` is not a declared modern route, unlike several other entry families. The inferred audit URL renders the client 404 and logs an API `500`. | Needs a product decision: add an answer discussion route if answers require a dedicated discussion view, or remove this inferred route from parity expectations. Reply remains available from the answer entry action menu. |
| `BASELINE-04` | The local legacy admin dashboard and backup page are reachable anonymously and expose operational controls and local filesystem paths. | Legacy security hazard. Modern APIs correctly deny anonymous access, although modern authorization UX still needs `MOD-UX-03`. |

## Page-Family Results

| Page family | Current result | Discrepancies and improvements |
| --- | --- | --- |
| Global shell/header/sidebar | Functional, partial visual parity | Modern adds Create, tenant/application links, policy-aware contribution, and a responsive sidebar. Mobile breadcrumb/header collision remains. |
| Home | Partial | Hero sections and geometric art are present. Modern feed is substantially less informative and omits artifact images; modern date formatting is clearer. |
| Explore | Partial with modern enhancements | Search, sort, lifecycle, and ranking controls exceed legacy. Result rows lose excerpts, authorship, statuses, interactions, and media. |
| Search | Partial with modern enhancements | Modern result tabs and counts are clearer. Search rows lose parent context, excerpts, status, author, and interaction metadata. |
| Seven list pages | Partial | All list routes work and modern filtering is stronger. Raw numeric screening codes and sparse row metadata affect all families. Artifact author grammar is broken when identity data is absent. |
| Seven create/edit families | Functionally present | Modern forms are generally more complete, with privacy, classification, provenance, references, and governed fields. Anonymous users can open forms before later write authorization; earlier sign-in guidance would be clearer. |
| Topic/argument/question/answer/issue/opinion/artifact entries | Core functional parity verified | Breadcrumbs and action menus exist; all five roles passed. Modern topic metadata loses parent/category/status detail and author identity in the sample. Related sections omit media and interaction context. Artifact metadata is improved. |
| Discussion/reply | Mostly present | Topic, argument, question, issue, and opinion discussion routes work. Answer dedicated discussion route requires clarification. Modern Reply actions are role-aware. |
| Artifact entry | Improved | Modern uses friendly file size/date formatting and full-date tooltip; live legacy still shows raw byte/date strings. Download/content/topic/source behavior remains available. |
| Groups | Functional, navigation partial | Overview/posts/members routes work; modern category/create controls improve posts. Shared group tab navigation is missing. |
| Members/profiles | Functional, partial presentation parity | Modern reputation scorecards add value. Avatar differentiation and some creator hydration are weaker; private journal behavior is correct but logs an avoidable `403`. |
| Login/signup/account | Functional, one confirmed no-op | Sign-in aligns and provider availability is reported honestly. `Remember me` has no effect. Local legacy reCAPTCHA is unconfigured. |
| Moderation/action menus | Functional parity verified | Disposable reader/contributor/screener/reviewer/admin checks passed all seven entry families. Modern terminology differs intentionally and adds signals/appeals. |
| Admin | APIs protected, route UX partial | Modern administrative and governance surfaces are broader and role-protected. Anonymous pages should guard before mounting forms and realtime/data requests. Several local legacy comparison routes no longer exist. |
| Visualize | Functional controls, incomplete graph data | Drag, momentum, fullscreen, metrics, and topic selection work. Base hierarchy depth and breadth are materially below legacy. |
| Static/help/install/error | Modern surfaces present | Local legacy baseline is unavailable for several documented comparison URLs. Arbitrary direct modern 404 does not receive the branded shell. |
| FixPH/Civic Core | Functional local tenant, navigation polish pending | Overview plus People, Incidents, Projects, Organizations, Actions, Elections, and Public Memory render without document overflow. Active horizontal-nav positioning needs improvement. |

## Live `wikitruth.net` Comparison

The production site is still legacy-rendered, so it is useful as a current
feature and information-density reference, not as a data-equality test. The
local database is an older sparse test dataset and should not be expected to
match production categories or records.

- Live Home and Explore retain rich parent context, excerpts, author/editor,
  statuses, interaction controls/counts, and artifact images. Local modern is
  cleaner but loses much of this decision-making context.
- Live topic entries retain sub-topic/category/status labels and rich child row
  metadata. Local modern has stronger governance affordances but weaker content
  presentation and creator hydration in the inspected sample.
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

## Open Remediation Checklist

- [ ] Replace raw screening integers with semantic labels across every row/card.
- [ ] Restore canonical row metadata, context, interaction affordances, and
  artifact media in Home, Explore, Search, lists, and related sections.
- [ ] Use the outline-tree API as the primary visualization graph source.
- [ ] Add persistent shared group navigation.
- [ ] Repair creator/editor hydration and artifact-list fallback grammar.
- [ ] Prevent the mobile fixed header from covering breadcrumbs.
- [ ] Serve the branded React 404 for arbitrary direct browser routes.
- [ ] Add consistent route-level authentication and role guards.
- [ ] Make FixPH active section navigation visible and discoverable.
- [ ] Implement or remove the nonfunctional `Remember me` option.
- [ ] Decide whether answers require a dedicated discussion route.
- [ ] Isolate or harden the two crashing legacy routes while legacy remains
  mounted in the shared process.
- [ ] Re-run the 306-render sweep and disposable five-role suite after fixes.

## Verification Evidence

- Public page-family sweep: 89 route cases, 306 renders
- Semantic entry parity: seven families passed, desktop/mobile, no modern
  horizontal document overflow
- Authenticated entry parity: five roles across seven families passed with zero
  retained disposable identity records
- Local FixPH API: ten fixture records, six lifecycle statuses, one urgent
  record, all configured sections available
- Local runtime after audit: PM2 process `35` online; restart count `39` reflects
  the two documented legacy crashes
