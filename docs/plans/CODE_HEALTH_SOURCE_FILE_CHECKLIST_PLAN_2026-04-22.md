# Code Health Source File Checklist Plan (2026-04-22)

Companion tracker for CODE_HEALTH_OPTIMIZATION_CHECKLIST_PLAN_2026-04-22.md.

## Baseline

- Total tracker rows: **136**
- Tracked strict-scope rows (`server/src/**`, `client/src/**`, `legacy/**`): **112**
- Non-strict supporting rows (`tests/**`): **24**
- Priority split: **P0=16**, **P1=53**, **P2=67**
- Strict-scope file inventory in repository (revalidated 2026-04-23):
  - `server/src`: **112** files
  - `client/src`: **346** files
  - `legacy`: **1032** files
  - strict-scope total: **1490** files
- Coverage gap: **1378** strict-scope files are not yet represented in this per-file checklist (including all `legacy/**` files).

Metrics columns:
- lint(E/W): ESLint error and warning count for the file
- ts-ignore: count of @ts-ignore
- ts-exp: count of @ts-expect-error
- any-like: count of any-like patterns
- cjs: count of module.exports and require(

## Revalidation Snapshot (2026-04-23)

- Table rows were rescanned against current HEAD and status flags were recalculated under strict-gate rules.
- Row status totals:
  - completed `[x]`: **39**
  - open `[ ]`: **97**
  - blocked `[!]`: **0**
- Tracked strict-scope rows: **15/112** pass strict zero gate; **97/112** fail strict gate.
- Non-strict supporting rows: **24/24** remain completed.
- Aggregate metrics for tracked strict-scope rows only:
  - `ts-ignore=0`, `ts-exp=2`, `any-like=482`, `cjs=348`
- Full repository totals for strict scope are tracked in [CODE_HEALTH_OPTIMIZATION_CHECKLIST_PLAN_2026-04-22.md](./CODE_HEALTH_OPTIMIZATION_CHECKLIST_PLAN_2026-04-22.md).

## Strict Gate Override (2026-04-23)

This tracker now enforces strict end-state rules for repository source files:

- Scope: `server/src/**`, `client/src/**`, `legacy/**`
- Required zeroes per file:
  - `ts-ignore = 0`
  - `ts-exp = 0`
  - `any-like = 0`
  - `cjs = 0`

Exception policy:

- No exceptions are allowed in the strict-gate scope above.
- any row marked `[x]` under older reduction policy is considered reopened if it violates strict zero requirements above.

## Completion Rules (Per File)

- Keep row unchecked until file meets applicable goals from its baseline metrics.
- If lint(E/W) > 0, file must be lint-clean or accepted by documented policy.
- Repository-source rows (`server/src/**`, `client/src/**`, `legacy/**`) must end at exact zero for `ts-ignore`, `ts-exp`, `any-like`, and `cjs`.
- `@ts-expect-error` is not an accepted steady-state replacement in repository source.
- Mark `Status` using:
  - `[ ]` not started
  - `[-]` in progress
  - `[x]` completed and validated
  - `[!]` blocked (with reason in `Evidence`)
- Do not mark `[x]` unless lint/type/tests affected by the file pass and proof is recorded in `Evidence` (PR/commit + command snippet).

## P0 Files

| Status | ID | File | LOC | lint(E/W) | ts-ignore | ts-exp | any-like | cjs | Evidence |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [x] | P0-001 | `tests/server/helpers/readBackendSource.js` | 56 | 1/0 | 0 | 0 | 0 | 3 | cebaba5: ts-ignore=0; cjs=3 (tests, allowed) |
| [x] | P0-002 | `client/src/pages/Admin/common/AdminListPage.tsx` | 345 | 1/0 | 0 | 0 | 0 | 0 | previous Pass-1: ts-ignore=0 |
| [-] | P0-003 | `server/src/utils/flowUtils.ts` | 2961 | 0/0 | 0 | 0 | 101 | 14 | 97c4674: 242→155; further leaf typing in 70a632e/a84394a/557854e/b1d8a29/5525a7e/e09f6d3 reduced any 155→101 (clipboard/owner-query/verdict/session helpers + set{Group,Artifact,Question,Answer,Issue,Opinion,ArgumentLink,Argument,TopicLink}Model fully typed); remaining ~101 anys concentrated in setEntryParents inner callbacks, setTopicModels/setEntryModels/getTopics/getArguments mongoose lean-doc handlers — pending holistic mongoose typing |
| [-] | P0-004 | `server/src/controllers/api/home.ts` | 228 | 0/0 | 0 | 0 | 0 | 6 | 6466790: any 2→0; cjs=6 (tier-2 boot interop) |
| [x] | P0-005 | `server/src/controllers/api/members.ts` | 839 | 0/0 | 0 | 0 | 0 | 5 | 1a10246: any 28→0 (jwt/withFriendlyUrl/canViewProfile/PrivateEntries/app.config typed); cjs=5 (tier-2) |
| [x] | P0-006 | `server/src/controllers/api/answers.ts` | 243 | 0/0 | 0 | 0 | 0 | 7 | d2437a4: any 14→0 (AnswersServiceContract); cjs=7 (tier-2) |
| [x] | P0-007 | `server/src/controllers/api/artifacts.ts` | 272 | 0/0 | 0 | 0 | 0 | 6 | d7071bb: any 17→0 (ArtifactsServiceContract+canEditEntry+POST/PUT); cjs=6 (tier-2) |
| [x] | P0-008 | `server/src/controllers/api/opinions.ts` | 361 | 0/0 | 0 | 0 | 0 | 9 | d7071bb: any 15→0 (OpinionsServiceContract+canEditEntry+POST/PUT); cjs=9 (tier-2) |
| [x] | P0-009 | `server/src/controllers/api/issues.ts` | 274 | 0/0 | 0 | 0 | 0 | 9 | d7071bb: any 13→0 (IssuesServiceContract+canEditEntry+POST/PUT); cjs=9 (tier-2) |
| [x] | P0-010 | `server/src/controllers/api/groups.ts` | 512 | 0/0 | 0 | 0 | 0 | 4 | 13b3cd3: any 24→0 (GroupLike/UserLike/GroupMemberLike helpers); cjs=4 (tier-2) |
| [ ] | P0-011 | `server/src/app.ts` | 235 | 0/0 | 0 | 0 | 7 | 34 | e378bbb: ts-ignore=0; cjs=34 (tier-2) |
| [ ] | P0-012 | `server/src/models/schema/models.ts` | 44 | 0/0 | 0 | 0 | 2 | 34 | e378bbb: ts-ignore=0; cjs=34 (tier-2 boot interop) |
| [ ] | P0-013 | `server/src/controllers/api/index.ts` | 86 | 0/0 | 0 | 0 | 0 | 25 | a2c4005: ts-ignore=0; cjs=25 (tier-2) |
| [ ] | P0-014 | `server/src/controllers/api/admin.ts` | 1066 | 0/0 | 0 | 0 | 0 | 8 | a2c4005: ts-ignore=0; cjs=8 (tier-2) |
| [-] | P0-015 | `server/src/controllers/api/moderation.ts` | 1477 | 0/0 | 0 | 0 | 1 | 6 | 8ff4b8f: any 4→1 (toModerationEntry/buildVoteSummary typed); residual `getDbModelByObjectType(): any` accepted (mongoose chained .findById/.find/.create); cjs=6 (tier-2) |
| [ ] | P0-016 | `server/src/controllers/api/auth.ts` | 1480 | 0/0 | 0 | 0 | 0 | 5 | a2c4005: ts-ignore=0; cjs=5 (tier-2) |

## P1 Files

| Status | ID | File | LOC | lint(E/W) | ts-ignore | ts-exp | any-like | cjs | Evidence |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [ ] | P1-001 | `server/src/models/schema/account/User.ts` | 110 | 0/0 | 0 | 0 | 9 | 3 | be9c762: ts-ignore=0; cjs=3 (tier-2 boot interop) |
| [ ] | P1-002 | `server/src/models/schema/core/Artifact.ts` | 139 | 0/0 | 0 | 0 | 9 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [ ] | P1-003 | `server/src/controllers/app.ts` | 19 | 0/0 | 0 | 0 | 1 | 2 | e378bbb: ts-ignore=0; cjs=2 (tier-2) |
| [ ] | P1-004 | `server/src/models/schema/account/Admin.ts` | 69 | 0/0 | 0 | 0 | 2 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P1-005 | `server/src/models/schema/core/Answer.ts` | 81 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [ ] | P1-006 | `server/src/models/schema/core/Argument.ts` | 106 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [ ] | P1-007 | `server/src/models/schema/core/ArgumentLink.ts` | 65 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [ ] | P1-008 | `server/src/models/schema/core/Group.ts` | 46 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [ ] | P1-009 | `server/src/models/schema/core/Issue.ts` | 69 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [ ] | P1-010 | `server/src/models/schema/core/Opinion.ts` | 75 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [ ] | P1-011 | `server/src/models/schema/core/Question.ts` | 83 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [ ] | P1-012 | `server/src/models/schema/core/Topic.ts` | 142 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [ ] | P1-013 | `server/src/models/schema/core/TopicLink.ts` | 62 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [ ] | P1-014 | `server/src/middlewares/passport.ts` | 260 | 0/0 | 0 | 0 | 0 | 9 | a2c4005: ts-ignore=0; cjs=9 (tier-2) |
| [-] | P1-015 | `server/src/controllers/api/topics.ts` | 538 | 0/0 | 0 | 0 | 5 | 5 | 97c4674: any 29→5 (enrichCategory cb typed; remaining TopicScreeningModel index sig + nested any tied to flowUtils Tier-2); cjs=5 (tier-2) |
| [ ] | P1-016 | `server/src/models/schema/account/Account.ts` | 50 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P1-017 | `server/src/models/schema/account/AccountCategory.ts` | 20 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P1-018 | `server/src/models/schema/account/AdminGroup.ts` | 19 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P1-019 | `server/src/models/schema/account/Status.ts` | 20 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P1-020 | `server/src/models/schema/core/Category.ts` | 23 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P1-021 | `server/src/models/schema/core/Definition.ts` | 24 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P1-022 | `server/src/models/schema/core/Meaning.ts` | 24 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P1-023 | `server/src/models/schema/core/ObjectLink.ts` | 24 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P1-024 | `server/src/models/schema/core/Page.ts` | 38 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P1-025 | `server/src/models/schema/core/TrustedClient.ts` | 21 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P1-026 | `server/src/models/schema/core/Word.ts` | 24 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-027 | `tests/server/session-csrf-policy.test.js` | 108 | 0/0 | 0 | 0 | 0 | 7 | a2c4005: ts-ignore=0; cjs=7 (tests, allowed) |
| [ ] | P1-028 | `server/src/server.ts` | 89 | 0/0 | 0 | 0 | 7 | 6 | a2c4005: ts-ignore=0; cjs=6 |
| [-] | P1-029 | `server/src/controllers/api/arguments.ts` | 355 | 0/0 | 0 | 0 | 1 | 6 | 6466790: any 5→1 (forEach cbs typed; residual `db.models as any` deferred to DbModelsModule contract widening); cjs=6 (tier-2) |
| [-] | P1-030 | `server/src/controllers/api/questions.ts` | 328 | 0/0 | 0 | 0 | 1 | 6 | 6466790: any 5→1 (forEach cbs typed; residual `db.models as any` deferred to DbModelsModule contract widening); cjs=6 (tier-2) |
| [ ] | P1-031 | `server/src/middlewares/locals.ts` | 113 | 0/0 | 0 | 0 | 0 | 6 | a2c4005: ts-ignore=0; cjs=6 (tier-2) |
| [x] | P1-032 | `tests/server/mobile-api-contracts.test.js` | 80 | 0/0 | 0 | 0 | 0 | 6 | a2c4005: ts-ignore=0; cjs=6 (tests, allowed) |
| [ ] | P1-033 | `server/src/services/topicsService.ts` | 66 | 0/0 | 0 | 0 | 0 | 5 | a2c4005: ts-ignore=0; cjs=5 (tier-2 boot interop) |
| [x] | P1-034 | `tests/server/request-context.test.js` | 69 | 0/0 | 0 | 0 | 0 | 5 | a2c4005: ts-ignore=0; cjs=5 (tests, allowed) |
| [x] | P1-035 | `tests/server/url-format-drift-runtime.test.js` | 205 | 0/0 | 0 | 0 | 0 | 5 | a2c4005: ts-ignore=0; cjs=5 (tests, allowed) |
| [ ] | P1-036 | `client/src/pages/VisualizePage.tsx` | 782 | 0/9 | 0 | 0 | 9 | 0 | a2c4005: ts-ignore=0; lint warnings=17 (policy-accepted) |
| [ ] | P1-037 | `server/src/models/questionnaire/contributor-applicant.ts` | 38 | 0/0 | 0 | 0 | 0 | 1 | e378bbb: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P1-038 | `server/src/models/questionnaire/reviewer-applicant.ts` | 38 | 0/0 | 0 | 0 | 0 | 1 | e378bbb: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-039 | `server/src/models/schema/account/LoginAttempt.ts` | 18 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [x] | P1-040 | `server/src/models/schema/account/Note.ts` | 21 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [x] | P1-041 | `server/src/models/schema/account/StatusLog.ts` | 19 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [x] | P1-042 | `server/src/models/schema/core/Reaction.ts` | 25 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [x] | P1-043 | `tests/server/api-error-envelope.test.js` | 92 | 0/1 | 0 | 0 | 0 | 3 | a2c4005: ts-ignore=0; cjs=3 (tests, allowed); lint warnings=1 (policy-accepted) |
| [x] | P1-044 | `tests/server/admin-db-backup-restore.test.ts` | 165 | 0/1 | 0 | 0 | 1 | 2 | a2c4005: ts-ignore=0; cjs=2 (tests, allowed); lint warnings=1 (policy-accepted) |
| [ ] | P1-045 | `client/src/context/AuthContext.test.tsx` | 130 | 0/6 | 0 | 0 | 6 | 0 | a2c4005: ts-ignore=0; lint warnings=6 (policy-accepted) |
| [x] | P1-046 | `tests/server/auth-recaptcha-role-switch.test.ts` | 156 | 0/1 | 0 | 0 | 1 | 1 | a2c4005: ts-ignore=0; cjs=1 (tests, allowed); lint warnings=1 (policy-accepted) |
| [x] | P1-047 | `tests/server/auth-social-session-callbacks.test.ts` | 114 | 0/1 | 0 | 0 | 1 | 1 | a2c4005: ts-ignore=0; cjs=1 (tests, allowed); lint warnings=1 (policy-accepted) |
| [x] | P1-048 | `tests/server/outline-api.test.ts` | 149 | 0/1 | 0 | 0 | 1 | 1 | a2c4005: ts-ignore=0; cjs=1 (tests, allowed); lint warnings=1 (policy-accepted) |
| [ ] | P1-049 | `client/src/components/Entry/EntryActionsMenu.tsx` | 491 | 0/3 | 0 | 0 | 3 | 0 | 9e8dee2: ts-ignore=0; lint warnings=3 (policy-accepted) |
| [ ] | P1-050 | `client/src/pages/Admin/Users/UserDetails.tsx` | 177 | 0/2 | 0 | 0 | 2 | 0 | a2c4005: ts-ignore=0; lint warnings=2 (policy-accepted) |
| [ ] | P1-051 | `client/src/pages/Admin/Verdicts/VerdictsPage.tsx` | 580 | 0/2 | 0 | 0 | 2 | 0 | a2c4005: ts-ignore=0; lint warnings=2 (policy-accepted) |
| [x] | P1-052 | `client/src/services/api.ts` | 720 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0 |
| [ ] | P1-053 | `client/src/pages/ClipboardFlow.integration.test.tsx` | 94 | 0/1 | 0 | 0 | 1 | 0 | a2c4005: ts-ignore=0; lint warnings=1 (policy-accepted) |

## P2 Files

| Status | ID | File | LOC | lint(E/W) | ts-ignore | ts-exp | any-like | cjs | Evidence |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [-] | P2-001 | `server/src/controllers/api/search.ts` | 274 | 0/0 | 0 | 0 | 1 | 4 | 9d85760+6466790: any 10→1 (forEach/map cbs typed; residual `db.models as any` deferred); cjs=4 (tier-2) |
| [ ] | P2-002 | `server/src/controllers/api/outline.ts` | 349 | 0/0 | 0 | 0 | 4 | 4 | a2c4005: ts-ignore=0; cjs=4 (tier-2) |
| [ ] | P2-003 | `server/src/services/entryEventsService.ts` | 158 | 0/0 | 0 | 0 | 2 | 4 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [x] | P2-004 | `tests/server/moderation-ownership-migration.test.js` | 196 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tests, allowed) |
| [ ] | P2-005 | `server/src/controllers/api/reactions.ts` | 447 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tier-2) |
| [ ] | P2-006 | `server/src/services/answersService.ts` | 61 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [ ] | P2-007 | `server/src/services/argumentsService.ts` | 67 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [ ] | P2-008 | `server/src/services/artifactsService.ts` | 61 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [ ] | P2-009 | `server/src/services/issuesService.ts` | 64 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [ ] | P2-010 | `server/src/services/opinionsService.ts` | 61 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [ ] | P2-011 | `server/src/services/questionsService.ts` | 61 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [x] | P2-012 | `tests/server/app-shell.test.js` | 103 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tests, allowed) |
| [x] | P2-013 | `tests/server/monitoring-endpoint-guardrails.test.js` | 79 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tests, allowed) |
| [x] | P2-014 | `tests/server/request-validation.test.js` | 58 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tests, allowed) |
| [x] | P2-015 | `tests/server/route-contracts.test.js` | 68 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tests, allowed) |
| [ ] | P2-016 | `server/src/services/notificationsService.ts` | 272 | 0/0 | 0 | 0 | 3 | 3 | a2c4005: ts-ignore=0; cjs=3 (tier-2 boot interop) |
| [ ] | P2-017 | `server/src/controllers/api/monitoring.ts` | 219 | 0/0 | 0 | 0 | 0 | 3 | a2c4005: ts-ignore=0; cjs=3 (tier-2) |
| [ ] | P2-018 | `server/src/controllers/api/notifications.ts` | 175 | 0/0 | 0 | 0 | 0 | 3 | a2c4005: ts-ignore=0; cjs=3 (tier-2) |
| [ ] | P2-019 | `server/src/controllers/api/timeline.ts` | 88 | 0/0 | 0 | 0 | 0 | 3 | a2c4005: ts-ignore=0; cjs=3 (tier-2) |
| [ ] | P2-020 | `server/src/middlewares/requestContext.ts` | 87 | 0/0 | 0 | 0 | 0 | 3 | a2c4005: ts-ignore=0; cjs=3 (tier-2) |
| [ ] | P2-021 | `server/src/utils/mongoose.ts` | 38 | 0/0 | 0 | 0 | 0 | 3 | a2c4005: ts-ignore=0; cjs=3 (tier-2 boot interop) |
| [ ] | P2-022 | `server/src/utils/sendmail/index.ts` | 122 | 0/0 | 0 | 0 | 0 | 3 | a2c4005: ts-ignore=0; cjs=3 (tier-2 boot interop) |
| [x] | P2-023 | `tests/server/route-regression.test.js` | 45 | 0/0 | 0 | 0 | 0 | 3 | c8fdd75: ts-ignore=0; cjs=3 (tests, allowed) |
| [ ] | P2-024 | `client/src/utils/analytics.test.ts` | 49 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (client/src strict-scope row) |
| [ ] | P2-025 | `server/src/controllers/api/contact.ts` | 146 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tier-2) |
| [ ] | P2-026 | `server/src/controllers/api/realtime.ts` | 61 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tier-2) |
| [ ] | P2-027 | `server/src/controllers/api/v1.ts` | 11 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tier-2) |
| [ ] | P2-028 | `server/src/middlewares/apiError.ts` | 209 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tier-2) |
| [ ] | P2-029 | `server/src/middlewares/routes.ts` | 440 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tier-2) |
| [ ] | P2-030 | `server/src/models/schema/plugins/pagedFind.ts` | 120 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [ ] | P2-031 | `server/src/utils/workflow/index.ts` | 44 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P2-032 | `tests/server/api-endpoints-smoke.test.js` | 200 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tests, allowed) |
| [x] | P2-033 | `tests/server/children-count-guardrails.test.js` | 53 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tests, allowed) |
| [x] | P2-034 | `tests/server/legacy-client-security.test.js` | 18 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tests, allowed) |
| [x] | P2-035 | `tests/server/openapi-contract.test.js` | 130 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tests, allowed) |
| [x] | P2-036 | `tests/server/url-format-drift-approvals.test.js` | 121 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tests, allowed) |
| [ ] | P2-037 | `server/src/models/constants.ts` | 427 | 0/0 | 0 | 0 | 3 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P2-038 | `server/src/models/applications.ts` | 100 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P2-039 | `server/src/controllers/api/viewFilter.ts` | 45 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2) |
| [ ] | P2-040 | `server/src/models/paths.ts` | 109 | 0/0 | 0 | 0 | 1 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-041 | `server/src/models/schema/core/Appeal.ts` | 39 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [x] | P2-042 | `server/src/models/schema/core/EntryEvent.ts` | 32 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [x] | P2-043 | `server/src/models/schema/core/Notification.ts` | 27 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [x] | P2-044 | `server/src/models/schema/core/ReaderSignal.ts` | 39 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [x] | P2-045 | `server/src/models/schema/core/Subscription.ts` | 28 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [x] | P2-046 | `server/src/models/schema/core/VerdictVote.ts` | 26 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [ ] | P2-047 | `client/src/components/common/ErrorBoundary.test.tsx` | 54 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (client/src strict-scope row) |
| [ ] | P2-048 | `client/src/components/common/GeoPatternBackground.test.tsx` | 51 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (client/src strict-scope row) |
| [ ] | P2-049 | `server/src/config/config.js` | 282 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P2-050 | `server/src/middlewares/mobileApiContracts.ts` | 195 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2) |
| [ ] | P2-051 | `server/src/middlewares/requestValidation.ts` | 97 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2) |
| [ ] | P2-052 | `server/src/models/contents.ts` | 18 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P2-053 | `server/src/models/templates.ts` | 104 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P2-054 | `server/src/services/childrenCountGuardrails.ts` | 119 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P2-055 | `server/src/services/realtimeEvents.ts` | 46 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P2-056 | `server/src/utils/httpClient.ts` | 50 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P2-057 | `server/src/utils/logger.ts` | 41 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P2-058 | `server/src/utils/slugify/index.ts` | 6 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [ ] | P2-059 | `server/src/utils/utils.ts` | 98 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-060 | `tests/server/csp-config-smoke.test.js` | 22 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tests, allowed) |
| [x] | P2-061 | `tests/server/parity-checklist.test.js` | 75 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tests, allowed) |
| [x] | P2-062 | `tests/server/realtime-events-smoke.test.js` | 26 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tests, allowed) |
| [ ] | P2-063 | `client/src/utils/analytics.ts` | 53 | 0/0 | 0 | 0 | 1 | 0 | a2c4005: ts-ignore=0 |
| [x] | P2-064 | `client/src/pages/ClipboardPage.tsx` | 312 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0 |
| [x] | P2-065 | `client/src/services/api.test.ts` | 82 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0 |
| [x] | P2-066 | `client/src/services/api/admin.test.ts` | 96 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0 |
| [ ] | P2-067 | `client/src/utils/performance.test.ts` | 26 | 0/0 | 0 | 2 | 0 | 0 | a2c4005: ts-ignore=0 |

