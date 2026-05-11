# Dependency Upgrade Classification (2026-04-22)

> Tracks: T6-01 (classify), T6-02 (low-risk patch upgrades), T6-03 (major batches).

## Snapshot

- Source: `npm outdated --json` against the installed lockfile.
- Total outdated entries: **80**
- Low-risk (current → wanted, semver-allowed): **39**
- Major-version lag (current major < latest major): **38**
- Engines: `node >=22.4.1 <25`, `npm >=10.8.1 <12` (dev environment is on Node 25.9.0 / npm 11.12.1; lockfile honors the declared range).

## Risk Buckets

### Bucket A — Low risk (patch / minor, semver-allowed via `npm install`)

These bumps stay inside the version range already declared in `package.json`. Apply via plain `npm install` (no manifest edit). Run `ci:smoke` + `test:server` + `test:client` afterward. Expected to ship together as one batch (T6-02).

| Package | Scope | Current | Wanted (target) |
| --- | --- | --- | --- |
| `@babel/preset-typescript` | dev | 7.27.0 | 7.28.5 |
| `@playwright/test` | dev | 1.58.2 | 1.59.1 |
| `@tiptap/*` (12 sub-packages) | prod | 3.22.3 | 3.22.4 |
| `@types/async` | dev | 3.2.24 | 3.2.25 |
| `@types/body-parser` | dev | 1.19.5 | 1.19.6 |
| `@types/compression` | dev | 1.7.5 | 1.8.1 |
| `@types/cookie-parser` | dev | 1.4.8 | 1.4.10 |
| `@types/express` | dev | 5.0.1 | 5.0.6 |
| `@types/express-session` | dev | 1.18.1 | 1.19.0 |
| `@types/jsonwebtoken` | dev | 9.0.9 | 9.0.10 |
| `@types/morgan` | dev | 1.9.9 | 1.9.10 |
| `@types/node` | dev | 22.14.1 | 22.19.17 |
| `@types/passport-facebook` | dev | 3.0.3 | 3.0.4 |
| `@types/passport-github` | dev | 1.1.12 | 1.1.13 |
| `@types/react` | dev | 18.3.20 | 18.3.28 |
| `@types/react-dom` | dev | 18.3.6 | 18.3.7 |
| `dompurify` | prod | 3.3.3 | 3.4.1 |
| `express-session` | prod | 1.18.2 | 1.19.0 |
| `handlebars` | prod | 4.7.8 | 4.7.9 |
| `jest-environment-jsdom` | dev | 30.2.0 | 30.3.0 |
| `lint-staged` | dev | 15.5.1 | 15.5.2 |
| `mongoose` | prod | 8.13.2 | 8.23.0 |
| `rimraf` | prod | 6.0.1 | 6.1.3 |
| `sanitize-html` | prod | 2.17.2 | 2.17.3 |
| `ts-jest` | dev | 29.4.6 | 29.4.9 |
| `ts-loader` | dev | 9.5.2 | 9.5.7 |
| `typescript` | dev | 5.8.3 | 5.9.3 |
| `webpack` | dev | 5.105.2 | 5.106.2 |
| `zod` | prod | 3.23.8 | 3.25.76 |

Notes:
- `mongoose 8.13 → 8.23` is a minor bump within the same major; tracked here but should land in its own commit so any test churn is isolated from the rest of Bucket A.
- `typescript 5.8 → 5.9` may surface new lint/type warnings; if so, address them in the same commit.
- `zod 3.23 → 3.25` minor — review changelog for any deprecations actually used by `client/src` and `server/src`.

### Bucket B — Medium risk (major bump, low blast radius)

Major version bumps where the surface area in this codebase is small or already abstracted. Each ships in its own commit with focused regression tests.

| Package | Scope | Current → Latest | Notes |
| --- | --- | --- | --- |
| `husky` | dev | 8.0.3 → 9.1.7 | git hook layout changed; one-time install; verify pre-commit runs. |
| `lint-staged` | dev | 15.5.1 → 16.4.0 | Node engine bump; we already exceed it. |
| `eslint-config-prettier` | dev | 9.1.0 → 10.1.8 | Drop legacy rule shims; verify lint diff. |
| `css-loader` | dev | 6.11.0 → 7.1.4 | Webpack 5 compatible. |
| `style-loader` | dev | 3.3.4 → 4.0.0 | Webpack 5 compatible. |
| `babel-loader` | dev | 9.1.3 → 10.1.1 | Requires Babel 7.12+; we ship 7.23+. |
| `webpack-bundle-analyzer` | dev | 4.10.2 → 5.3.0 | dev-only. |
| `webpack-cli` | dev | 5.1.4 → 7.0.2 | dev-only; verify `npm run build`. |
| `supertest` | dev | 3.4.2 → 7.2.2 | API surface largely compatible; assert against server tests. |
| `@types/method-override` | dev | 0.0.35 → 3.0.0 | types-only. |
| `@types/bcrypt` | dev | 5.0.2 → 6.0.0 | types-only; pair with bcrypt bump. |
| `passport-google-oauth` | prod | 1.0.0 → 2.0.0 | Verify auth flow; `legacy/server` may still depend on the older shape. |

