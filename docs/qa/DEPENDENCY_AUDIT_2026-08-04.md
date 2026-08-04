# Dependency Audit (2026-08-04)

## Result

The React Router RSC-mode CSRF advisory `GHSA-qwww-vcr4-c8h2` is resolved.
Wikitruth now uses the upstream patched `react-router@8.3.0` release and no
longer installs `react-router-dom`.

## Why This Migration Was Required

- The advisory affects `react-router >=7.12.0 <8.3.0` and is patched in `8.3.0`.
- Wikitruth did not use React Router's unstable RSC APIs, but leaving the package
  in the affected range kept the production dependency tree scanner-positive.
- React Router v8 removed the compatibility `react-router-dom` package. The
  browser-library imports therefore moved to `react-router`, as prescribed by
  the upstream v8 changelog.
- React Router `8.3.0` requires Node `>=22.22.0` and React/React DOM `>=19.2.7`.
  React was already at `19.2.7`; the repository Node engine floor is now
  `22.22.0` while retaining the supported `<25` production ceiling.

Upstream references:

- <https://github.com/advisories/GHSA-qwww-vcr4-c8h2>
- <https://reactrouter.com/start/start/changelog#v830>

## Verification

- Source search found no RSC APIs or React Server Component configuration in
  active client/server source, package metadata, or Webpack configuration.
- `npm ls react-router react-router-dom --all` resolves only
  `react-router@8.3.0`.
- `npm audit --omit=dev --json` no longer reports `react-router` or
  `react-router-dom`; the production tree reports 21 affected package nodes
  across 11 advisory identifiers (`6` critical, `8` high, `6` moderate,
  `1` low).
- All 124 client suites / 380 tests passed.
- Client parity tests passed 6 suites / 41 tests.
- Production client build and the full smoke/type/lint/source-guardrail suite
  passed.

The local verification machine runs Node `25.9.0`, which is outside the declared
Node 22/24 production range. That warning is recorded and is not treated as
production-runtime evidence.

## Retained Findings

Every remaining direct production finding belongs to the explicitly deferred
Jade/Dust/Kraken legacy-renderer chain:

- `dustjs-helpers`
- `engine-munger`
- `jade`
- `localizr`
- `makara`

Their isolation and retirement remain tracked in the deferred launch-readiness
and legacy-toolchain checklists. No forced audit fix or incompatible override
was applied.
