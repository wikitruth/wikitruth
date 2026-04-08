# Core Gap Remediation Plan (2026-03-27)

## Scope
Close the highest-impact gaps across modern client parity, auth/security behavior, API contract accuracy, and CI reliability.

## Baseline (2026-03-27)
- `npm run test:server`: passing.
- `npm run test:client`: failing.
- `npm run test:e2e -- --project=chromium`: failing.
- Known client failures:
  - `client/src/accessibility/accessibility.audit.test.tsx`
  - `client/src/pages/VisualizePage.test.tsx`
- Known e2e failures:
  - social auth provider links
  - search bucket label expectation drift
  - visualize topic-selection interaction drift

## Checklist

### A. Modern Client Parity and Accessibility
- [x] A1. Fix header accessibility violations (discernible mobile nav control text, list semantics).
- [x] A2. Normalize auth and account-action links for modern routing and server-backed flows.
- [x] A3. Add direct topic selection controls on visualize page (legacy parity path) while preserving graph interactions.
- [x] A4. Tune visualize graph interaction for fluid drag feel with momentum/bounce behavior.

### B. API and Security Hardening
- [x] B1. Add login-attempt throttling parity in `POST /api/auth/login`.
- [x] B2. Enforce strict recaptcha semantics in contact API when captcha secret is configured.
- [x] B3. Send forgot-password email from API flow with safe fallback behavior.
- [x] B4. Send verification resend email from API flow with safe fallback behavior.

### C. Tests and CI Stability
- [x] C1. Update and fix failing client tests for accessibility and visualize flow.
- [x] C2. Update e2e mocks/assertions for provider/search/visualize parity behavior.
- [x] C3. Re-run `test:client`, `test:e2e`, and `test:server` and record outcome.

### D. API Contract and Documentation Accuracy
- [x] D1. Add missing implemented operations to `docs/api/openapi.json`.
- [x] D2. Reconcile stale claims in impacted docs and link to this plan for current status.

## Missing Endpoints to Add to OpenAPI
- `GET /auth/account-settings`
- `PUT /auth/account-settings/contact`
- `PUT /auth/account-settings/identity`
- `PUT /auth/account-settings/password`
- `POST /auth/fast-switch`
- `GET /members/me/fast-switch`
- `PUT /members/me/fast-switch`
- `GET /members/{username}/contributions`
- `POST /contact`

## Verification Gates
- [x] Client: `npm run test:client`
- [x] E2E (Chromium): `npm run test:e2e -- --project=chromium`
- [x] Server: `npm run test:server`

## Execution Notes
- Keep legacy templates intact for comparison.
- Prefer incremental commits by checklist cluster (A, B, C, D).
- Update checklist items in this file as tasks complete.
- Completed A on 2026-03-27:
  - `client/src/components/Layout/Header.tsx`
  - `client/src/pages/VisualizePage.tsx`
  - `webpack.config.js`
  - Targeted validation: `npm run test:client -- client/src/accessibility/accessibility.audit.test.tsx client/src/pages/VisualizePage.test.tsx --runInBand`
- Completed B on 2026-03-27:
  - `server/src/controllers/api/auth.ts`
  - `server/src/controllers/api/contact.ts`
  - Validation:
    - `npm run type:check`
    - `npm run test:server`
- Completed C on 2026-03-27:
  - `client/src/pages/SearchPage.tsx`
  - `jest.config.client.js`
  - `tests/e2e/smoke.spec.ts`
  - Validation:
    - `npm run test:client -- --runInBand`
    - `npm run test:e2e -- --project=chromium`
    - `npm run test:ci`
- Completed D on 2026-03-27:
  - `docs/api/openapi.json`
  - `docs/frontend/UAT_CHECKLIST.md`
  - `docs/accessibility/ACCESSIBILITY_AUDIT_REPORT.md`
  - `docs/security/SECURITY_AUDIT_REPORT.md`
  - Validation:
    - `npm run test:server -- --runInBand tests/server/openapi-contract.test.js tests/server/api-endpoints-smoke.test.js`
    - `npm audit --json`
