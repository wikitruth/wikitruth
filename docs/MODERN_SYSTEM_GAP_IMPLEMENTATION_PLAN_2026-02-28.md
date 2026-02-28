# Modern System Gap Implementation Plan (2026-02-28)

Status legend:
- [ ] Not started
- [x] Completed

## Scope
Audit coverage for modern React client (`/app`) and modern API/server surface under `/api/*`, including auth, profile/diary, admin, entry actions, and operational telemetry.

## P0: Correctness and Security Gaps

- [x] P0.1 Restore real My Diary parity (route + API + UI)
Acceptance criteria:
- Add a dedicated modern diary page (not aliasing `ProfileTopics`) with the same private-diary semantics as legacy.
- Add modern API support for diary feed/categories/tabs (topics, arguments, questions, answers, artifacts, issues, opinions) scoped to owner and privacy rules.
- Update profile tabs and route tests so `/members/:username/diary` and `/members/profile/diary` render diary-specific content.
Verification:
- Route test coverage for both diary paths.
- API tests for owner/non-owner access, private-profile behavior, and tab filters.

- [x] P0.2 Unify auth client calls through CSRF-safe API layer
Acceptance criteria:
- Replace direct `fetch` calls in `AuthContext` with `authApi` methods (or shared client with CSRF token injection).
- Ensure login/signup/logout/forgot/reset/verification flows all include CSRF where required.
- Keep auth state hydration and error handling behavior stable.
Verification:
- Client auth unit tests + manual smoke for login/signup/logout/reset.
- Confirm no CSRF 403s on auth mutations.

- [x] P0.3 Add CSRF handling for modern admin mutations
Acceptance criteria:
- Add CSRF token propagation for `POST/PUT/DELETE` in `client/src/services/api/admin.ts`.
- Keep existing admin CRUD UI behavior unchanged.
Verification:
- Manual mutation checks (category/status/admin group/user update/delete).
- Confirm no CSRF 403s for admin mutations.

- [x] P0.4 Make runtime error ingestion compatible with CSRF policy
Acceptance criteria:
- Ensure `/api/monitoring/errors` accepts production client telemetry without weakening global CSRF posture.
- Implement one of:
  - explicit CSRF exemption for this endpoint with strict origin/content-type/rate-limit guardrails, or
  - token-aware transport strategy that works with `sendBeacon` fallback behavior.
- Document the chosen security model in `docs/security/`.
Verification:
- Automated endpoint test for valid/invalid origin/payload.
- Production-like manual test that emits a client runtime error and confirms server receipt.

## P1: Feature Parity Gaps

- [x] P1.1 Provider-aware social auth in modern login/signup
Acceptance criteria:
- Expose provider availability to unauthenticated modern pages (e.g., `/api/auth/providers`) based on server OAuth config.
- Render only enabled provider buttons in modern login/signup.
- Handle social callback return path so authenticated users land on a meaningful modern page (not stuck on `/app/login`).
Verification:
- Unit tests for button visibility by provider matrix.
- Manual callback flow test for at least one enabled provider and one disabled provider.

- [ ] P1.2 Expand modern admin API/UI to core legacy capabilities
Acceptance criteria:
- Close high-value gaps between legacy admin routes and modern admin API/UI, including:
  - user create/reset-password/role-link actions,
  - account link/unlink + note/status actions,
  - administrator permission/group-link actions.
- Preserve role-based authorization checks.
Verification:
- API tests for each new mutation path.
- UI smoke tests for affected admin screens.

- [ ] P1.3 Migrate remaining legacy-handoff workflows used by modern entry actions
Acceptance criteria:
- Replace legacy redirects for screening/convert (and related moderation actions) with modern routes + API-backed flows.
- Maintain role-gated behavior for screener/admin users.
Verification:
- Entry actions integration tests for screener/admin/regular users.
- No forced navigation to legacy routes for these actions.

## P2: Platform Hardening and Modernization

- [ ] P2.1 Wire realtime channel into an observable UX surface
Acceptance criteria:
- Use existing SSE channel in at least one user-facing surface (admin dashboard/system status or lightweight notifications).
- Add reconnect and error-state handling.
Verification:
- Unit test for channel lifecycle and event mapping.
- Manual live event smoke test.

- [ ] P2.2 Add parity and regression guardrails
Acceptance criteria:
- Add an automated parity checklist test suite for critical flows: auth, diary, entry actions, admin mutations, social provider rendering.
- Fail CI on regression for those flows.
Verification:
- CI run demonstrates new suite execution and pass/fail behavior.

- [ ] P2.3 Refresh technical docs to match final implementation
Acceptance criteria:
- Update README and relevant docs (`docs/frontend/*`, `docs/security/*`, `docs/api/*`) for any new endpoints/flows/security assumptions.
- Archive superseded plan docs when fully complete.
Verification:
- Doc lint/manual review ensuring no stale setup or endpoint references.

## Execution Order

- [x] E1 P0.1 -> P0.2 -> P0.3 -> P0.4
- [ ] E2 P1.1 -> P1.2 -> P1.3
- [ ] E3 P2.1 -> P2.2 -> P2.3

## Notes
- Keep legacy templates/routes available for side-by-side comparison until explicit removal is requested.
- Prefer additive, test-backed changes in small commits per checklist item.
