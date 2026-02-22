# ADR-004: Routing, Rendering, and API Versioning Strategy

- Status: Accepted
- Date: 2026-02-22

## Context

The migration introduces a React application under `/app/*` while legacy Dust/Jade pages still serve non-React routes. The project needed a concrete decision on:

1. Whether to move to SSR for the React surface.
2. How to define the route ownership boundary between legacy and React.
3. Whether API versioning should be introduced during migration.

## Decision

1. Keep React as CSR for the migrated `/app/*` surface, and do not adopt SSR in this phase.
2. Use a hybrid routing model:
   - `/app/*` served by React shell.
   - Existing legacy routes continue rendering Dust/Jade.
3. Keep hydration strategy as client-side React bootstrapping from `public/react-app.html` via `ReactDOM.createRoot`.
4. Introduce versioned API compatibility by exposing `/api/v1/*` through the same handlers as `/api/*`.

## Consequences

- Reduced migration risk by avoiding a framework-level SSR rewrite during active parity work.
- Clear ownership boundary prevents regressions on existing legacy pages.
- API clients can move to explicit versioned endpoints without breaking current `/api/*` consumers.
- SSR can be reconsidered later if SEO/performance goals for migrated routes require it.
