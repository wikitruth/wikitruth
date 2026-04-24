# Legacy vs Modern URL Format Drift Checklist Plan (2026-04-22)

## Goal

Provide a dedicated side-by-side URL format matrix to detect route-shape drift between legacy and modern pages.

This checklist focuses on **URL contracts**, not visual parity.

## Normalization Rule

For comparison clarity, treat legacy routes as:

- `legacy_normalized_path = legacy_path` with the leading `/legacy` prefix removed.

Examples:

- `/legacy/topics/create` -> `/topics/create`
- `/legacy/topic/:friendly/:id` -> `/topic/:friendly/:id`

## Evidence Sources

- Modern routes: `client/src/routes/routeConfig.tsx`
- Legacy entry routes: `legacy/server/utils/setupEntryRouters.ts`
- Redirect/alias rules: `server/src/middlewares/routes.ts`
- Existing parity audit context: `docs/plans/LEGACY_MODERN_MIGRATION_PARITY_AUDIT_CHECKLIST_PLAN_2026-04-19.md`

## Status Legend

- `MATCH` = normalized legacy URL format equals modern canonical format.
- `DRIFT` = format changed (path shape, naming, segment model, or query model).
- `ALIAS` = legacy format intentionally redirected to a modern canonical format.
- `MODERN_ONLY` = modern route has no legacy page equivalent by design.

## URL Format Matrix (Legacy Prefix Ignored)

