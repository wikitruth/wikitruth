# Modernization Backlog (Prioritized)

This backlog is derived from `MODERNIZATION_AND_TYPESCRIPT_PROPOSAL.md` and is intended for execution planning.

## Planning Assumptions

- Estimates are engineering effort (ideal days), excluding waiting/review delays.
- Each item should be delivered in one focused PR.
- Rule: no mixed feature + refactor PRs.
- Scope is server/runtime modernization and JS -> TS migration (frontend migration plan is tracked separately).

## Priority Overview

- `P0` = immediate risk reduction and delivery foundation (start now)
- `P1` = structural modernization and broad TS adoption
- `P2` = strictness ramp, cleanup, and long-tail hardening

## P0 Backlog (0-2 Weeks)

| ID | Task | Estimate | Depends On | Done Criteria |
|---|---|---:|---|---|
| P0-01 ✅ | Secrets/config hardening (`config/config.js` -> env-first) | 1.5d | none | No hardcoded runtime secrets in committed config; `config/config.example.js` updated; startup validation added. |
| P0-02 ✅ | Pin runtime toolchain (`.nvmrc` + engines) | 0.5d | none | Node version pinned; `package.json` `engines` added; README setup updated. |
| P0-03 ✅ | CI baseline pipeline (install, lint, test, build) | 1.0d | P0-02 | CI runs `npm ci`, lint, `test:client`, `build:client`, and existing server tests. |
| P0-04 ✅ | Re-enable and configure `helmet` safely | 1.0d | P0-01 | `helmet` enabled with explicit policy config; no breakage to `/app`, `/home/`, `/login/`, `/api/home`. |
| P0-05 ✅ | Session/CSRF review and policy update | 1.5d | P0-04 | Session cookie settings documented and enforced by env; CSRF behavior validated for legacy forms and API endpoints. |
| P0-06 ✅ | API route regression tests (legacy + React shell coexistence) | 1.5d | P0-03 | Automated checks for `/`, `/home/`, `/login/`, `/app`, `/app/*`, `/api/home` in CI. |
| P0-07 ✅ | TypeScript config split (`tsconfig.base` + `tsconfig.server`) | 1.0d | P0-02 | Server/client TS configs separated; compile path deterministic; docs updated. |
| P0-08 ✅ | Introduce shared server types (`types/http`, `types/auth`) | 1.0d | P0-07 | Typed request/session/user extensions compile cleanly; used in at least one module. |
| P0-09 ✅ | Convert `utils/*` JS -> TS | 2.0d | P0-08 | Utility modules converted with tests passing and no behavior change. |
| P0-10 ✅ | Convert `services/*` JS -> TS | 2.0d | P0-09 | Service modules converted with tests passing and no route contract changes. |
| P0-11 ✅ | Deprecation replacement plan PR (`request`, `jade`, auth adapters) | 1.0d | P0-03 | Written upgrade matrix with sequence, risk notes, and rollback steps committed to docs. |
| P0-12 ✅ | Audit triage and vulnerability reduction pass #1 | 2.0d | P0-11 | Critical/high count reduced; unresolved items documented with rationale and owner. |

## P1 Backlog (2-6 Weeks)

| ID | Task | Estimate | Depends On | Done Criteria |
|---|---|---:|---|---|
| P1-01 ✅ | Convert `middlewares/*` JS -> TS | 1.5d | P0-08 | Guards and middleware typed; runtime parity confirmed. |
| P1-02 ✅ | Convert route composition (`middlewares/routes.js`) to TS | 1.5d | P1-01 | Route wiring typed; no route regressions in regression suite. |
| P1-03 ✅ | Convert API controllers (`controllers/api/*`) to TS | 3.5d | P1-02 | API controllers compile in TS; contracts unchanged unless explicitly documented. |
| P1-04 ✅ | Introduce API error envelope + centralized error middleware | 2.0d | P1-03 | Consistent error response shape across `/api/*`; legacy render paths unaffected. |
| P1-05 ✅ | Runtime request validation (`zod` or `joi`) for create/update endpoints | 2.5d | P1-03 | Validation applied to highest-risk write endpoints; tests for invalid payloads added. |
| P1-06 ✅ | Convert non-API controllers (`controllers/*.js`) to TS | 4.0d | P1-02 | Legacy page controllers typed and behavior-preserving. |
| P1-07 ✅ | Convert `models/*` + schema wiring to typed Mongoose | 4.0d | P0-08 | Core models typed; service/model boundaries remove `any` for migrated domains. |
| P1-08 ✅ | Replace `request` usage with fetch/axios adapter | 1.5d | P1-03 | No remaining production `request` usage in server code. |
| P1-09 ✅ | Logging modernization (structured logger + request id) | 2.0d | P1-04 | Structured logs emitted for API errors and key request paths. |
| P1-10 ✅ | Vulnerability reduction pass #2 (major upgrades with tests) | 3.0d | P1-08 | Additional high/critical reductions with regression tests and changelog notes. |

## P2 Backlog (6-10 Weeks)

| ID | Task | Estimate | Depends On | Done Criteria |
|---|---|---:|---|---|
| P2-01 ✅ | Strictness ramp step 1 (`noImplicitAny`, `strictNullChecks`) | 2.0d | P1-07 | Compiler passes with new flags; exception list minimized and documented. |
| P2-02 ✅ | Strictness ramp step 2 (`noUncheckedIndexedAccess`, `strict`) | 2.0d | P2-01 | Server build clean under strict mode. |
| P2-03 ✅ | Disable `allowJs` for server scope | 1.5d | P2-02 | Server code compiles without JS fallback; remaining JS explicitly excluded. |
| P2-04 ✅ | Test modernization: migrate legacy mocha/grunt tests to Jest/Supertest | 3.0d | P1-03 | Equivalent or better test coverage for migrated suites; CI simplified. |
| P2-05 | Remove obsolete TS type packages (e.g., stale `@types/mongoose`) | 0.5d | P1-07 | Redundant/stale type deps removed with clean build/test. |
| P2-06 | Legacy build chain reduction (`bower`/unused grunt tasks) | 2.0d | P1-06 | Unused tasks/deps removed without breaking required legacy flows. |
| P2-07 | Docs completion and architecture decision records (ADRs) | 1.5d | P2-03 | Final docs updated; ADRs for key migration decisions merged. |

## Suggested Execution Sequence

1. Complete all `P0` items in order.
2. Run `P1-01` to `P1-04` to stabilize typed API surfaces.
3. Parallelize `P1-06`, `P1-07`, and `P1-09` once shared types are stable.
4. Start `P2` only after route regression suite is green and API contracts are stable.

## Weekly Tracking Template

Use this lightweight format per week:

- Completed: `[IDs]`
- In progress: `[IDs]`
- Blocked: `[IDs + reason]`
- Risk changes: `[new or removed risks]`
- Metrics:
  - Critical/high vulnerabilities: `X / Y`
  - JS->TS converted server modules: `X / Y`
  - TS strictness flags enabled: `[list]`
