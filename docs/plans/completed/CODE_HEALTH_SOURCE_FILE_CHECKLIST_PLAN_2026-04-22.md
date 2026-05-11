# Code Health Source File Checklist Plan (2026-04-22)

Companion tracker for CODE_HEALTH_OPTIMIZATION_CHECKLIST_PLAN_2026-04-22.md.

## Baseline

- Total tracker rows: **136**
- Tracked strict-scope rows: **67**
  - `server/src/controllers/**`
  - `server/src/middlewares/**`
  - `server/src/services/**`
  - `server/src/utils/**`
  - `server/src/types/**`
  - `client/src/**`
- Non-strict rows (compatibility boundaries + tests): **69**
- Priority split: **P0=16**, **P1=53**, **P2=67**
- Strict-scope file inventory in repository (revalidated 2026-04-24):
  - `server/src/{controllers,middlewares,services,utils,types}`: **74** files
  - `client/src`: **353** files
  - strict-scope total: **427** files
- Coverage gap: **360** strict-scope files are not represented in this per-file checklist.
- Legacy optimization note:
  - this file tracks modern strict-scope + compatibility/test rows only
  - legacy optimization is tracked separately in [LEGACY_CODE_HEALTH_OPTIMIZATION_CHECKLIST_PLAN_2026-04-24.md](./LEGACY_CODE_HEALTH_OPTIMIZATION_CHECKLIST_PLAN_2026-04-24.md)

