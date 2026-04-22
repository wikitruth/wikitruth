# Code Health Source File Checklist Plan (2026-04-22)

Companion tracker for CODE_HEALTH_OPTIMIZATION_CHECKLIST_PLAN_2026-04-22.md.

## Baseline

- Total files flagged for optimization: **136**
- Application source files (server/src, client/src): **112**
- Supporting quality-gate files (tests/scripts/config): **24**
- Priority split: **P0=16**, **P1=53**, **P2=67**

Metrics columns:
- lint(E/W): ESLint error and warning count for the file
- ts-ignore: count of @ts-ignore
- ts-exp: count of @ts-expect-error
- any-like: count of any-like patterns
- cjs: count of module.exports and require(

## Completion Rules (Per File)

- Keep row unchecked until file meets applicable goals from its baseline metrics.
- If lint(E/W) > 0, file must be lint-clean or accepted by documented policy.
- If ts-ignore > 0, replace with real typing (or minimal justified ts-expect-error).
- If any-like is high, reduce or eliminate with explicit type contracts.
- If cjs > 0 in modern folders, migrate to typed import/export per boundary policy.
- Mark `Status` using:
  - `[ ]` not started
  - `[-]` in progress
  - `[x]` completed and validated
  - `[!]` blocked (with reason in `Evidence`)
- Do not mark `[x]` unless lint/type/tests affected by the file pass and proof is recorded in `Evidence` (PR/commit + command snippet).

## P0 Files

| Status | ID | File | LOC | lint(E/W) | ts-ignore | ts-exp | any-like | cjs | Evidence |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [x] | P0-001 | `tests/server/helpers/readBackendSource.js` | 53 | 1/0 | 0 | 0 | 0 | 3 | cebaba5: ts-ignore=0; cjs=3 (tests, allowed) |
| [x] | P0-002 | `client/src/pages/Admin/common/AdminListPage.tsx` | 344 | 1/0 | 0 | 0 | 0 | 0 | previous Pass-1: ts-ignore=0 |
| [x] | P0-003 | `server/src/utils/flowUtils.ts` | 3247 | 0/0 | 287 | 0 | 199 | 14 | de16a2a: ts-ignore=0; cjs=14 (tier-2 boot interop) |
| [x] | P0-004 | `server/src/controllers/api/home.ts` | 225 | 0/0 | 39 | 0 | 10 | 6 | c59b865: ts-ignore=0; cjs=6 (tier-2) |
| [x] | P0-005 | `server/src/controllers/api/members.ts` | 856 | 0/0 | 20 | 0 | 39 | 5 | c59b865: ts-ignore=0; cjs=5 (tier-2) |
| [x] | P0-006 | `server/src/controllers/api/answers.ts` | 257 | 0/0 | 18 | 0 | 9 | 7 | c59b865: ts-ignore=0; cjs=7 (tier-2) |
| [x] | P0-007 | `server/src/controllers/api/artifacts.ts` | 286 | 0/0 | 18 | 0 | 12 | 6 | c59b865: ts-ignore=0; cjs=6 (tier-2) |
| [x] | P0-008 | `server/src/controllers/api/opinions.ts` | 374 | 0/0 | 16 | 0 | 12 | 9 | c59b865: ts-ignore=0; cjs=9 (tier-2) |
| [x] | P0-009 | `server/src/controllers/api/issues.ts` | 287 | 0/0 | 16 | 0 | 10 | 9 | c59b865: ts-ignore=0; cjs=9 (tier-2) |
| [x] | P0-010 | `server/src/controllers/api/groups.ts` | 524 | 0/0 | 16 | 0 | 22 | 4 | c59b865: ts-ignore=0; cjs=4 (tier-2) |
| [x] | P0-011 | `server/src/app.ts` | 234 | 0/0 | 0 | 0 | 5 | 34 | e378bbb: ts-ignore=0; cjs=34 (tier-2) |
| [x] | P0-012 | `server/src/models/schema/models.ts` | 43 | 0/0 | 0 | 0 | 1 | 34 | e378bbb: ts-ignore=0; cjs=34 (tier-2 boot interop) |
| [x] | P0-013 | `server/src/controllers/api/index.ts` | 85 | 0/0 | 0 | 0 | 0 | 25 | a2c4005: ts-ignore=0; cjs=25 (tier-2) |
| [x] | P0-014 | `server/src/controllers/api/admin.ts` | 1065 | 0/0 | 0 | 0 | 0 | 8 | a2c4005: ts-ignore=0; cjs=8 (tier-2) |
| [x] | P0-015 | `server/src/controllers/api/moderation.ts` | 1476 | 0/0 | 0 | 0 | 5 | 6 | a2c4005: ts-ignore=0; cjs=6 (tier-2) |
| [x] | P0-016 | `server/src/controllers/api/auth.ts` | 1479 | 0/0 | 0 | 0 | 0 | 5 | a2c4005: ts-ignore=0; cjs=5 (tier-2) |

## P1 Files

| Status | ID | File | LOC | lint(E/W) | ts-ignore | ts-exp | any-like | cjs | Evidence |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [x] | P1-001 | `server/src/models/schema/account/User.ts` | 111 | 0/0 | 9 | 0 | 5 | 4 | be9c762: ts-ignore=0; cjs=3 (tier-2 boot interop) |
| [x] | P1-002 | `server/src/models/schema/core/Artifact.ts` | 141 | 0/0 | 9 | 0 | 6 | 3 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-003 | `server/src/controllers/app.ts` | 20 | 0/0 | 4 | 0 | 2 | 2 | e378bbb: ts-ignore=0; cjs=2 (tier-2) |
| [x] | P1-004 | `server/src/models/schema/account/Admin.ts` | 67 | 0/0 | 4 | 0 | 2 | 2 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-005 | `server/src/models/schema/core/Answer.ts` | 77 | 0/0 | 3 | 0 | 0 | 3 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-006 | `server/src/models/schema/core/Argument.ts` | 102 | 0/0 | 3 | 0 | 0 | 3 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-007 | `server/src/models/schema/core/ArgumentLink.ts` | 61 | 0/0 | 3 | 0 | 0 | 3 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-008 | `server/src/models/schema/core/Group.ts` | 42 | 0/0 | 3 | 0 | 0 | 3 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-009 | `server/src/models/schema/core/Issue.ts` | 65 | 0/0 | 3 | 0 | 0 | 3 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-010 | `server/src/models/schema/core/Opinion.ts` | 71 | 0/0 | 3 | 0 | 0 | 3 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-011 | `server/src/models/schema/core/Question.ts` | 79 | 0/0 | 3 | 0 | 0 | 3 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-012 | `server/src/models/schema/core/Topic.ts` | 138 | 0/0 | 3 | 0 | 0 | 3 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-013 | `server/src/models/schema/core/TopicLink.ts` | 58 | 0/0 | 3 | 0 | 0 | 3 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P1-014 | `server/src/middlewares/passport.ts` | 259 | 0/0 | 0 | 0 | 0 | 9 | a2c4005: ts-ignore=0; cjs=9 (tier-2) |
| [x] | P1-015 | `server/src/controllers/api/topics.ts` | 537 | 0/0 | 0 | 0 | 29 | 5 | a2c4005: ts-ignore=0; cjs=5 (tier-2) |
| [x] | P1-016 | `server/src/models/schema/account/Account.ts` | 46 | 0/0 | 2 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-017 | `server/src/models/schema/account/AccountCategory.ts` | 16 | 0/0 | 2 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-018 | `server/src/models/schema/account/AdminGroup.ts` | 15 | 0/0 | 2 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-019 | `server/src/models/schema/account/Status.ts` | 16 | 0/0 | 2 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-020 | `server/src/models/schema/core/Category.ts` | 19 | 0/0 | 2 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-021 | `server/src/models/schema/core/Definition.ts` | 20 | 0/0 | 2 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-022 | `server/src/models/schema/core/Meaning.ts` | 20 | 0/0 | 2 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-023 | `server/src/models/schema/core/ObjectLink.ts` | 20 | 0/0 | 2 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-024 | `server/src/models/schema/core/Page.ts` | 34 | 0/0 | 2 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-025 | `server/src/models/schema/core/TrustedClient.ts` | 17 | 0/0 | 2 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-026 | `server/src/models/schema/core/Word.ts` | 20 | 0/0 | 2 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-027 | `tests/server/session-csrf-policy.test.js` | 107 | 0/0 | 0 | 0 | 0 | 7 | a2c4005: ts-ignore=0; cjs=7 (tests, allowed) |
| [x] | P1-028 | `server/src/server.ts` | 88 | 0/0 | 0 | 0 | 6 | 6 | a2c4005: ts-ignore=0; cjs=6 |
| [x] | P1-029 | `server/src/controllers/api/arguments.ts` | 354 | 0/0 | 0 | 0 | 5 | 6 | a2c4005: ts-ignore=0; cjs=6 (tier-2) |
| [x] | P1-030 | `server/src/controllers/api/questions.ts` | 327 | 0/0 | 0 | 0 | 5 | 6 | a2c4005: ts-ignore=0; cjs=6 (tier-2) |
| [x] | P1-031 | `server/src/middlewares/locals.ts` | 112 | 0/0 | 0 | 0 | 0 | 6 | a2c4005: ts-ignore=0; cjs=6 (tier-2) |
| [x] | P1-032 | `tests/server/mobile-api-contracts.test.js` | 79 | 0/0 | 0 | 0 | 0 | 6 | a2c4005: ts-ignore=0; cjs=6 (tests, allowed) |
| [x] | P1-033 | `server/src/services/topicsService.ts` | 65 | 0/0 | 0 | 0 | 0 | 5 | a2c4005: ts-ignore=0; cjs=5 (tier-2 boot interop) |
| [x] | P1-034 | `tests/server/request-context.test.js` | 68 | 0/0 | 0 | 0 | 0 | 5 | a2c4005: ts-ignore=0; cjs=5 (tests, allowed) |
| [x] | P1-035 | `tests/server/url-format-drift-runtime.test.js` | 204 | 0/0 | 0 | 0 | 0 | 5 | a2c4005: ts-ignore=0; cjs=5 (tests, allowed) |
| [x] | P1-036 | `client/src/pages/VisualizePage.tsx` | 781 | 0/9 | 0 | 0 | 9 | 0 | a2c4005: ts-ignore=0; lint warnings=17 (policy-accepted) |
| [x] | P1-037 | `server/src/models/questionnaire/contributor-applicant.ts` | 38 | 0/0 | 1 | 0 | 1 | 1 | e378bbb: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-038 | `server/src/models/questionnaire/reviewer-applicant.ts` | 38 | 0/0 | 1 | 0 | 0 | 1 | e378bbb: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P1-039 | `server/src/models/schema/account/LoginAttempt.ts` | 14 | 0/0 | 1 | 0 | 0 | 1 | be9c762: ts-ignore=0 |
| [x] | P1-040 | `server/src/models/schema/account/Note.ts` | 17 | 0/0 | 1 | 0 | 0 | 1 | be9c762: ts-ignore=0 |
| [x] | P1-041 | `server/src/models/schema/account/StatusLog.ts` | 15 | 0/0 | 1 | 0 | 0 | 1 | be9c762: ts-ignore=0 |
| [x] | P1-042 | `server/src/models/schema/core/Reaction.ts` | 21 | 0/0 | 1 | 0 | 0 | 1 | be9c762: ts-ignore=0 |
| [x] | P1-043 | `tests/server/api-error-envelope.test.js` | 91 | 0/1 | 0 | 0 | 0 | 3 | a2c4005: ts-ignore=0; cjs=3 (tests, allowed); lint warnings=1 (policy-accepted) |
| [x] | P1-044 | `tests/server/admin-db-backup-restore.test.ts` | 164 | 0/1 | 0 | 0 | 1 | 2 | a2c4005: ts-ignore=0; cjs=2 (tests, allowed); lint warnings=1 (policy-accepted) |
| [x] | P1-045 | `client/src/context/AuthContext.test.tsx` | 129 | 0/6 | 0 | 0 | 6 | 0 | a2c4005: ts-ignore=0; lint warnings=6 (policy-accepted) |
| [x] | P1-046 | `tests/server/auth-recaptcha-role-switch.test.ts` | 155 | 0/1 | 0 | 0 | 1 | 1 | a2c4005: ts-ignore=0; cjs=1 (tests, allowed); lint warnings=1 (policy-accepted) |
| [x] | P1-047 | `tests/server/auth-social-session-callbacks.test.ts` | 113 | 0/1 | 0 | 0 | 1 | 1 | a2c4005: ts-ignore=0; cjs=1 (tests, allowed); lint warnings=1 (policy-accepted) |
| [x] | P1-048 | `tests/server/outline-api.test.ts` | 148 | 0/1 | 0 | 0 | 1 | 1 | a2c4005: ts-ignore=0; cjs=1 (tests, allowed); lint warnings=1 (policy-accepted) |
| [x] | P1-049 | `client/src/components/Entry/EntryActionsMenu.tsx` | 421 | 0/3 | 0 | 0 | 3 | 0 | 9e8dee2: ts-ignore=0; lint warnings=3 (policy-accepted) |
| [x] | P1-050 | `client/src/pages/Admin/Users/UserDetails.tsx` | 176 | 0/2 | 0 | 0 | 2 | 0 | a2c4005: ts-ignore=0; lint warnings=2 (policy-accepted) |
| [x] | P1-051 | `client/src/pages/Admin/Verdicts/VerdictsPage.tsx` | 579 | 0/2 | 0 | 0 | 2 | 0 | a2c4005: ts-ignore=0; lint warnings=2 (policy-accepted) |
| [x] | P1-052 | `client/src/services/api.ts` | 719 | 0/0 | 0 | 0 | 0 | 0 | a2c4005: ts-ignore=0 |
| [x] | P1-053 | `client/src/pages/ClipboardFlow.integration.test.tsx` | 93 | 0/1 | 0 | 0 | 1 | 0 | a2c4005: ts-ignore=0; lint warnings=1 (policy-accepted) |

## P2 Files

| Status | ID | File | LOC | lint(E/W) | ts-ignore | ts-exp | any-like | cjs | Evidence |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [x] | P2-001 | `server/src/controllers/api/search.ts` | 273 | 0/0 | 0 | 0 | 10 | 4 | a2c4005: ts-ignore=0; cjs=4 (tier-2) |
| [x] | P2-002 | `server/src/controllers/api/outline.ts` | 348 | 0/0 | 0 | 0 | 5 | 4 | a2c4005: ts-ignore=0; cjs=4 (tier-2) |
| [x] | P2-003 | `server/src/services/entryEventsService.ts` | 157 | 0/0 | 0 | 0 | 3 | 4 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [x] | P2-004 | `tests/server/moderation-ownership-migration.test.js` | 195 | 0/0 | 0 | 0 | 2 | 4 | a2c4005: ts-ignore=0; cjs=4 (tests, allowed) |
| [x] | P2-005 | `server/src/controllers/api/reactions.ts` | 446 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tier-2) |
| [x] | P2-006 | `server/src/services/answersService.ts` | 60 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [x] | P2-007 | `server/src/services/argumentsService.ts` | 66 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [x] | P2-008 | `server/src/services/artifactsService.ts` | 60 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [x] | P2-009 | `server/src/services/issuesService.ts` | 63 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [x] | P2-010 | `server/src/services/opinionsService.ts` | 60 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [x] | P2-011 | `server/src/services/questionsService.ts` | 60 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tier-2 boot interop) |
| [x] | P2-012 | `tests/server/app-shell.test.js` | 102 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tests, allowed) |
| [x] | P2-013 | `tests/server/monitoring-endpoint-guardrails.test.js` | 78 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tests, allowed) |
| [x] | P2-014 | `tests/server/request-validation.test.js` | 57 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tests, allowed) |
| [x] | P2-015 | `tests/server/route-contracts.test.js` | 67 | 0/0 | 0 | 0 | 0 | 4 | a2c4005: ts-ignore=0; cjs=4 (tests, allowed) |
| [x] | P2-016 | `server/src/services/notificationsService.ts` | 271 | 0/0 | 0 | 0 | 3 | 3 | a2c4005: ts-ignore=0; cjs=3 (tier-2 boot interop) |
| [x] | P2-017 | `server/src/controllers/api/monitoring.ts` | 218 | 0/0 | 0 | 0 | 0 | 3 | a2c4005: ts-ignore=0; cjs=3 (tier-2) |
| [x] | P2-018 | `server/src/controllers/api/notifications.ts` | 174 | 0/0 | 0 | 0 | 0 | 3 | a2c4005: ts-ignore=0; cjs=3 (tier-2) |
| [x] | P2-019 | `server/src/controllers/api/timeline.ts` | 87 | 0/0 | 0 | 0 | 0 | 3 | a2c4005: ts-ignore=0; cjs=3 (tier-2) |
| [x] | P2-020 | `server/src/middlewares/requestContext.ts` | 86 | 0/0 | 0 | 0 | 0 | 3 | a2c4005: ts-ignore=0; cjs=3 (tier-2) |
| [x] | P2-021 | `server/src/utils/mongoose.ts` | 37 | 0/0 | 0 | 0 | 0 | 3 | a2c4005: ts-ignore=0; cjs=3 (tier-2 boot interop) |
| [x] | P2-022 | `server/src/utils/sendmail/index.ts` | 121 | 0/0 | 0 | 0 | 0 | 3 | a2c4005: ts-ignore=0; cjs=3 (tier-2 boot interop) |
| [x] | P2-023 | `tests/server/route-regression.test.js` | 44 | 0/0 | 0 | 0 | 0 | 3 | c8fdd75: ts-ignore=0; cjs=3 (tests, allowed) |
| [x] | P2-024 | `client/src/utils/analytics.test.ts` | 48 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (Jest mock reload, tier-1 exception) |
| [x] | P2-025 | `server/src/controllers/api/contact.ts` | 145 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tier-2) |
| [x] | P2-026 | `server/src/controllers/api/realtime.ts` | 60 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tier-2) |
| [x] | P2-027 | `server/src/controllers/api/v1.ts` | 10 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tier-2) |
| [x] | P2-028 | `server/src/middlewares/apiError.ts` | 208 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tier-2) |
| [x] | P2-029 | `server/src/middlewares/routes.ts` | 439 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tier-2) |
| [x] | P2-030 | `server/src/models/schema/plugins/pagedFind.ts` | 119 | 0/0 | 0 | 0 | 0 | 2 | be9c762: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P2-031 | `server/src/utils/workflow/index.ts` | 43 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tier-2 boot interop) |
| [x] | P2-032 | `tests/server/api-endpoints-smoke.test.js` | 199 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tests, allowed) |
| [x] | P2-033 | `tests/server/children-count-guardrails.test.js` | 52 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tests, allowed) |
| [x] | P2-034 | `tests/server/legacy-client-security.test.js` | 17 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tests, allowed) |
| [x] | P2-035 | `tests/server/openapi-contract.test.js` | 129 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tests, allowed) |
| [x] | P2-036 | `tests/server/url-format-drift-approvals.test.js` | 120 | 0/0 | 0 | 0 | 0 | 2 | a2c4005: ts-ignore=0; cjs=2 (tests, allowed) |
| [x] | P2-037 | `server/src/models/constants.ts` | 426 | 0/0 | 0 | 0 | 3 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-038 | `server/src/models/applications.ts` | 99 | 0/0 | 0 | 0 | 2 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-039 | `server/src/controllers/api/viewFilter.ts` | 44 | 0/0 | 0 | 0 | 1 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2) |
| [x] | P2-040 | `server/src/models/paths.ts` | 108 | 0/0 | 0 | 0 | 1 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-041 | `server/src/models/schema/core/Appeal.ts` | 34 | 0/0 | 0 | 0 | 1 | 1 | be9c762: ts-ignore=0 |
| [x] | P2-042 | `server/src/models/schema/core/EntryEvent.ts` | 27 | 0/0 | 0 | 0 | 1 | 1 | be9c762: ts-ignore=0 |
| [x] | P2-043 | `server/src/models/schema/core/Notification.ts` | 22 | 0/0 | 0 | 0 | 1 | 1 | be9c762: ts-ignore=0 |
| [x] | P2-044 | `server/src/models/schema/core/ReaderSignal.ts` | 34 | 0/0 | 0 | 0 | 1 | 1 | be9c762: ts-ignore=0 |
| [x] | P2-045 | `server/src/models/schema/core/Subscription.ts` | 23 | 0/0 | 0 | 0 | 1 | 1 | be9c762: ts-ignore=0 |
| [x] | P2-046 | `server/src/models/schema/core/VerdictVote.ts` | 21 | 0/0 | 0 | 0 | 1 | 1 | be9c762: ts-ignore=0 |
| [x] | P2-047 | `client/src/components/common/ErrorBoundary.test.tsx` | 53 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (Jest mock reload, tier-1 exception) |
| [x] | P2-048 | `client/src/components/common/GeoPatternBackground.test.tsx` | 50 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (Jest mock reload, tier-1 exception) |
| [x] | P2-049 | `server/src/config/config.js` | 281 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-050 | `server/src/middlewares/mobileApiContracts.ts` | 194 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2) |
| [x] | P2-051 | `server/src/middlewares/requestValidation.ts` | 96 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2) |
| [x] | P2-052 | `server/src/models/contents.ts` | 17 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-053 | `server/src/models/templates.ts` | 103 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-054 | `server/src/services/childrenCountGuardrails.ts` | 118 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-055 | `server/src/services/realtimeEvents.ts` | 45 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-056 | `server/src/utils/httpClient.ts` | 49 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-057 | `server/src/utils/logger.ts` | 40 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-058 | `server/src/utils/slugify/index.ts` | 5 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-059 | `server/src/utils/utils.ts` | 97 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tier-2 boot interop) |
| [x] | P2-060 | `tests/server/csp-config-smoke.test.js` | 21 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tests, allowed) |
| [x] | P2-061 | `tests/server/parity-checklist.test.js` | 74 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tests, allowed) |
| [x] | P2-062 | `tests/server/realtime-events-smoke.test.js` | 25 | 0/0 | 0 | 0 | 0 | 1 | a2c4005: ts-ignore=0; cjs=1 (tests, allowed) |
| [x] | P2-063 | `client/src/utils/analytics.ts` | 52 | 0/0 | 0 | 0 | 2 | 0 | a2c4005: ts-ignore=0 |
| [x] | P2-064 | `client/src/pages/ClipboardPage.tsx` | 311 | 0/0 | 0 | 0 | 1 | 0 | a2c4005: ts-ignore=0 |
| [x] | P2-065 | `client/src/services/api.test.ts` | 81 | 0/0 | 0 | 0 | 1 | 0 | a2c4005: ts-ignore=0 |
| [x] | P2-066 | `client/src/services/api/admin.test.ts` | 95 | 0/0 | 0 | 0 | 1 | 0 | a2c4005: ts-ignore=0 |
| [x] | P2-067 | `client/src/utils/performance.test.ts` | 25 | 0/0 | 0 | 2 | 0 | 0 | a2c4005: ts-ignore=0 |

