# ADR-001: Incremental TypeScript Migration Strategy

- Status: Accepted
- Date: 2026-02-21

## Context

The server codebase was primarily JavaScript with a large legacy surface area (controllers, models, utilities, middleware). A big-bang migration would create high regression risk and long-lived unstable branches.

## Decision

Adopt an incremental migration strategy:

1. Convert modules by domain (`utils`, `services`, `middlewares`, `controllers`, `models`) to `.ts` in phases.
2. Keep runtime parity by preserving module structure and route contracts.
3. Use strictness ramp phases (`noImplicitAny`/`strictNullChecks`, then `strict`/`noUncheckedIndexedAccess`).
4. Track temporary `@ts-nocheck` exceptions in `docs/TS_STRICTNESS_EXCEPTIONS.md` and reduce over time.
5. Disable `allowJs` in server compile scope once critical paths are converted.

## Consequences

- Migration velocity improves without blocking daily development.
- Temporary type-coverage gaps are explicit and auditable.
- Strict compiler enforcement is achieved while preserving runtime behavior.