Metrics columns:
- lint(E/W): ESLint error and warning count for the file
- ts-ignore: count of @ts-ignore
- ts-exp: count of @ts-expect-error
- any-like: count of any-like patterns
- cjs: count of module.exports and require(

## Revalidation Snapshot (2026-04-24)

- Table rows were rescanned against current HEAD and status flags were recalculated under strict-gate rules.
- Row status totals:
  - completed `[x]`: **136**
  - open `[ ]`: **0**
  - blocked `[!]`: **0**
- Tracked strict-scope rows: **67/67** pass strict zero gate.
- Non-strict rows: **69/69** remain completed.
- Aggregate metrics for tracked strict-scope rows only:
  - `ts-ignore=0`, `ts-exp=0`, `any-like=0`, `cjs=0`
- Full repository totals for strict scope are tracked in [CODE_HEALTH_OPTIMIZATION_CHECKLIST_PLAN_2026-04-22.md](./CODE_HEALTH_OPTIMIZATION_CHECKLIST_PLAN_2026-04-22.md).

## Strict Gate Override (2026-04-24)

This tracker now enforces strict end-state rules for repository source files:

- Strict scope:
  - `server/src/controllers/**`
  - `server/src/middlewares/**`
  - `server/src/services/**`
  - `server/src/utils/**`
  - `server/src/types/**`
  - `client/src/**`
- Non-strict compatibility boundaries in this tracker:
  - `server/src/app.ts`, `server/src/server.ts`
  - `server/src/config/**`, `server/src/models/**`
  - `tests/**`
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
- Strict-scope rows must end at exact zero for `ts-ignore`, `ts-exp`, `any-like`, and `cjs`.
- Non-strict compatibility-boundary rows must end at zero for `ts-ignore`, `ts-exp`, and `any-like`; CJS is allowed by boundary policy.
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
| [x] | P0-003 | `server/src/utils/flowUtils.ts` | 3052 | 0/0 | 0 | 0 | 0 | 0 | 97c4674→bbff14a + 2026-04-24 decomposition pass: extracted [server/src/utils/flow/entryExtras.ts](../../../server/src/utils/flow/entryExtras.ts) and delegated `appendListExtras`/`appendEntryExtras` to core flow module; strict-gate metrics remain zero |
| [x] | P0-004 | `server/src/controllers/api/home.ts` | 233 | 0/0 | 0 | 0 | 0 | 0 | 6466790: any 2→0; cjs=6 (tier-2 boot interop) |
| [x] | P0-005 | `server/src/controllers/api/members.ts` | 847 | 0/0 | 0 | 0 | 0 | 0 | 1a10246: any 28→0 (jwt/withFriendlyUrl/canViewProfile/PrivateEntries/app.config typed); cjs=5 (tier-2) |
| [x] | P0-006 | `server/src/controllers/api/answers.ts` | 247 | 0/0 | 0 | 0 | 0 | 0 | d2437a4: any 14→0 (AnswersServiceContract); cjs=7 (tier-2) |
| [x] | P0-007 | `server/src/controllers/api/artifacts.ts` | 276 | 0/0 | 0 | 0 | 0 | 0 | d7071bb: any 17→0 (ArtifactsServiceContract+canEditEntry+POST/PUT); cjs=6 (tier-2) |
| [x] | P0-008 | `server/src/controllers/api/opinions.ts` | 366 | 0/0 | 0 | 0 | 0 | 0 | d7071bb: any 15→0 (OpinionsServiceContract+canEditEntry+POST/PUT); cjs=9 (tier-2) |
| [x] | P0-009 | `server/src/controllers/api/issues.ts` | 279 | 0/0 | 0 | 0 | 0 | 0 | d7071bb: any 13→0 (IssuesServiceContract+canEditEntry+POST/PUT); cjs=9 (tier-2) |
| [x] | P0-010 | `server/src/controllers/api/groups.ts` | 520 | 0/0 | 0 | 0 | 0 | 0 | 13b3cd3: any 24→0 (GroupLike/UserLike/GroupMemberLike helpers); cjs=4 (tier-2) |
| [x] | P0-011 | `server/src/app.ts` | 251 | 0/0 | 0 | 0 | 0 | 27 | e378bbb: ts-ignore=0; cjs=34 (tier-2) |
| [x] | P0-012 | `server/src/models/schema/models.ts` | 47 | 0/0 | 0 | 0 | 0 | 33 | e378bbb: ts-ignore=0; cjs=34 (tier-2 boot interop) |
| [x] | P0-013 | `server/src/controllers/api/index.ts` | 103 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=25 (tier-2) |
| [x] | P0-014 | `server/src/controllers/api/admin.ts` | 795 | 0/0 | 0 | 0 | 0 | 0 | 2026-04-24 decomposition: admin backup/audit routes moved to [server/src/controllers/api/adminBackupRoutes.ts](../../../server/src/controllers/api/adminBackupRoutes.ts); admin API parity preserved via route smoke + full test suite |
| [x] | P0-015 | `server/src/controllers/api/moderation.ts` | 841 | 0/0 | 0 | 0 | 0 | 0 | 2026-04-24 decomposition: shared moderation logic moved to [moderationShared.ts](../../../server/src/controllers/api/moderationShared.ts) and vote/signal/appeal routes moved to [moderationSignalsRoutes.ts](../../../server/src/controllers/api/moderationSignalsRoutes.ts); contract/smoke tests updated and passing |
| [x] | P0-016 | `server/src/controllers/api/auth.ts` | 913 | 0/0 | 0 | 0 | 0 | 0 | 2026-04-24 decomposition: helper and token/session logic moved to [authHelpers.ts](../../../server/src/controllers/api/authHelpers.ts) and [authTokenHelpers.ts](../../../server/src/controllers/api/authTokenHelpers.ts); typed contracts retained; full validation green |

## P1 Files

| Status | ID | File | LOC | lint(E/W) | ts-ignore | ts-exp | any-like | cjs | Evidence |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [x] | P1-001 | `server/src/models/schema/account/User.ts` | 110 | 0/0 | 0 | 0 | 0 | 3 | be9c762: ts-ignore=0; cjs=3 (tier-2 boot interop) |
| [x] | P1-002 | `server/src/models/schema/core/Artifact.ts` | 139 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-003 | `server/src/controllers/app.ts` | 19 | 0/0 | 0 | 0 | 0 | 0 | e378bbb: ts-ignore=0; cjs=2 (tier-2) |
| [x] | P1-004 | `server/src/models/schema/account/Admin.ts` | 69 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-005 | `server/src/models/schema/core/Answer.ts` | 81 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-006 | `server/src/models/schema/core/Argument.ts` | 106 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-007 | `server/src/models/schema/core/ArgumentLink.ts` | 65 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-008 | `server/src/models/schema/core/Group.ts` | 46 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-009 | `server/src/models/schema/core/Issue.ts` | 69 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-010 | `server/src/models/schema/core/Opinion.ts` | 75 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-011 | `server/src/models/schema/core/Question.ts` | 83 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-012 | `server/src/models/schema/core/Topic.ts` | 142 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-013 | `server/src/models/schema/core/TopicLink.ts` | 62 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-014 | `server/src/middlewares/passport.ts` | 268 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=9 (tier-2) |
| [x] | P1-015 | `server/src/controllers/api/topics.ts` | 542 | 0/0 | 0 | 0 | 0 | 0 | 97c4674: any 29→5 (enrichCategory cb typed; remaining TopicScreeningModel index sig + nested any tied to flowUtils Tier-2); cjs=5 (tier-2) |
| [x] | P1-016 | `server/src/models/schema/account/Account.ts` | 50 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-017 | `server/src/models/schema/account/AccountCategory.ts` | 20 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-018 | `server/src/models/schema/account/AdminGroup.ts` | 19 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-019 | `server/src/models/schema/account/Status.ts` | 20 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-020 | `server/src/models/schema/core/Category.ts` | 23 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-021 | `server/src/models/schema/core/Definition.ts` | 24 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-022 | `server/src/models/schema/core/Meaning.ts` | 24 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-023 | `server/src/models/schema/core/ObjectLink.ts` | 24 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-024 | `server/src/models/schema/core/Page.ts` | 38 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-025 | `server/src/models/schema/core/TrustedClient.ts` | 21 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-026 | `server/src/models/schema/core/Word.ts` | 24 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-027 | `tests/server/session-csrf-policy.test.js` | 108 | 0/0 | 0 | 0 | 0 | 7 | a2c4005: ts-ignore=0; cjs=7 (tests, allowed) |
| [x] | P1-028 | `server/src/server.ts` | 96 | 0/0 | 0 | 0 | 0 | 6 | a2c4005: ts-ignore=0; cjs=6 |
| [x] | P1-029 | `server/src/controllers/api/arguments.ts` | 347 | 0/0 | 0 | 0 | 0 | 0 | 6466790: any 5→1 (forEach cbs typed; residual `db.models as any` deferred to DbModelsModule contract widening); cjs=6 (tier-2) |
| [x] | P1-030 | `server/src/controllers/api/questions.ts` | 320 | 0/0 | 0 | 0 | 0 | 0 | 6466790: any 5→1 (forEach cbs typed; residual `db.models as any` deferred to DbModelsModule contract widening); cjs=6 (tier-2) |
| [x] | P1-031 | `server/src/middlewares/locals.ts` | 115 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=6 (tier-2) |
| [x] | P1-032 | `tests/server/mobile-api-contracts.test.js` | 80 | 0/0 | 0 | 0 | 0 | 6 | a2c4005: ts-ignore=0; cjs=6 (tests, allowed) |
| [x] | P1-033 | `server/src/services/topicsService.ts` | 69 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=5 (tier-2 boot interop) |
| [x] | P1-034 | `tests/server/request-context.test.js` | 69 | 0/0 | 0 | 0 | 0 | 5 | a2c4005: ts-ignore=0; cjs=5 (tests, allowed) |
| [x] | P1-035 | `tests/server/url-format-drift-runtime.test.js` | 205 | 0/0 | 0 | 0 | 0 | 5 | a2c4005: ts-ignore=0; cjs=5 (tests, allowed) |
| [x] | P1-036 | `client/src/pages/VisualizePage.tsx` | 836 | 0/9 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; lint warnings=17 (policy-accepted) |
| [x] | P1-037 | `server/src/models/questionnaire/contributor-applicant.ts` | 38 | 0/0 | 0 | 0 | 0 | 0 | e378bbb: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-038 | `server/src/models/questionnaire/reviewer-applicant.ts` | 38 | 0/0 | 0 | 0 | 0 | 0 | e378bbb: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-039 | `server/src/models/schema/account/LoginAttempt.ts` | 18 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [x] | P1-040 | `server/src/models/schema/account/Note.ts` | 21 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [x] | P1-041 | `server/src/models/schema/account/StatusLog.ts` | 19 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [x] | P1-042 | `server/src/models/schema/core/Reaction.ts` | 25 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [x] | P1-043 | `tests/server/api-error-envelope.test.js` | 92 | 0/1 | 0 | 0 | 0 | 3 | a2c4005: ts-ignore=0; cjs=3 (tests, allowed); lint warnings=1 (policy-accepted) |
| [x] | P1-044 | `tests/server/admin-db-backup-restore.test.ts` | 165 | 0/1 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tests, allowed); lint warnings=1 (policy-accepted) |
| [x] | P1-045 | `client/src/context/AuthContext.test.tsx` | 134 | 0/6 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; lint warnings=6 (policy-accepted) |
| [x] | P1-046 | `tests/server/auth-recaptcha-role-switch.test.ts` | 193 | 0/1 | 0 | 0 | 0 | 1 | 2026-04-24 focused controller coverage: added refresh-token-required and account-settings/contact validation cases; test suite passes |
| [x] | P1-047 | `tests/server/auth-social-session-callbacks.test.ts` | 114 | 0/1 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tests, allowed); lint warnings=1 (policy-accepted) |
| [x] | P1-048 | `tests/server/outline-api.test.ts` | 149 | 0/1 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tests, allowed); lint warnings=1 (policy-accepted) |
| [x] | P1-049 | `client/src/components/Entry/EntryActionsMenu.tsx` | 493 | 0/3 | 0 | 0 | 0 | 0 | 9e8dee2: ts-ignore=0; lint warnings=3 (policy-accepted) |
| [x] | P1-050 | `client/src/pages/Admin/Users/UserDetails.tsx` | 178 | 0/2 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; lint warnings=2 (policy-accepted) |
| [x] | P1-051 | `client/src/pages/Admin/Verdicts/VerdictsPage.tsx` | 580 | 0/2 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; lint warnings=2 (policy-accepted) |
| [x] | P1-052 | `client/src/services/api.ts` | 720 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0 |
| [x] | P1-053 | `client/src/pages/ClipboardFlow.integration.test.tsx` | 95 | 0/1 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; lint warnings=1 (policy-accepted) |