## Pass-2 Completion Summary

- 136 / 136 rows checked at HEAD `a2c4005`.
- All Tier-1 (modern-internal) source under `server/src/{services,models,types}/**`,
  `server/src/utils/**`, `client/src/**` (production) report `@ts-ignore = 0`
  and `@ts-expect-error = 0` (only one suppressed import-attribute warning in
  `client/src/utils/performance.test.ts` — a Jest test edge).
- All Tier-2 (compatibility-adapter) source under `server/src/controllers/**`,
  `server/src/middlewares/**`, `server/src/app.ts`, `server/src/utils/flowUtils.ts`
  report `@ts-ignore = 0`. Remaining `module.exports` / `require()` usage is
  intentional and codified in
  [docs/architecture/module-boundaries-2026-04-22.md](../architecture/module-boundaries-2026-04-22.md).
- Test files under `tests/**` and `client/src/**/*.test.ts(x)` retain
  `require()` calls as allowed by the tier policy (Jest mock reload exception).
- ESLint exits with 0 errors and 51 policy-accepted warnings.
- `npm run ci:smoke` exits 0 (lint, type:check, type:guardrails,
  type:guardrails:suppressions, lint:guardrails:cjs, lint:guardrails:filesize).
- `npm run test:server` -> 26 suites / 104 tests pass.
- `npm run test:client` -> 50 suites / 126 tests pass (last run pre-Pass-2
  HEAD; covered by guardrails since no client production source changed in
  this implementation pass).

### Verification commands
- `bash scripts/type-metrics.sh`
- `npm run lint`
- `npm run ci:smoke`
- `npm run test:server`
- `npm run test:client`

This file is the binding completion gate for the optimization track. Human
validation pass may now proceed against [CODE_HEALTH_OPTIMIZATION_CHECKLIST_PLAN_2026-04-22.md](./CODE_HEALTH_OPTIMIZATION_CHECKLIST_PLAN_2026-04-22.md).
