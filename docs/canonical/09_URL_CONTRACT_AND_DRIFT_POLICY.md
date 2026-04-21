# Canonical Card: URL Contract and Drift Policy

## Purpose

Define stable URL contract rules for legacy/modern coexistence and control route-shape drift.

## Canonical URL Contract

- Modern root routes (`/*`) are canonical.
- `/app/*` remains an alias layer and must redirect to root canonical routes.
- Legacy routes are compatibility-only and should not define new canonical contracts.
- Member-private profile content now uses `/members/:username/journal` as canonical, with `/members/:username/diary` retained as a compatibility alias.

## Legacy Comparison Normalization

When comparing legacy and modern URL formats, normalize legacy paths by removing the leading `/legacy` prefix.

Example:

- `/legacy/topic/:friendly/:id` compares as `/topic/:friendly/:id`

## Drift Classifications

- `MATCH`: normalized legacy format equals modern canonical format.
- `DRIFT`: format changed (path shape, naming, segment or query model).
- `ALIAS`: legacy path intentionally redirects to modern canonical format.
- `MODERN_ONLY`: modern-only enhancement route.

## Drift Policy

- New `DRIFT` rows require explicit approval in the URL drift checklist plan.
- Every `DRIFT` row must have a unique approval ID and register entry.
- Unapproved `DRIFT` additions must fail automated tests.
- Existing approved drift should be reviewed periodically and converged when feasible.

## Source of Record

- Drift matrix and approvals: `docs/plans/LEGACY_MODERN_URL_FORMAT_DRIFT_CHECKLIST_PLAN_2026-04-22.md`