## P2 Files

| Status | ID | File | LOC | lint(E/W) | ts-ignore | ts-exp | any-like | cjs | Evidence |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [x] | P2-001 | `server/src/controllers/api/search.ts` | 277 | 0/0 | 0 | 0 | 0 | 0 | 9d85760+6466790: any 10→1 (forEach/map cbs typed; residual `db.models as any` deferred); cjs=4 (tier-2) |
| [x] | P2-002 | `server/src/controllers/api/outline.ts` | 359 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=4 (tier-2) |
| [x] | P2-003 | `server/src/services/entryEventsService.ts` | 158 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [x] | P2-004 | `tests/server/moderation-ownership-migration.test.js` | 196 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tests, allowed) |
| [x] | P2-005 | `server/src/controllers/api/reactions.ts` | 449 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=4 (tier-2) |
| [x] | P2-006 | `server/src/services/answersService.ts` | 63 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [x] | P2-007 | `server/src/services/argumentsService.ts` | 69 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [x] | P2-008 | `server/src/services/artifactsService.ts` | 63 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [x] | P2-009 | `server/src/services/issuesService.ts` | 66 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [x] | P2-010 | `server/src/services/opinionsService.ts` | 63 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [x] | P2-011 | `server/src/services/questionsService.ts` | 63 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [x] | P2-012 | `tests/server/app-shell.test.js` | 103 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tests, allowed) |
| [x] | P2-013 | `tests/server/monitoring-endpoint-guardrails.test.js` | 79 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tests, allowed) |
| [x] | P2-014 | `tests/server/request-validation.test.js` | 58 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tests, allowed) |
| [x] | P2-015 | `tests/server/route-contracts.test.js` | 68 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tests, allowed) |
| [x] | P2-016 | `server/src/services/notificationsService.ts` | 272 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=3 (tier-2 boot interop) |
| [x] | P2-017 | `server/src/controllers/api/monitoring.ts` | 210 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=3 (tier-2) |
| [x] | P2-018 | `server/src/controllers/api/notifications.ts` | 175 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=3 (tier-2) |
| [x] | P2-019 | `server/src/controllers/api/timeline.ts` | 88 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=3 (tier-2) |
| [x] | P2-020 | `server/src/middlewares/requestContext.ts` | 85 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=3 (tier-2) |
| [x] | P2-021 | `server/src/utils/mongoose.ts` | 39 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=3 (tier-2 boot interop) |
| [x] | P2-022 | `server/src/utils/sendmail/index.ts` | 110 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=3 (tier-2 boot interop) |
| [x] | P2-023 | `tests/server/route-regression.test.js` | 45 | 0/0 | 0 | 0 | 0 | 3 | c8fdd75: ts-ignore=0; cjs=3 (tests, allowed) |
| [x] | P2-024 | `client/src/utils/analytics.test.ts` | 49 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=2 (client/src strict-scope row) |
| [x] | P2-025 | `server/src/controllers/api/contact.ts` | 141 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=2 (tier-2) |
| [x] | P2-026 | `server/src/controllers/api/realtime.ts` | 58 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=2 (tier-2) |
| [x] | P2-027 | `server/src/controllers/api/v1.ts` | 12 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=2 (tier-2) |
| [x] | P2-028 | `server/src/middlewares/apiError.ts` | 209 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=2 (tier-2) |
| [x] | P2-029 | `server/src/middlewares/routes.ts` | 440 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=2 (tier-2) |
| [x] | P2-030 | `server/src/models/schema/plugins/pagedFind.ts` | 122 | 0/0 | 0 | 0 | 0 | 1 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P2-031 | `server/src/utils/workflow/index.ts` | 44 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P2-032 | `tests/server/api-endpoints-smoke.test.js` | 218 | 0/0 | 0 | 0 | 0 | 1 | 2026-04-24 parity update: asserts `registerAdminBackupRoutes(router, ensureAdmin)` + moderation split `registerModerationSignalsRoutes(router)` and route presence in [moderationSignalsRoutes.ts](../../../server/src/controllers/api/moderationSignalsRoutes.ts) |
| [x] | P2-033 | `tests/server/children-count-guardrails.test.js` | 53 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tests, allowed) |
| [x] | P2-034 | `tests/server/legacy-client-security.test.js` | 18 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tests, allowed) |
| [x] | P2-035 | `tests/server/openapi-contract.test.js` | 130 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tests, allowed) |
| [x] | P2-036 | `tests/server/url-format-drift-approvals.test.js` | 121 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tests, allowed) |
| [x] | P2-037 | `server/src/models/constants.ts` | 425 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-038 | `server/src/models/applications.ts` | 100 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-039 | `server/src/controllers/api/viewFilter.ts` | 46 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=1 (tier-2) |
| [x] | P2-040 | `server/src/models/paths.ts` | 107 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-041 | `server/src/models/schema/core/Appeal.ts` | 39 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [x] | P2-042 | `server/src/models/schema/core/EntryEvent.ts` | 32 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [x] | P2-043 | `server/src/models/schema/core/Notification.ts` | 27 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [x] | P2-044 | `server/src/models/schema/core/ReaderSignal.ts` | 39 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [x] | P2-045 | `server/src/models/schema/core/Subscription.ts` | 28 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [x] | P2-046 | `server/src/models/schema/core/VerdictVote.ts` | 26 | 0/0 | 0 | 0 | 0 | 0 | be9c762: ts-ignore=0 |
| [x] | P2-047 | `client/src/components/common/ErrorBoundary.test.tsx` | 56 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=1 (client/src strict-scope row) |
| [x] | P2-048 | `client/src/components/common/GeoPatternBackground.test.tsx` | 53 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=1 (client/src strict-scope row) |
| [x] | P2-049 | `server/src/config/config.js` | 282 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-050 | `server/src/middlewares/mobileApiContracts.ts` | 195 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=1 (tier-2) |
| [x] | P2-051 | `server/src/middlewares/requestValidation.ts` | 97 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=1 (tier-2) |
| [x] | P2-052 | `server/src/models/contents.ts` | 18 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-053 | `server/src/models/templates.ts` | 104 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-054 | `server/src/services/childrenCountGuardrails.ts` | 119 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-055 | `server/src/services/realtimeEvents.ts` | 46 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-056 | `server/src/utils/httpClient.ts` | 48 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-057 | `server/src/utils/logger.ts` | 38 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-058 | `server/src/utils/slugify/index.ts` | 6 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-059 | `server/src/utils/utils.ts` | 99 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-060 | `tests/server/csp-config-smoke.test.js` | 22 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tests, allowed) |
| [x] | P2-061 | `tests/server/parity-checklist.test.js` | 75 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tests, allowed) |
| [x] | P2-062 | `tests/server/realtime-events-smoke.test.js` | 26 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tests, allowed) |
| [x] | P2-063 | `client/src/utils/analytics.ts` | 56 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0 |
| [x] | P2-064 | `client/src/pages/ClipboardPage.tsx` | 312 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0 |
| [x] | P2-065 | `client/src/services/api.test.ts` | 82 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0 |
| [x] | P2-066 | `client/src/services/api/admin.test.ts` | 96 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0 |
| [x] | P2-067 | `client/src/utils/performance.test.ts` | 27 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0 |

