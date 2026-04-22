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
| [ ] | P0-001 | `tests/server/helpers/readBackendSource.js` | 53 | 1/0 | 0 | 0 | 0 | 3 | |
| [ ] | P0-002 | `client/src/pages/Admin/common/AdminListPage.tsx` | 344 | 1/0 | 0 | 0 | 0 | 0 | |
| [ ] | P0-003 | `server/src/utils/flowUtils.ts` | 3247 | 0/0 | 287 | 0 | 199 | 14 | |
| [ ] | P0-004 | `server/src/controllers/api/home.ts` | 225 | 0/0 | 39 | 0 | 10 | 6 | |
| [ ] | P0-005 | `server/src/controllers/api/members.ts` | 856 | 0/0 | 20 | 0 | 39 | 5 | |
| [ ] | P0-006 | `server/src/controllers/api/answers.ts` | 257 | 0/0 | 18 | 0 | 9 | 7 | |
| [ ] | P0-007 | `server/src/controllers/api/artifacts.ts` | 286 | 0/0 | 18 | 0 | 12 | 6 | |
| [ ] | P0-008 | `server/src/controllers/api/opinions.ts` | 374 | 0/0 | 16 | 0 | 12 | 9 | |
| [ ] | P0-009 | `server/src/controllers/api/issues.ts` | 287 | 0/0 | 16 | 0 | 10 | 9 | |
| [ ] | P0-010 | `server/src/controllers/api/groups.ts` | 524 | 0/0 | 16 | 0 | 22 | 4 | |
| [ ] | P0-011 | `server/src/app.ts` | 234 | 0/0 | 0 | 0 | 5 | 34 | |
| [ ] | P0-012 | `server/src/models/schema/models.ts` | 43 | 0/0 | 0 | 0 | 1 | 34 | |
| [ ] | P0-013 | `server/src/controllers/api/index.ts` | 85 | 0/0 | 0 | 0 | 0 | 25 | |
| [ ] | P0-014 | `server/src/controllers/api/admin.ts` | 1065 | 0/0 | 0 | 0 | 0 | 8 | |
| [ ] | P0-015 | `server/src/controllers/api/moderation.ts` | 1476 | 0/0 | 0 | 0 | 5 | 6 | |
| [ ] | P0-016 | `server/src/controllers/api/auth.ts` | 1479 | 0/0 | 0 | 0 | 0 | 5 | |

## P1 Files

