# ESLint Warning Policy

Status: adopted (2026-04-22). Tracks plan item `T1-03`.

## Summary

- `npm run lint` MUST exit 0.
- ESLint **errors** are blocking and must be fixed or given a documented inline disable with rationale.
- ESLint **warnings** are non-blocking but tracked. They are surfaced in CI logs and reviewed on each PR.
- New code MUST NOT introduce additional warnings beyond the file's existing baseline.
- Reduction is tracked per file via the source-file checklist plan and per-rule via lint output.

## Why warnings are not promoted to errors yet

The repository carries a non-trivial backlog of `@typescript-eslint/no-explicit-any` and `react-hooks/exhaustive-deps` warnings inherited from the legacy/modern hybrid migration. Promoting all warnings to errors right now would either:

- Force unsafe blanket suppressions (`eslint-disable`) that hide real risk, or
- Block unrelated PRs on pre-existing debt.

Instead, we use targeted guardrails:

- `scripts/check-no-new-ts-suppressions.sh` blocks net-new `@ts-ignore` / `@ts-expect-error` per PR.
- `scripts/check-no-new-cjs-modern.sh` blocks net-new `require()` / `module.exports` in modern folders.
- Per-file checklist (`docs/plans/CODE_HEALTH_SOURCE_FILE_CHECKLIST_PLAN_2026-04-22.md`) tracks file-level cleanups.

## When may a rule be promoted to `error`?

A rule may move from `warn` to `error` once:

1. The total occurrence count for that rule has reached zero across the lint scope, OR
2. A file-by-file allowlist / `overrides` block exists that documents every remaining occurrence.

Document the promotion in this file and update the eslint config in the same PR.

## Recommended local workflow

```bash
npm run lint                # full lint, expected to exit 0
npm run ci:smoke            # lint + type:check + guardrails
```

## CI gate

`npm run ci:smoke` is the minimum required check before merge for PRs touching server, client, or test sources. A PR may still ship with new warnings if reviewers explicitly accept them, but `errors` always block.
