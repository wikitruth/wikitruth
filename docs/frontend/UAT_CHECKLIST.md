# UAT Checklist (React Migration)

Date: 2026-02-24

> Status update (2026-03-27): this checklist is a historical migration baseline. Current execution and verification status is tracked in `docs/plans/completed/CORE_GAP_REMEDIATION_PLAN_2026-03-27.md`.

## Access and Session

- [x] Login succeeds and redirects correctly.
- [x] Signup succeeds and session state initializes.
- [x] Forgot/reset password flow validates token and updates password.
- [x] Social login/signup redirects are wired for Google, GitHub, Facebook, Twitter, Apple, and Microsoft.
- [x] Account social connect/disconnect controls are present in React settings.
- [x] Logout clears session and returns expected response.
- [x] Auth status endpoint (`/api/auth/me`) handles authenticated/anonymous states.

## Content and Profile Flows

- [x] Core list/detail routes under `/app` render.
- [x] Route refresh/deep link behavior works under React Router catch-all.
- [x] Topic and argument create flows call modern mutation APIs.
- [x] Question/answer/issue/opinion/artifact create + edit flows call modern mutation APIs.
- [x] Group create/join/leave/update flows work in React.
- [x] Profile pages index/create/view flows work in React.

## Admin and Account Flows

- [x] Admin dashboard loads.
- [x] Admin users/admin groups/categories/statuses read and write actions are available in React.
- [x] Account verification status/resend/confirm flows work in React.
- [x] DB backup status/action flows work in React.

## Cross-Platform and Quality

- [x] Desktop browser project coverage (Chromium/Firefox/WebKit baseline).
- [x] Mobile browser project coverage (Pixel profile baseline).
- [x] `client/src` lint warning budget is at 0 warnings.
- [x] Contract smoke coverage for auth/admin/content endpoints passes.

## Operations

- [x] Rollback plan documented.
- [x] Monitoring endpoint and client runtime error reporting available.

## Verification Evidence (2026-02-24)

- [x] `npm run build:server`
- [x] `npm run build:client`
- [x] `npm run lint -- --format unix` (`client/src` warnings: 0)
- [x] `npm run test:server -- --runInBand tests/server/api-endpoints-smoke.test.js tests/server/openapi-contract.test.js`
- [x] `npm run test:client -- --runInBand client/src/pages/Auth/loginFlow.integration.test.tsx client/src/pages/Auth/signupFlow.integration.test.tsx client/src/pages/Auth/forgotPasswordFlow.integration.test.tsx client/src/pages/Auth/resetPasswordFlow.integration.test.tsx client/src/components/Auth/SocialLoginButtons.test.tsx client/src/pages/Admin/AdminPages.test.tsx client/src/routes/routeConfig.test.tsx`