### Bucket C — High risk (major bump, broad blast radius)

Each requires its own design pass + explicit regression test batch (T6-03/T6-04). Do **not** bundle.

| Package | Scope | Current → Latest | Risk Notes |
| --- | --- | --- | --- |
| `react` | prod | 18.2.0 → 19.2.5 | App-wide; touches `client/src`, story files, hooks rules. Ship after `eslint-plugin-react-hooks` is updated. |
| `react-dom` | prod | 18.2.0 → 19.2.5 | Pair with `react` upgrade. |
| `react-router-dom` | prod | 6.30 → 7.14 | API surface change; routes in `client/src/routes`. |
| `@types/react` / `@types/react-dom` | dev | 18.x → 19.x | Pair with React 19. |
| `eslint` | dev | 8.55 → 10.2.1 | Flat-config era; `.eslintrc.json` would need migration. |
| `eslint-plugin-react-hooks` | dev | 4.6.2 → 7.1.1 | Aligns with React 19; do with React batch. |
| `@typescript-eslint/{eslint-plugin,parser}` | dev | 6.21 → 8.59 | Requires ESLint 8.57+; gates the eslint v9/10 jump. |
| `typescript` (major) | dev | 5.8.3 → 6.0.3 | Distinct from the 5.9 minor in Bucket A. Schedule **after** type-debt burn-down (Track 3). |
| `jest` + `@types/jest` | dev | 29.x → 30.x | All test configs (`jest.config.*.js`, `ts-jest`) need a coordinated bump. |
| `helmet` | prod | 7.1.0 → 8.1.0 | CSP defaults moved; pair with security smoke tests. |
| `express` | prod | 4.22 → 5.2.1 | Express 5 changes async error semantics; legacy controllers depend on Express 4 behavior. **Do last.** |
| `mongoose` (major) | prod | 8.x → 9.x | Connection/query API changes; already passing 8.x — defer until after schema typing settles. |
| `connect-mongo` | prod | 5.1 → 6.0 | Pair with `mongoose` major. |
| `bcrypt` | prod | 5.1.1 → 6.0.0 | Native module; revisit after PM2/dylib hardening (Track 7) is solid. |
| `emailjs` | prod | 4.0.3 → 5.0.0 | Auth/transactional email; small but production-critical. |
| `less` | prod | 3.13 → 4.6 | Style build pipeline; verify both modern + legacy compile. |
| `adaro`, `consolidate`, `engine-munger` | prod | 0.x/0.1.x → 1.x | Legacy templating stack; pinned by Kraken. **Do not bump without explicit Kraken plan.** |
| `storybook` + `@storybook/react-webpack5` | dev | 8.6 → 10.3 | Two majors; configuration migration script available but expect breakage. |
| `@types/node` (major) | dev | 22 → 25 | Wait until engine range allows Node 25. |

## Sequenced Batches

1. **B1 — Bucket A all-in (T6-02)** — single `npm install` with mongoose isolated to its own follow-up commit; expect zero behavioral change.
2. **B2 — Tooling lift (Bucket B subset)**: `husky`, `lint-staged`, `eslint-config-prettier`, dev-only loaders. Dev/CI ergonomics; safe to land together.
3. **B3 — Test runner alignment**: `jest` 29 → 30 + `@types/jest` 30 + `ts-jest` (verify already at compatible point). Requires a clean test pass.
4. **B4 — ESLint flat-config track**: `eslint` 9 → 10, `@typescript-eslint/*`, `eslint-plugin-react-hooks` 7. Migrate `.eslintrc.json` → `eslint.config.js`.
5. **B5 — React 19 batch**: React + ReactDOM + types + react-router-dom 7 + Storybook 10. Visual regression + Playwright pass required.
6. **B6 — Server framework batch**: `helmet` 8 → `mongoose` 9 + `connect-mongo` 6 → `express` 5. Sequenced *internally*; never interleaved.
7. **B7 — Native modules**: `bcrypt` 6 (after Track 7 dylib hardening lands).
8. **B8 — Templating stack** (`adaro`/`consolidate`/`engine-munger`): defer until Kraken story is reviewed. May stay pinned indefinitely.

## Validation Gate per Batch

For every batch:

- `npm run ci:smoke` exits 0
- `npm run test:server` 26/26 suites
- `npm run test:client` 50/50 suites
- `npm run runtime:preflight` exits 0 (added in Pass 1)
- For batches touching client UI: `npm run test:e2e` (Playwright) on at least the smoke spec
- Manual: `npm run start:dev` boots, `/healthcheck` 200, login flow exercised

## Tracking

- Update `docs/plans/completed/CODE_HEALTH_OPTIMIZATION_CHECKLIST_PLAN_2026-04-22.md` after each batch lands; mark sub-items of T6-02..T6-05 accordingly.
- Re-run `npm outdated` after each batch and append a "Snapshot after Batch N" section here showing the delta.
