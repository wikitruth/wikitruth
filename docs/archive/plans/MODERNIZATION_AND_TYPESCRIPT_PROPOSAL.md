# Modernization and TypeScript Proposal (Beyond Frontend Migration Plan)

## 1) Goals

- Stabilize the current stack so builds, tests, and runtime are predictable.
- Reduce security and dependency risk from legacy tooling.
- Modernize the backend architecture incrementally without breaking existing behavior.
- Convert server-side JavaScript to TypeScript in phased, low-risk steps.

## 2) Current Baseline (Repo Snapshot)

- Source footprint:
  - `controllers`: 38 JS, 0 TS
  - `models`: 35 JS, 1 TS
  - `middlewares`: 3 JS, 0 TS
  - `services`: 7 JS, 0 TS
  - `utils`: 6 JS, 0 TS
  - `tasks`: 11 JS, 0 TS
  - `tests`: 4 JS, 0 TS
- Large legacy asset surface in `public` (`~985` JS files) should be excluded from TS conversion scope.
- Security/dependency debt from `npm audit`: `197` findings (`52` critical, `113` high).
- Tooling stack is mixed and legacy-heavy:
  - Grunt + Bower + Dust/Jade pipeline is still active.
  - New React/client pipeline exists via webpack and TypeScript.
- Configuration risk:
  - hardcoded local secrets/defaults in `config/config.js` (`cryptoKey`, `jwtSecret`, SMTP placeholders).

## 3) Proposal Summary

Run 4 parallel workstreams with clear gates:

1. **Stability and Security Hardening**
2. **Build/Test/Developer Experience Modernization**
3. **Backend Architecture Cleanup**
4. **Incremental JavaScript -> TypeScript Migration**

Each workstream should ship in small PRs with zero behavioral regressions to legacy routes and APIs.

Implementation backlog (prioritized, PR-sized tasks):
- See `MODERNIZATION_BACKLOG.md`

## 4) Workstream A: Fix and Harden First (Weeks 1-2)

### A1. Secrets and config hygiene
- Move secrets from code defaults to environment variables.
- Keep only non-sensitive defaults in repo.
- Add/refresh `config/config.example.js` with required keys and comments.
- Add startup validation for required env vars (fail fast for production).

### A2. Security middleware and session hardening
- Re-enable and validate `helmet` usage with explicit policy config.
- Review `express-session` settings (`cookie.secure`, `sameSite`, rolling/resave policy).
- Confirm CSRF strategy for both legacy forms and API endpoints.

### A3. Dependency risk reduction
- Replace known deprecated/high-risk packages in controlled PRs:
  - `request` -> `fetch`/`axios` adapter
  - `jade` -> `pug` migration plan
  - old auth adapters as applicable (`passport-google-oauth` family)
- Run vulnerability reduction in stages:
  - non-breaking patch/minor upgrades first
  - major upgrades with dedicated regression tests

## 5) Workstream B: Tooling and Delivery Modernization (Weeks 2-4)

### B1. Standardize runtime/build tooling
- Keep current scripts stable (`dev:server`, `dev:client`, `build:client`, `test:client`).
- Add a pinned Node version file (`.nvmrc` or `.node-version`).
- Add CI checks:
  - install
  - lint
  - server tests
  - client tests
  - client build

### B2. Testing modernization
- Keep existing Grunt/Mocha tests temporarily but establish Jest/Supertest path for backend.
- Add baseline integration tests for critical routes:
  - `/`, `/home/`, `/login/`, `/api/home`, `/app/*`.
- Raise coverage for migrated TS modules first.

### B3. Logging and diagnostics
- Introduce structured logging (pino/winston) behind an adapter.
- Normalize error handling with centralized Express error middleware.
- Add request correlation id for API debugging.

## 6) Workstream C: Backend Cleanup (Weeks 3-6)