| Area | Legacy path (raw) | Legacy path (normalized) | Modern canonical path | Status | Drift notes |
| --- | --- | --- | --- | --- | --- |
| Home | `/legacy/` | `/` | `/` | `MATCH` | None |
| Explore | `/legacy/explore` | `/explore` | `/explore` | `MATCH` | None |
| Search | `/legacy/search` | `/search` | `/search` | `MATCH` | None |
| Visualize base | `/legacy/visualize` | `/visualize` | `/visualize` | `MATCH` | None |
| Visualize topic | `/legacy/visualize/topic/:friendly/:id` | `/visualize/topic/:friendly/:id` | `/visualize/topic/:friendly/:id` | `MATCH` | None |
| Topics list | `/legacy/topics` | `/topics` | `/topics` | `MATCH` | None |
| Topics create | `/legacy/topics/create` | `/topics/create` | `/topics/create` | `MATCH` | None |
| Topic entry (singular legacy) | `/legacy/topic/:friendly/:id` | `/topic/:friendly/:id` | `/topics/entry/:friendlyUrl/:id` | `DRIFT` | singular -> plural + explicit `/entry` segment (`URL-DRIFT-001`); runtime: `tests/server/url-format-drift-runtime.test.js` |
| Arguments list | `/legacy/arguments` | `/arguments` | `/arguments` | `MATCH` | None |
| Arguments create | `/legacy/arguments/create` | `/arguments/create` | `/arguments/create` | `MATCH` | None |
| Argument entry (singular legacy) | `/legacy/argument/:friendly/:id` | `/argument/:friendly/:id` | `/arguments/entry/:friendlyUrl/:id` | `DRIFT` | singular -> plural + explicit `/entry` segment (`URL-DRIFT-002`); runtime: `tests/server/url-format-drift-runtime.test.js` |
| Questions list | `/legacy/questions` | `/questions` | `/questions` | `MATCH` | None |
| Questions create | `/legacy/questions/create` | `/questions/create` | `/questions/create` | `MATCH` | None |
| Question entry (singular legacy) | `/legacy/question/:friendly/:id` | `/question/:friendly/:id` | `/questions/entry/:friendlyUrl/:id` | `DRIFT` | singular -> plural + explicit `/entry` segment (`URL-DRIFT-003`); runtime: `tests/server/url-format-drift-runtime.test.js` |
| Answers list | `/legacy/answers` | `/answers` | `/answers` | `MATCH` | None |
| Answers create | `/legacy/answers/create` | `/answers/create` | `/answers/create` | `MATCH` | None |
| Answer entry (singular legacy) | `/legacy/answer/:friendly/:id` | `/answer/:friendly/:id` | `/answers/entry/:id` | `DRIFT` | modern drops friendly segment in canonical answer entry (`URL-DRIFT-004`); runtime: `tests/server/url-format-drift-runtime.test.js` |
| Issues list | `/legacy/issues` | `/issues` | `/issues` | `MATCH` | None |
| Issues create | `/legacy/issues/create` | `/issues/create` | `/issues/create` | `MATCH` | None |
| Issue entry (singular legacy) | `/legacy/issue/:friendly/:id` | `/issue/:friendly/:id` | `/issues/entry/:friendlyUrl/:id` | `DRIFT` | singular -> plural + explicit `/entry` segment (`URL-DRIFT-005`); runtime: `tests/server/url-format-drift-runtime.test.js` |
| Opinions list | `/legacy/opinions` | `/opinions` | `/opinions` | `MATCH` | None |
| Opinions create | `/legacy/opinions/create` | `/opinions/create` | `/opinions/create` | `MATCH` | None |
| Opinion entry (singular legacy) | `/legacy/opinion/:friendly/:id` | `/opinion/:friendly/:id` | `/opinions/entry/:friendlyUrl/:id` | `DRIFT` | singular -> plural + explicit `/entry` segment (`URL-DRIFT-006`); runtime: `tests/server/url-format-drift-runtime.test.js` |
| Artifacts list | `/legacy/artifacts` | `/artifacts` | `/artifacts` | `MATCH` | None |
| Artifacts create | `/legacy/artifacts/create` | `/artifacts/create` | `/artifacts/create` | `MATCH` | None |
| Artifact entry (singular legacy) | `/legacy/artifact/:friendly/:id` | `/artifact/:friendly/:id` | `/artifacts/entry/:friendlyUrl/:id` | `DRIFT` | singular -> plural + explicit `/entry` segment (`URL-DRIFT-007`); runtime: `tests/server/url-format-drift-runtime.test.js` |
| Groups list | `/legacy/groups` | `/groups` | `/groups` | `MATCH` | None |
| Group entry | `/legacy/groups/:friendly/:id` | `/groups/:friendly/:id` | `/groups/:friendlyUrl/:id` | `MATCH` | param name differs, format equivalent |
| Group posts | `/legacy/groups/:friendly/:id/posts` | `/groups/:friendly/:id/posts` | `/groups/:friendlyUrl/:id/posts` | `MATCH` | param name differs, format equivalent |
| Group members | `/legacy/groups/:friendly/:id/members` | `/groups/:friendly/:id/members` | `/groups/:friendlyUrl/:id/members` | `MATCH` | param name differs, format equivalent |
| Members list | `/legacy/members` | `/members` | `/members` | `MATCH` | None |
| Member profile | `/legacy/members/:username` | `/members/:username` | `/members/:username` | `MATCH` | None |
| Member journal (legacy diary path) | `/legacy/members/:username/diary` | `/members/:username/diary` | `/members/:username/journal` | `DRIFT` | canonical route renamed to journal; diary path retained as compatibility alias (`URL-DRIFT-010`); runtime: `tests/server/url-format-drift-runtime.test.js` |
| Member contributions | `/legacy/members/:username/contributions` | `/members/:username/contributions` | `/members/:username/contributions` | `MATCH` | None |
| Login | `/legacy/login` | `/login` | `/login` | `MATCH` | None |
| Signup | `/legacy/signup` | `/signup` | `/signup` | `MATCH` | None |
| Forgot password | `/legacy/login/forgot` | `/login/forgot` | `/forgot-password` | `DRIFT` | path renamed (`URL-DRIFT-008`); runtime: `tests/server/url-format-drift-runtime.test.js` |
| Reset password token route | `/legacy/login/reset/:email/:token` | `/login/reset/:email/:token` | `/reset-password?email=:email&token=:token` | `DRIFT` | path params -> query params (`URL-DRIFT-009`); runtime: `tests/server/url-format-drift-runtime.test.js` |
| Account settings | `/legacy/account/settings` | `/account/settings` | `/account/settings` | `MATCH` | None |
| Legacy related flow | `/legacy/related?...` | `/related?...` | dynamic modern entry or `/explore` | `ALIAS` | query-driven redirect router; runtime: `tests/server/url-format-drift-runtime.test.js` |
| Legacy verdict update flow | `/legacy/verdict/update?...` | `/verdict/update?...` | `/admin/verdicts/:id?type=...` | `ALIAS` | modernized admin route contract; runtime: `tests/server/url-format-drift-runtime.test.js` |
| Legacy outline create flow | `/legacy/outline/create?...` | `/outline/create?...` | `/outline/link?...` (or `/create`) | `ALIAS` | modern flow split; runtime: `tests/server/url-format-drift-runtime.test.js` |
| Legacy topic-link edit flow | `/legacy/topics/link/edit?id=:id` | `/topics/link/edit?id=:id` | `/topics/entry/:id?topicLink=:id&mode=edit-link` | `ALIAS` | link-edit normalized to entry context; runtime: `tests/server/url-format-drift-runtime.test.js` |
| Legacy argument-link edit flow | `/legacy/arguments/link/edit?id=:id` | `/arguments/link/edit?id=:id` | `/arguments/entry/:id?argumentLink=:id&mode=edit-link` | `ALIAS` | link-edit normalized to entry context; runtime: `tests/server/url-format-drift-runtime.test.js` |
| Create wizard | N/A | N/A | `/create` | `MODERN_ONLY` | intentional enhancement |
| Notifications | N/A | N/A | `/notifications` | `MODERN_ONLY` | intentional enhancement |
| Timeline | N/A | N/A | `/timeline` | `MODERN_ONLY` | intentional enhancement |
| Admin audit timeline | N/A | N/A | `/admin/audit` | `MODERN_ONLY` | intentional enhancement |
| Admin moderation signals | N/A | N/A | `/admin/moderation/signals` | `MODERN_ONLY` | intentional enhancement |

