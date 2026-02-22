# Legacy Template Retention Policy

## Decision

Legacy Dust/Jade templates are intentionally retained after migration completion to support direct comparison between legacy and modern React flows.

## Scope of Retention

- `public/templates/dust/`
- `public/templates/jade/`
- Legacy dependencies and fallback runtime command: `npm run start:legacy-grunt`

## Why Retain

1. Side-by-side QA comparison of route behavior.
2. Regression triage for historical flows.
3. Controlled rollback options while React routes continue hardening.

## Guardrails

- New feature work should target React routes and APIs.
- Legacy templates should remain read-mostly (bug-fix only if needed for parity checks).
- React rollout and monitoring remain the primary production path.
