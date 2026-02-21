# Type Improvement Project (Server TypeScript)

## Objective

Increase real type safety across the server TypeScript codebase by systematically removing temporary `@ts-nocheck` bypasses and replacing loose typing with stable interfaces and contracts.

## Scope

- In scope:
  - `controllers/**`
  - `middlewares/**`
  - `models/**`
  - `services/**`
  - `utils/**`
  - `types/**`
  - `tests/server/**` when needed to support typed migrations
- Out of scope:
  - `public/**` legacy client JS
  - Frontend React strictness work (tracked separately)

## Baseline (2026-02-21)

- TypeScript files in scope: `99`
- Files with `@ts-nocheck`: `95`
- Files with `@ts-ignore`: `0`
- Files with `@ts-expect-error`: `0`
- Approximate `any`-like occurrences: `0`
- `@ts-nocheck` distribution:
  - `controllers`: `38`
  - `models`: `35`
  - `utils`: `8`
  - `services`: `7`
  - `middlewares`: `6`
  - `types`: `1`

## Success Criteria

- `@ts-nocheck` reaches `0` in scoped server TS files.
- No increase in API/route regressions; existing server test suites stay green.
- Type checks run as a standard command in local workflow and CI.
- Exception usage (`@ts-ignore` or `@ts-expect-error`) remains documented and justified.

## Execution Strategy

1. Stabilize typed boundaries first.
   - Harden `types/http.ts`, middleware contracts, and shared DTO shapes.
   - Avoid touching high-churn model internals until service/controller interfaces are ready.
2. Remove `@ts-nocheck` by layer order.
   - `types` and `middlewares`
   - `utils`
   - `services`
   - `controllers`
   - `models` and schema plugins last
3. Keep behavior parity.
   - No feature changes mixed with typing work.
   - Every conversion task runs `npm run test:server` and `npm run build:server`.

## Milestones

- M1: Foundations
  - Target `@ts-nocheck <= 75`
  - All middleware and type boundary modules typed without file-level bypass.
- M2: Service and utility safety
  - Target `@ts-nocheck <= 45`
  - Service return types and key utility interfaces explicit.
- M3: Controller contracts
  - Target `@ts-nocheck <= 20`
  - API controllers typed end-to-end with stable request/response shapes.
- M4: Model completion
  - Target `@ts-nocheck = 0`
  - Typed model boundaries and schema helpers finalized.

## Tracking and Reporting

- Use `npm run type:metrics` for current baseline and trend.
- Track task completion in `TYPE_IMPROVEMENT_BACKLOG.md`.
- Update `docs/TS_STRICTNESS_EXCEPTIONS.md` after each milestone.
