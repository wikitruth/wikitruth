# Dependency Upgrade Plan (2026-02-24)

## Objectives

- Reduce vulnerability exposure from `npm audit` baseline (`80` findings: `11 critical`, `52 high` at plan creation) and current revalidation baseline (`49` findings: `12 critical`, `21 high` on `2026-05-15`).
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

1. Wave A: Tier 1 (stability + vulnerability reduction)
2. Wave B: Tier 2 (tooling modernization)
3. Wave C: Tier 3 (runtime/platform migrations)
4. Wave D: Tier 4 only when legacy comparison mode is explicitly retired

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
