# Dependency Audit Snapshot (2026-07-12)

## Result

- Baseline on 2026-07-11: **71** findings (`13` critical, `23` high, `31` moderate, `4` low).
- Current full and runtime audit: **21** findings (`6` critical, `8` high, `6` moderate, `1` low).
- Reduction: **50 findings (70.4%)**, including **7 critical** and **15 high** findings.
- Modern application, authentication, test, build, editor, and development-tooling dependency paths have no remaining audit findings.

## Retained Findings

All remaining findings belong to the explicitly retained legacy template/localization comparison runtime.

| Severity | Packages |
|---|---|
| Critical | `constantinople`, `engine-munger`, `jade`, `localizr`, `minimist`, `uglify-js` |
| High | `adaro`, `braces`, `bundalo`, `dustjs-helpers`, `dustjs-linkedin`, `makara`, `micromatch`, `transformers` |
| Moderate | `anymatch`, `bl`, `chokidar`, `findatag`, `readdirp`, `spud` |
| Low | `clean-css` |

The direct roots are `dustjs-helpers`, `engine-munger`, `jade`, `localizr`, and `makara`. Removing or force-downgrading these packages would disable or destabilize the legacy pages still required for parity comparison, so this residual risk is accepted only while that mode remains active.

## Verification

- `npm audit --json`
- `npm audit --omit=dev --json`
- `npm run test:server -- --runInBand`: `47` suites / `205` tests
- `npm run test:client -- --runInBand`: `65` suites / `156` tests
- `npm run build:client`
- `npm run storybook:build`
- `npx storybook doctor`
- `npm run ci:smoke`

## Exit Condition

The remaining findings can be removed only when legacy template comparison mode is explicitly retired or rebuilt on a maintained renderer. Until then, the modern runtime must not introduce imports from these legacy packages, and the existing compatibility-isolation guardrails remain mandatory.