### C1. Layer boundaries
- Normalize module boundaries:
  - controllers: HTTP only
  - services: business rules
  - data/model access: repositories or model adapters
- Reduce cross-layer direct imports from `app` singleton where possible.

### C2. API contract consistency
- Standardize response envelope and error format for `/api/*`.
- Add request validation (e.g., zod/joi) for create/update endpoints.
- Add typed DTO contracts shared between service and controller layers.

### C3. Legacy isolation
- Isolate Dust/Jade rendering paths from API-only paths.
- Keep legacy rendering stable while incrementally moving logic to reusable services.

## 7) JavaScript -> TypeScript Conversion Plan (Server-Focused)

## Scope
- **In scope**: `controllers`, `middlewares`, `services`, `utils`, `models`, `tests`, server bootstrap.
- **Out of scope (for now)**: bundled/static legacy JS in `public/**`.

## Phase TS-0: Compiler and project setup (Week 1)
- Split TS config:
  - `tsconfig.base.json`
  - `tsconfig.server.json`
  - keep client TS config separate.
- Keep incremental compatibility:
  - `allowJs: true` initially
  - `checkJs: false` globally, then enable per-directory over time.
- Add typed lint rules for TS files only at first.

## Phase TS-1: Type foundation (Week 1-2)
- Add `src/types` (or `server/types`) for:
  - request user/session extensions
  - common API response/error types
  - shared domain ids/enums.
- Type Express globals via declaration merging (`express` and session types).

## Phase TS-2: Convert low-risk modules first (Weeks 2-3)
- Convert pure utilities and services (`utils/*`, `services/*`) from `.js` to `.ts`.
- Add tests during conversion for behavior lock.
- Replace untyped helper return values with explicit interfaces.

## Phase TS-3: Convert middleware and route composition (Weeks 3-4)
- Convert `middlewares/*` and routing wiring files.
- Type auth guard middleware (`ensureAuthenticated`, role checks).
- Introduce typed route params/query helpers.

## Phase TS-4: Convert controllers and API handlers (Weeks 4-6)
- Convert `/controllers/api/*` first, then non-API controllers.
- Apply request/response DTO typing.
- Introduce runtime validation to avoid trusting untyped inputs.

## Phase TS-5: Convert data/model layer (Weeks 6-8)
- Convert `models/*` and schema wiring with typed Mongoose models.
- Remove outdated `@types/mongoose` reliance if using current Mongoose built-in types.
- Type service/model boundaries so controllers never consume raw `any`.

## Phase TS-6: Final strictness ramp (Weeks 8-10)
- Turn on stricter compiler flags in sequence:
  - `noImplicitAny`
  - `noUncheckedIndexedAccess`
  - `strictNullChecks`
  - `strict: true`
- Disable `allowJs` after conversion reaches target coverage.
- Remove leftover CommonJS-only patterns where practical.

## 8) Coding Rules During Migration

- No mixed refactor + feature changes in one PR.
- Each conversion PR must include:
  - before/after behavior notes
  - tests for migrated files
  - no route contract changes unless explicit.
- Keep compatibility adapters where needed to avoid big-bang rewrites.

## 9) Proposed Deliverables

### Milestone M1 (2 weeks)
- Security/config hardening baseline
- CI pipeline in place
- TS project layout finalized
- utilities/services conversion started

### Milestone M2 (4-6 weeks)
- middleware + API controllers mostly typed
- standardized API errors and validation for key endpoints
- reduced critical/high vulnerability count materially

### Milestone M3 (8-10 weeks)
- server code primarily TypeScript
- strictness significantly increased
- legacy JS minimized to non-critical or archived modules

## 10) Definition of Done (Program Level)

- Server build/test run cleanly under TypeScript-first pipeline.
- Core legacy routes and React app routes both verified in regression suite.
- Security findings reduced to an agreed threshold with documented exceptions.
- No hardcoded secrets in committed runtime configs.
- Migration docs kept current after each milestone.