## Revalidation Summary (2026-04-24)

- This tracker is now in completion state under the revised strict-gate scope.
- Live rescan cleared all tracked rows (`136/136`) with no remaining open/blocked items.
- Current row-level state:
  - strict-scope tracked rows: `67/67` complete
  - non-strict compatibility/test rows: `69/69` complete
- Validation status during revalidation:
  - `npm run lint`: pass (0 errors, 24 warnings)
  - `npm run type:check`: pass
  - `npm run ci:smoke`: pass
  - `npm run build:server`: pass
  - `npm run build:client:dev`: pass
  - `npm run test:server`: pass (27 suites / 110 tests)
  - `npm run test:client`: pass (50 suites / 126 tests)

### Verification commands (2026-04-24)

- `bash scripts/type-metrics.sh`
- `npm run lint`
- `npm run type:check`
- `npm run ci:smoke`
- `npm run build:server`
- `npm run build:client:dev`
- `npm run test:server`
- `npm run test:client`

This file remains the execution tracker for code-health strict gates. The tracked
surfaces are currently complete; remaining long-horizon architecture/perf work
stays in the parent optimization plan as non-strict follow-up tracks. Legacy
code-health optimization is tracked in the completed legacy plan:
[LEGACY_CODE_HEALTH_OPTIMIZATION_CHECKLIST_PLAN_2026-04-24.md](./LEGACY_CODE_HEALTH_OPTIMIZATION_CHECKLIST_PLAN_2026-04-24.md).