## Drift Approval Register

All `DRIFT` rows require explicit approval entries here.

| Approval ID | Area | Legacy normalized path | Modern canonical path | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `URL-DRIFT-001` | Topic entry (singular legacy) | `/topic/:friendly/:id` | `/topics/entry/:friendlyUrl/:id` | `APPROVED` | Modern plural + `/entry` convention adopted platform-wide for core entries. |
| `URL-DRIFT-002` | Argument entry (singular legacy) | `/argument/:friendly/:id` | `/arguments/entry/:friendlyUrl/:id` | `APPROVED` | Matches modern canonical entry convention. |
| `URL-DRIFT-003` | Question entry (singular legacy) | `/question/:friendly/:id` | `/questions/entry/:friendlyUrl/:id` | `APPROVED` | Matches modern canonical entry convention. |
| `URL-DRIFT-004` | Answer entry (singular legacy) | `/answer/:friendly/:id` | `/answers/entry/:id` | `APPROVED` | Temporary approved drift; candidate for future convergence if friendly slug support is standardized. |
| `URL-DRIFT-005` | Issue entry (singular legacy) | `/issue/:friendly/:id` | `/issues/entry/:friendlyUrl/:id` | `APPROVED` | Matches modern canonical entry convention. |
| `URL-DRIFT-006` | Opinion entry (singular legacy) | `/opinion/:friendly/:id` | `/opinions/entry/:friendlyUrl/:id` | `APPROVED` | Matches modern canonical entry convention. |
| `URL-DRIFT-007` | Artifact entry (singular legacy) | `/artifact/:friendly/:id` | `/artifacts/entry/:friendlyUrl/:id` | `APPROVED` | Matches modern canonical entry convention. |
| `URL-DRIFT-008` | Forgot password | `/login/forgot` | `/forgot-password` | `APPROVED` | Explicit auth-route rename for clearer modern UX semantics. |
| `URL-DRIFT-009` | Reset password token route | `/login/reset/:email/:token` | `/reset-password?email=:email&token=:token` | `APPROVED` | Query-based token handoff chosen for SPA navigation simplicity. |
| `URL-DRIFT-010` | Member journal (legacy diary path) | `/members/:username/diary` | `/members/:username/journal` | `APPROVED` | Product terminology migrated to journal while preserving legacy diary URL alias compatibility. |

## Checklist

- [x] Define normalization rule that ignores `/legacy` prefix.
- [x] Build side-by-side URL format matrix with legacy normalized paths.
- [x] Classify each row as `MATCH`, `DRIFT`, `ALIAS`, or `MODERN_ONLY`.
- [x] Add explicit `URL-DRIFT-*` approval IDs and approval register entries for all current `DRIFT` rows.
- [x] Run runtime checks for all `DRIFT` and `ALIAS` rows using representative fixture IDs.
- [x] Record per-row runtime evidence links (test output/screenshots) directly in this matrix.
- [x] Add explicit product decisions for currently approved intentional drift rows.

## Follow-up Scope

After runtime verification, this document should be referenced as the URL-contract subsection in the broader parity audit plan.