## Revalidation Summary (2026-04-23)

- This tracker is no longer in completion state under strict-gate rules.
- Live rescan reopened strict-scope rows that still contain `ts-ignore`, `ts-exp`, `any-like`, or `cjs`.
- Current row-level state:
  - strict-scope tracked rows: `15/112` complete
  - strict-scope tracked rows: `97/112` open
  - non-strict support rows (`tests/**`): `24/24` complete
- Validation status during revalidation:
  - `npm run lint`: pass (0 errors, 51 warnings)
  - `npm run type:check`: pass
  - `npm run ci:smoke`: pass
  - `npm run build:server`: pass
  - `npm run build:client:dev`: pass
  - `npm run test:server`: fail (timeout in `tests/server/url-format-drift-runtime.test.js`)
  - `npm run test:client`: fail (timeouts in `TopicCreatePage.integration` and `OutlineLinkPage`)

### Verification commands (2026-04-23)

- `bash scripts/type-metrics.sh`
- `npm run lint`
- `npm run type:check`
- `npm run ci:smoke`
- `npm run build:server`
- `npm run build:client:dev`
- `npm run test:server`
- `npm run test:client`

This file remains a live execution tracker. Do not move related code-health plans
to `docs/plans/completed/` until strict-scope zero gates are satisfied and full
validation suites are green.
