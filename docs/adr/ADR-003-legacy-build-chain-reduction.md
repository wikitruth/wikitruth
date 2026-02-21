# ADR-003: Legacy Build-Chain Reduction

- Status: Accepted
- Date: 2026-02-21

## Context

The repository historically used a Grunt/Bower-centered workflow. The active runtime path now uses direct Node startup plus a React/webpack client build. Keeping both full toolchains as first-class paths increased maintenance cost, dependency risk, and onboarding complexity.

## Decision

Adopt a reduced build chain with one primary path:

1. Make `node server.js` the default runtime start command.
2. Keep `npm run build:client` as the active client build path.
3. Remove unused or non-essential Grunt-era dependencies and test wiring that no longer provide value.
4. Preserve an explicit legacy fallback command (`npm run start:legacy-grunt`) for temporary compatibility while remaining legacy flows are retired.

## Consequences

- Fewer transitive dependencies and lower vulnerability exposure.
- Faster onboarding with a clearer default workflow.
- Residual legacy support remains available behind an explicit fallback path, reducing migration risk.
