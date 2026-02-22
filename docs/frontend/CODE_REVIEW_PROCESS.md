# Frontend Code Review Process

## Scope

Applies to React migration and TypeScript modernization changes.

## Review Requirements

1. At least one reviewer approval for non-trivial changes.
2. CI must pass (`npm run test:ci`).
3. Migration docs/checklists updated when behavior or scripts change.
4. Legacy flow impact explicitly called out when touching route/controller boundaries.

## Reviewer Checklist

- Correctness: behavior and regression risk.
- Types: no new `any`/`@ts-ignore` unless justified.
- Tests: unit/integration/e2e coverage for changed behavior.
- Operations: rollout/monitoring/rollback implications documented.
- Security: auth/session/input validation and API envelope integrity.

## Merge Criteria

- All required checks green.
- Open review comments resolved.
- Migration checklist item(s) updated in the same PR.