| Status | ID | File | LOC | lint(E/W) | ts-ignore | ts-exp | any-like | cjs | Evidence |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [ ] | P1-001 | `server/src/models/schema/account/User.ts` | 111 | 0/0 | 9 | 0 | 5 | 4 | |
| [ ] | P1-002 | `server/src/models/schema/core/Artifact.ts` | 141 | 0/0 | 9 | 0 | 6 | 3 | |
| [ ] | P1-003 | `server/src/controllers/app.ts` | 20 | 0/0 | 4 | 0 | 2 | 2 | |
| [ ] | P1-004 | `server/src/models/schema/account/Admin.ts` | 67 | 0/0 | 4 | 0 | 2 | 2 | |
| [ ] | P1-005 | `server/src/models/schema/core/Answer.ts` | 77 | 0/0 | 3 | 0 | 0 | 3 | |
| [ ] | P1-006 | `server/src/models/schema/core/Argument.ts` | 102 | 0/0 | 3 | 0 | 0 | 3 | |
| [ ] | P1-007 | `server/src/models/schema/core/ArgumentLink.ts` | 61 | 0/0 | 3 | 0 | 0 | 3 | |
| [ ] | P1-008 | `server/src/models/schema/core/Group.ts` | 42 | 0/0 | 3 | 0 | 0 | 3 | |
| [ ] | P1-009 | `server/src/models/schema/core/Issue.ts` | 65 | 0/0 | 3 | 0 | 0 | 3 | |
| [ ] | P1-010 | `server/src/models/schema/core/Opinion.ts` | 71 | 0/0 | 3 | 0 | 0 | 3 | |
| [ ] | P1-011 | `server/src/models/schema/core/Question.ts` | 79 | 0/0 | 3 | 0 | 0 | 3 | |
| [ ] | P1-012 | `server/src/models/schema/core/Topic.ts` | 138 | 0/0 | 3 | 0 | 0 | 3 | |
| [ ] | P1-013 | `server/src/models/schema/core/TopicLink.ts` | 58 | 0/0 | 3 | 0 | 0 | 3 | |
| [ ] | P1-014 | `server/src/middlewares/passport.ts` | 259 | 0/0 | 0 | 0 | 0 | 9 | |
| [ ] | P1-015 | `server/src/controllers/api/topics.ts` | 537 | 0/0 | 0 | 0 | 29 | 5 | |
| [ ] | P1-016 | `server/src/models/schema/account/Account.ts` | 46 | 0/0 | 2 | 0 | 0 | 2 | |
| [ ] | P1-017 | `server/src/models/schema/account/AccountCategory.ts` | 16 | 0/0 | 2 | 0 | 0 | 2 | |
| [ ] | P1-018 | `server/src/models/schema/account/AdminGroup.ts` | 15 | 0/0 | 2 | 0 | 0 | 2 | |
| [ ] | P1-019 | `server/src/models/schema/account/Status.ts` | 16 | 0/0 | 2 | 0 | 0 | 2 | |
| [ ] | P1-020 | `server/src/models/schema/core/Category.ts` | 19 | 0/0 | 2 | 0 | 0 | 2 | |
| [ ] | P1-021 | `server/src/models/schema/core/Definition.ts` | 20 | 0/0 | 2 | 0 | 0 | 2 | |
| [ ] | P1-022 | `server/src/models/schema/core/Meaning.ts` | 20 | 0/0 | 2 | 0 | 0 | 2 | |
| [ ] | P1-023 | `server/src/models/schema/core/ObjectLink.ts` | 20 | 0/0 | 2 | 0 | 0 | 2 | |
| [ ] | P1-024 | `server/src/models/schema/core/Page.ts` | 34 | 0/0 | 2 | 0 | 0 | 2 | |
| [ ] | P1-025 | `server/src/models/schema/core/TrustedClient.ts` | 17 | 0/0 | 2 | 0 | 0 | 2 | |
| [ ] | P1-026 | `server/src/models/schema/core/Word.ts` | 20 | 0/0 | 2 | 0 | 0 | 2 | |
| [ ] | P1-027 | `tests/server/session-csrf-policy.test.js` | 107 | 0/0 | 0 | 0 | 0 | 7 | |
| [ ] | P1-028 | `server/src/server.ts` | 88 | 0/0 | 0 | 0 | 6 | 6 | |
| [ ] | P1-029 | `server/src/controllers/api/arguments.ts` | 354 | 0/0 | 0 | 0 | 5 | 6 | |
| [ ] | P1-030 | `server/src/controllers/api/questions.ts` | 327 | 0/0 | 0 | 0 | 5 | 6 | |
| [ ] | P1-031 | `server/src/middlewares/locals.ts` | 112 | 0/0 | 0 | 0 | 0 | 6 | |
| [ ] | P1-032 | `tests/server/mobile-api-contracts.test.js` | 79 | 0/0 | 0 | 0 | 0 | 6 | |
| [ ] | P1-033 | `server/src/services/topicsService.ts` | 65 | 0/0 | 0 | 0 | 0 | 5 | |
| [ ] | P1-034 | `tests/server/request-context.test.js` | 68 | 0/0 | 0 | 0 | 0 | 5 | |
| [ ] | P1-035 | `tests/server/url-format-drift-runtime.test.js` | 204 | 0/0 | 0 | 0 | 0 | 5 | |
| [ ] | P1-036 | `client/src/pages/VisualizePage.tsx` | 781 | 0/9 | 0 | 0 | 9 | 0 | |
| [ ] | P1-037 | `server/src/models/questionnaire/contributor-applicant.ts` | 38 | 0/0 | 1 | 0 | 1 | 1 | |
| [ ] | P1-038 | `server/src/models/questionnaire/reviewer-applicant.ts` | 38 | 0/0 | 1 | 0 | 0 | 1 | |
| [ ] | P1-039 | `server/src/models/schema/account/LoginAttempt.ts` | 14 | 0/0 | 1 | 0 | 0 | 1 | |
| [ ] | P1-040 | `server/src/models/schema/account/Note.ts` | 17 | 0/0 | 1 | 0 | 0 | 1 | |
| [ ] | P1-041 | `server/src/models/schema/account/StatusLog.ts` | 15 | 0/0 | 1 | 0 | 0 | 1 | |
| [ ] | P1-042 | `server/src/models/schema/core/Reaction.ts` | 21 | 0/0 | 1 | 0 | 0 | 1 | |
| [ ] | P1-043 | `tests/server/api-error-envelope.test.js` | 91 | 0/1 | 0 | 0 | 0 | 3 | |
| [ ] | P1-044 | `tests/server/admin-db-backup-restore.test.ts` | 164 | 0/1 | 0 | 0 | 1 | 2 | |
| [ ] | P1-045 | `client/src/context/AuthContext.test.tsx` | 129 | 0/6 | 0 | 0 | 6 | 0 | |
| [ ] | P1-046 | `tests/server/auth-recaptcha-role-switch.test.ts` | 155 | 0/1 | 0 | 0 | 1 | 1 | |
| [ ] | P1-047 | `tests/server/auth-social-session-callbacks.test.ts` | 113 | 0/1 | 0 | 0 | 1 | 1 | |
| [ ] | P1-048 | `tests/server/outline-api.test.ts` | 148 | 0/1 | 0 | 0 | 1 | 1 | |
| [ ] | P1-049 | `client/src/components/Entry/EntryActionsMenu.tsx` | 421 | 0/3 | 0 | 0 | 3 | 0 | |
| [ ] | P1-050 | `client/src/pages/Admin/Users/UserDetails.tsx` | 176 | 0/2 | 0 | 0 | 2 | 0 | |
| [ ] | P1-051 | `client/src/pages/Admin/Verdicts/VerdictsPage.tsx` | 579 | 0/2 | 0 | 0 | 2 | 0 | |
| [ ] | P1-052 | `client/src/services/api.ts` | 719 | 0/0 | 0 | 0 | 0 | 0 | |
| [ ] | P1-053 | `client/src/pages/ClipboardFlow.integration.test.tsx` | 93 | 0/1 | 0 | 0 | 1 | 0 | |

