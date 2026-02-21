# Vulnerability Audit Triage Pass #1

Audit date: 2026-02-21

## Summary Metrics

- Baseline (`npm audit --json`): `high=113`, `critical=52`, `total=197`
- After pass #1: `high=82`, `critical=27`, `total=133`
- Reduction: `high=-31`, `critical=-25`, `total=-64`

## Changes Applied

- Removed deprecated/unneeded legacy dev dependencies with large vulnerable trees:
  - `david`
  - `babel-cli`
  - `babel-preset-env`
  - `babel-preset-react`
- Updated lockfile via npm dependency resolution after removal.

## Unresolved High/Critical Items

| Area | Current Packages | Severity | Why unresolved in pass #1 | Owner |
|---|---|---|---|---|
| Legacy task/build chain | `grunt`, `grunt-*`, `engine-munger`, `localizr`, `grunt-localizr` | high/critical | Requires coordinated removal/replacement of legacy build and localization tasks; high regression risk if done in a single pass. | Platform Team |
| Deprecated HTTP stack | `request` and transitive `form-data`, `qs`, `tough-cookie` | critical | Needs adapter-based migration to native `fetch` to preserve retry/error behavior. | Backend Team |
| Legacy template stack | `jade` and transitive parser/minifier deps | critical | Must be migrated to `pug` render path with template parity checks first. | Backend Team |
| Legacy backup utility | `mongodb-backup-fixed` and transitive old `mongodb`/`bson` | critical | Requires replacement of backup workflow and data restore verification before removal. | DevOps |
| Legacy auth transitive packages | `passport-twitter` (`xmldom`) and related old auth adapters | critical/high | Must be migrated strategy-by-strategy to avoid login/account-link regressions. | Identity Team |
| Test/lint toolchain minors | older `jest`/`eslint` trees in current lock | high | Upgrade is possible but grouped into follow-up modernization to avoid breaking lint/test configs mid-pass. | DX Team |

## Follow-Up Actions

1. Execute deprecation plan from `docs/DEPRECATION_REPLACEMENT_PLAN.md` (`request`, `jade`, auth adapters).
2. Complete legacy build chain reduction (remove unused Grunt/Bower-era dependencies).
3. Run vulnerability reduction pass #2 with major upgrades and regression tests (`P1-10`).
