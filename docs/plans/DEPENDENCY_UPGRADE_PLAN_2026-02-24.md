# Dependency Upgrade Plan (2026-02-24)

## Objectives

- Reduce vulnerability exposure from `npm audit` baseline (`80` findings: `11 critical`, `52 high` at plan creation) and current revalidation baseline (`71` findings: `13 critical`, `23 high`, `31 moderate`, `4 low` on `2026-07-11`).
- Keep legacy comparison mode functional (Dust/Jade + Grunt fallback retained).
- Upgrade by risk tier to avoid broad regressions.

## Upgrade Tiers

### Tier 1: Low-Risk (Patch/Minor, Non-Breaking First)

Target in first wave with normal regression checks.

- `typescript` (`5.8.3` -> `5.9.x`)
- `ts-loader` (`9.5.1` -> `9.5.4+`)
- `@types/*` packages with patch/minor updates
- `express-session` (`1.18.2` -> `1.19.0`)
- `jsonwebtoken` (`9.0.2` -> `9.0.3`)
- `rimraf` (`6.0.1` -> `6.1.3`)
- `prettier` (`3.1.1` -> `3.x latest`)
- `lint-staged` (`15.5.x` -> `15.5.x`)

### Tier 2: Medium-Risk (Major with Known Migration Paths)

Upgrade after Tier 1 is green and pinned in CI.

- `jest` (`29` -> `30`) with `@types/jest` alignment
- `eslint` (`8` -> `9/10`) with plugin compatibility checks
- `webpack-cli` (`5` -> `6`)
- `style-loader` (`3` -> `4`)
- `css-loader` (`6` -> `7`)
- `webpack-bundle-analyzer` (`4` -> `5`)
- `helmet` (`7` -> `8`) with policy re-validation

### Tier 3: High-Risk / Platform Shifts

Require dedicated migration PRs and feature toggles.

- `express` (`4` -> `5`)
- `mongoose` (`8` -> `9`)
- `react`/`react-dom` (`18` -> `19`)
- `react-router-dom` (`6` -> `7`)
- `passport` (`0.4` -> `0.7`) and social auth strategy packages
- `connect-mongo` (`5` -> `6`)
- `bcrypt` (`5` -> `6`)

### Tier 4: Legacy-Stack Constrained (Defer While Legacy Templates Retained)

Do not upgrade blindly while Dust/Jade comparison mode remains active.

- `adaro`
- `consolidate`
- `dustjs-helpers`
- `engine-munger`
- `jade`
- `localizr`
- Grunt-era plugins tied to legacy view/build flow

## Execution Waves

1. Wave A: remaining Tier 1 and same-major security fixes (stability + vulnerability reduction)
2. Wave A2: replace `mongodb-backup-fixed` and remove its vulnerable `bson` / `tar` dependency chain
3. Wave B: Tier 2 (tooling modernization)
4. Wave C: Tier 3 (runtime/platform migrations)
5. Wave D: Tier 4 only when legacy comparison mode is explicitly retired

## Acceptance Checks Per Wave

- `npm run test:server -- --runInBand`
- `npm run test:client -- --runInBand`
- `npm run test:coverage -- --runInBand`
- `npm run build:client`
- `npm run build:server`
- `npm audit --json` delta snapshot published in docs

## Revalidation Notes (2026-05-15)

- `package.json` still contains legacy-constrained packages (`adaro`, `consolidate`, `dustjs-helpers`, `engine-munger`, `jade`, `localizr`) and auth legacy stack (`passport@0.4.1`, `passport-google`, `passport-google-oauth`, `passport-oauth`).
- `npm audit --json` current metadata reports `49` total vulnerabilities (`12 critical`, `21 high`, `13 moderate`, `3 low`), so this plan remains active.
- Tier progression is still pending; no wave is fully completed yet in this plan.

## Revalidation Notes (2026-07-11)