## P2 Files

| Status | ID | File | LOC | lint(E/W) | ts-ignore | ts-exp | any-like | cjs | Evidence |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [ ] | P2-001 | `server/src/controllers/api/search.ts` | 273 | 0/0 | 0 | 0 | 10 | 4 | |
| [ ] | P2-002 | `server/src/controllers/api/outline.ts` | 348 | 0/0 | 0 | 0 | 5 | 4 | |
| [ ] | P2-003 | `server/src/services/entryEventsService.ts` | 157 | 0/0 | 0 | 0 | 3 | 4 | |
| [ ] | P2-004 | `tests/server/moderation-ownership-migration.test.js` | 195 | 0/0 | 0 | 0 | 2 | 4 | |
| [ ] | P2-005 | `server/src/controllers/api/reactions.ts` | 446 | 0/0 | 0 | 0 | 0 | 4 | |
| [ ] | P2-006 | `server/src/services/answersService.ts` | 60 | 0/0 | 0 | 0 | 0 | 4 | |
| [ ] | P2-007 | `server/src/services/argumentsService.ts` | 66 | 0/0 | 0 | 0 | 0 | 4 | |
| [ ] | P2-008 | `server/src/services/artifactsService.ts` | 60 | 0/0 | 0 | 0 | 0 | 4 | |
| [ ] | P2-009 | `server/src/services/issuesService.ts` | 63 | 0/0 | 0 | 0 | 0 | 4 | |
| [ ] | P2-010 | `server/src/services/opinionsService.ts` | 60 | 0/0 | 0 | 0 | 0 | 4 | |
| [ ] | P2-011 | `server/src/services/questionsService.ts` | 60 | 0/0 | 0 | 0 | 0 | 4 | |
| [ ] | P2-012 | `tests/server/app-shell.test.js` | 102 | 0/0 | 0 | 0 | 0 | 4 | |
| [ ] | P2-013 | `tests/server/monitoring-endpoint-guardrails.test.js` | 78 | 0/0 | 0 | 0 | 0 | 4 | |
| [ ] | P2-014 | `tests/server/request-validation.test.js` | 57 | 0/0 | 0 | 0 | 0 | 4 | |
| [ ] | P2-015 | `tests/server/route-contracts.test.js` | 67 | 0/0 | 0 | 0 | 0 | 4 | |
| [ ] | P2-016 | `server/src/services/notificationsService.ts` | 271 | 0/0 | 0 | 0 | 3 | 3 | |
| [ ] | P2-017 | `server/src/controllers/api/monitoring.ts` | 218 | 0/0 | 0 | 0 | 0 | 3 | |
| [ ] | P2-018 | `server/src/controllers/api/notifications.ts` | 174 | 0/0 | 0 | 0 | 0 | 3 | |
| [ ] | P2-019 | `server/src/controllers/api/timeline.ts` | 87 | 0/0 | 0 | 0 | 0 | 3 | |
| [ ] | P2-020 | `server/src/middlewares/requestContext.ts` | 86 | 0/0 | 0 | 0 | 0 | 3 | |
| [ ] | P2-021 | `server/src/utils/mongoose.ts` | 37 | 0/0 | 0 | 0 | 0 | 3 | |
| [ ] | P2-022 | `server/src/utils/sendmail/index.ts` | 121 | 0/0 | 0 | 0 | 0 | 3 | |
| [ ] | P2-023 | `tests/server/route-regression.test.js` | 44 | 0/0 | 0 | 0 | 0 | 3 | |
| [ ] | P2-024 | `client/src/utils/analytics.test.ts` | 48 | 0/0 | 0 | 0 | 0 | 2 | |
| [ ] | P2-025 | `server/src/controllers/api/contact.ts` | 145 | 0/0 | 0 | 0 | 0 | 2 | |
| [ ] | P2-026 | `server/src/controllers/api/realtime.ts` | 60 | 0/0 | 0 | 0 | 0 | 2 | |
| [ ] | P2-027 | `server/src/controllers/api/v1.ts` | 10 | 0/0 | 0 | 0 | 0 | 2 | |
| [ ] | P2-028 | `server/src/middlewares/apiError.ts` | 208 | 0/0 | 0 | 0 | 0 | 2 | |
| [ ] | P2-029 | `server/src/middlewares/routes.ts` | 439 | 0/0 | 0 | 0 | 0 | 2 | |
| [ ] | P2-030 | `server/src/models/schema/plugins/pagedFind.ts` | 119 | 0/0 | 0 | 0 | 0 | 2 | |
| [ ] | P2-031 | `server/src/utils/workflow/index.ts` | 43 | 0/0 | 0 | 0 | 0 | 2 | |
| [ ] | P2-032 | `tests/server/api-endpoints-smoke.test.js` | 199 | 0/0 | 0 | 0 | 0 | 2 | |
| [ ] | P2-033 | `tests/server/children-count-guardrails.test.js` | 52 | 0/0 | 0 | 0 | 0 | 2 | |
| [ ] | P2-034 | `tests/server/legacy-client-security.test.js` | 17 | 0/0 | 0 | 0 | 0 | 2 | |
| [ ] | P2-035 | `tests/server/openapi-contract.test.js` | 129 | 0/0 | 0 | 0 | 0 | 2 | |
| [ ] | P2-036 | `tests/server/url-format-drift-approvals.test.js` | 120 | 0/0 | 0 | 0 | 0 | 2 | |
| [ ] | P2-037 | `server/src/models/constants.ts` | 426 | 0/0 | 0 | 0 | 3 | 1 | |
| [ ] | P2-038 | `server/src/models/applications.ts` | 99 | 0/0 | 0 | 0 | 2 | 1 | |
| [ ] | P2-039 | `server/src/controllers/api/viewFilter.ts` | 44 | 0/0 | 0 | 0 | 1 | 1 | |
| [ ] | P2-040 | `server/src/models/paths.ts` | 108 | 0/0 | 0 | 0 | 1 | 1 | |
| [ ] | P2-041 | `server/src/models/schema/core/Appeal.ts` | 34 | 0/0 | 0 | 0 | 1 | 1 | |
| [ ] | P2-042 | `server/src/models/schema/core/EntryEvent.ts` | 27 | 0/0 | 0 | 0 | 1 | 1 | |
| [ ] | P2-043 | `server/src/models/schema/core/Notification.ts` | 22 | 0/0 | 0 | 0 | 1 | 1 | |
| [ ] | P2-044 | `server/src/models/schema/core/ReaderSignal.ts` | 34 | 0/0 | 0 | 0 | 1 | 1 | |
| [ ] | P2-045 | `server/src/models/schema/core/Subscription.ts` | 23 | 0/0 | 0 | 0 | 1 | 1 | |
| [ ] | P2-046 | `server/src/models/schema/core/VerdictVote.ts` | 21 | 0/0 | 0 | 0 | 1 | 1 | |
| [ ] | P2-047 | `client/src/components/common/ErrorBoundary.test.tsx` | 53 | 0/0 | 0 | 0 | 0 | 1 | |
| [ ] | P2-048 | `client/src/components/common/GeoPatternBackground.test.tsx` | 50 | 0/0 | 0 | 0 | 0 | 1 | |
| [ ] | P2-049 | `server/src/config/config.js` | 281 | 0/0 | 0 | 0 | 0 | 1 | |
| [ ] | P2-050 | `server/src/middlewares/mobileApiContracts.ts` | 194 | 0/0 | 0 | 0 | 0 | 1 | |
| [ ] | P2-051 | `server/src/middlewares/requestValidation.ts` | 96 | 0/0 | 0 | 0 | 0 | 1 | |
| [ ] | P2-052 | `server/src/models/contents.ts` | 17 | 0/0 | 0 | 0 | 0 | 1 | |
| [ ] | P2-053 | `server/src/models/templates.ts` | 103 | 0/0 | 0 | 0 | 0 | 1 | |
| [ ] | P2-054 | `server/src/services/childrenCountGuardrails.ts` | 118 | 0/0 | 0 | 0 | 0 | 1 | |
| [ ] | P2-055 | `server/src/services/realtimeEvents.ts` | 45 | 0/0 | 0 | 0 | 0 | 1 | |
| [ ] | P2-056 | `server/src/utils/httpClient.ts` | 49 | 0/0 | 0 | 0 | 0 | 1 | |
| [ ] | P2-057 | `server/src/utils/logger.ts` | 40 | 0/0 | 0 | 0 | 0 | 1 | |
| [ ] | P2-058 | `server/src/utils/slugify/index.ts` | 5 | 0/0 | 0 | 0 | 0 | 1 | |
| [ ] | P2-059 | `server/src/utils/utils.ts` | 97 | 0/0 | 0 | 0 | 0 | 1 | |
| [ ] | P2-060 | `tests/server/csp-config-smoke.test.js` | 21 | 0/0 | 0 | 0 | 0 | 1 | |
| [ ] | P2-061 | `tests/server/parity-checklist.test.js` | 74 | 0/0 | 0 | 0 | 0 | 1 | |
| [ ] | P2-062 | `tests/server/realtime-events-smoke.test.js` | 25 | 0/0 | 0 | 0 | 0 | 1 | |
| [ ] | P2-063 | `client/src/utils/analytics.ts` | 52 | 0/0 | 0 | 0 | 2 | 0 | |
| [ ] | P2-064 | `client/src/pages/ClipboardPage.tsx` | 311 | 0/0 | 0 | 0 | 1 | 0 | |
| [ ] | P2-065 | `client/src/services/api.test.ts` | 81 | 0/0 | 0 | 0 | 1 | 0 | |
| [ ] | P2-066 | `client/src/services/api/admin.test.ts` | 95 | 0/0 | 0 | 0 | 1 | 0 | |
| [ ] | P2-067 | `client/src/utils/performance.test.ts` | 25 | 0/0 | 0 | 2 | 0 | 0 | |
