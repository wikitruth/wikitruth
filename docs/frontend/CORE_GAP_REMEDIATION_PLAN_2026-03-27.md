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
- [ ] A1. Fix header accessibility violations (discernible mobile nav control text, list semantics).
- [ ] A2. Normalize auth and account-action links for modern routing and server-backed flows.
- [ ] A3. Add direct topic selection controls on visualize page (legacy parity path) while preserving graph interactions.
- [ ] A4. Tune visualize graph interaction for fluid drag feel with momentum/bounce behavior.

### B. API and Security Hardening
- [ ] B1. Add login-attempt throttling parity in `POST /api/auth/login`.
- [ ] B2. Enforce strict recaptcha semantics in contact API when captcha secret is configured.
- [ ] B3. Send forgot-password email from API flow with safe fallback behavior.
- [ ] B4. Send verification resend email from API flow with safe fallback behavior.

### C. Tests and CI Stability
- [ ] C1. Update and fix failing client tests for accessibility and visualize flow.
- [ ] C2. Update e2e mocks/assertions for provider/search/visualize parity behavior.
- [ ] C3. Re-run `test:client`, `test:e2e`, and `test:server` and record outcome.

### D. API Contract and Documentation Accuracy
- [ ] D1. Add missing implemented operations to `docs/api/openapi.json`.
- [ ] D2. Reconcile stale claims in impacted docs and link to this plan for current status.

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
- [ ] Client: `npm run test:client`
- [ ] E2E (Chromium): `npm run test:e2e -- --project=chromium`
- [ ] Server: `npm run test:server`

## Execution Notes
- Keep legacy templates intact for comparison.
- Prefer incremental commits by checklist cluster (A, B, C, D).
- Update checklist items in this file as tasks complete.