- `npm audit --json` now reports `71` total vulnerabilities (`13 critical`, `23 high`, `31 moderate`, `4 low`). This is worse than the May snapshot, so security remediation should precede optional target-state product work.
- Several original Tier 1 upgrades are already present: `typescript@5.9.3`, `ts-loader@9.5.7`, `express-session@1.19.0`, and `rimraf@6.1.3`. The plan remains active because the wave has not passed its full acceptance suite.
- Immediate same-major candidates include `dompurify@3.4.12`, `express@4.22.2`, `mongoose@8.24.1`, `jsonwebtoken@9.0.3`, Tiptap `3.27.x`, and `@playwright/test@1.61.1`. Storybook should first move to a patched `8.6.x` release rather than combining its security fix with a major migration.
- `mongodb-backup-fixed` introduces a critical/high transitive `bson` / `tar` chain that is not adequately resolved by a normal direct-package patch. Replacing the backup implementation is now a separate Wave A2 deliverable.
- Broad framework majors remain intentionally separated. Do not combine Express 5, Mongoose 9, React 19, React Router 7, or Storybook 10 in the security patch wave.

## Implementation Progress (2026-07-11)

- Commit `b9f4bb28` completed the safe same-major runtime/editor/tooling wave and replaced `mongodb-backup-fixed` with an application-owned, atomic JSON backup service.
- Google authentication now uses `passport-google-oauth20`; `passport-google`, `passport-google-oauth`, the unused direct `passport-oauth`, and their obsolete declarations were removed.
- Tiptap packages are aligned at `3.27.3`; DOMPurify, Express 4, Mongoose 8, JSON Web Token, Babel 7, Storybook 8, Playwright, Webpack 5, and related safe-minor packages were updated without taking framework majors.
- Full validation passed: modern and legacy type checks, `36` server suites / `165` tests, `58` client suites / `142` tests, production server/client builds, lint checks, and source guardrails.
- `npm audit` improved from `71` findings (`13` critical) to `51` findings (`7` critical). The remaining critical findings are constrained to the retained Jade/Kraken-era template stack and Passport Twitter's obsolete XML dependency; those require isolated compatibility migrations rather than forced audit fixes.
- Wave A and Wave A2 are complete for the approved safe-security scope. Waves B through D remain active.

## Implementation Progress (2026-07-12)

- Commit `0f4ce298` replaced `passport-twitter` with an application-owned OAuth 1 strategy on `passport-oauth1@1.3.0`, preserving Twitter profile/callback behavior while removing `xtraverse` and the vulnerable `xmldom` error parser.
- Commit `7c51046e` upgraded Passport core from `0.4.1` to `0.7.0`, enabling the maintained login/logout session-regeneration behavior.
- Auth, session, CSRF, legacy-compatibility, modern/legacy type, full server/client, and production build checks passed across the two isolated migrations.
- `npm audit` is now `47` findings (`6` critical, `20` high, `18` moderate, `3` low). The remaining critical findings are confined to the retained Jade/Kraken-era template/localization chain.
- Commit `c51851e0` completed the first Wave B tooling group: TypeScript ESLint `8.63.0`, final-compatible ESLint `8.57.1`, React lint `7.37.5`, Prettier `3.9.5`, Nodemon `3.1.14`, and an explicit `sanitize-html@2.17.5` compatibility pin.
- `sanitize-html@2.17.6` was rejected after the full suite proved its ESM parser chain incompatible with the CommonJS Jest/legacy runtime path; the prior compatible release remains pinned rather than accepting an untested runtime split.
- Lint, `ci:smoke`, `46` server suites / `199` tests, `64` client suites / `154` tests, and production builds passed. Audit is now `41` findings (`6` critical, `15` high, `17` moderate, `3` low).
- Commit `5d0fbe00` upgraded `bcrypt` to `6.0.0`, removed `@mapbox/node-pre-gyp` and its vulnerable `tar` chain, and added a native hash/compare regression test. All `47` server suites / `200` tests and the server build passed; audit is now `39` findings (`6` critical, `13` high, `17` moderate, `3` low).
- Commit `f8f175bb` upgraded Supertest/Superagent and Webpack Bundle Analyzer, then refreshed compatible `form-data` and `ws` transitive versions. The full server suite plus normal and analyzed client builds passed; audit is now `37` findings (`6` critical, `11` high, `17` moderate, `3` low).
