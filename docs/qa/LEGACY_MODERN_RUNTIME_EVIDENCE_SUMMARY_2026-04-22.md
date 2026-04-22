# Legacy vs Modern Runtime Evidence Summary (2026-04-22)

## Execution Scope

- Base URL tested: `https://<test-host>:9443`
- Goal: capture live parity evidence for route reachability and common shell elements (top nav, sidebar, menus, breadcrumbs, page actions, placement/style baseline), including signed-in behavior.

## Runs Executed

1. Anonymous baseline (dynamic topic fixture):
   - `node scripts/qa/migration-parity-walkthrough.mjs https://<your-host>:9443`
   - `node scripts/qa/migration-parity-screenshots.mjs https://<your-host>:9443 docs/qa/artifacts/runtime-evidence-2026-04-22-v2/screenshots`
2. Authenticated parity (authoritative):
   - `node scripts/qa/migration-authenticated-parity.mjs https://<your-host>:9443 docs/qa/artifacts/runtime-evidence-2026-04-22-auth-v6/screenshots`
   - Manifest: `docs/qa/artifacts/runtime-evidence-2026-04-22-auth-v6/screenshots/manifest.json`

## Authoritative Results

### Anonymous walkthrough

All scripted checks passed:

- `PASS modern-home`
- `PASS legacy-home`
- `PASS modern-explore`
- `PASS legacy-explore`
- `PASS modern-auth-page`
- `PASS legacy-auth-page`
- `PASS modern-admin-route`
- `PASS modern-moderation-route`
- `PASS modern-app-alias`
- `PASS modern-topic-entry-dynamic`
- `PASS legacy-topic-entry-dynamic`
- `PASS auth-me` (`/api/auth/me` status `200`, response contains `"success"`)

### Authenticated coverage

- Signed-in account menu captured in both modern and legacy.
- Entry detail pages captured for all core families:
  - `topic`, `argument`, `question`, `answer`, `issue`, `opinion`, `artifact`
- Action-menu coverage captured for each family in modern and legacy (same run).
- Role-switch runtime checks captured for `reader` and `contributor`:
  - `reader` menu includes: `Follow`, `Share`, `Report`, `Details`, `View History`, `Signal for Review`, `Submit Appeal`
  - `contributor` menu includes: `Follow`, `Share`, `Reply`, `Copy to Clipboard`, `Link to...`, `Report`, `Details`, `View History`, `Signal for Review`, `Submit Appeal`

## Runtime Findings (Current)

- Top nav and sidebar:
  - Baseline parity confirmed in anonymous and signed-in runs.
- Account menus:
  - Label parity improved (`My Journal` in both modern and legacy).
  - Minor wording drift remains (`Switch Role` vs `My Role` header text).
- Breadcrumbs:
  - Runtime evidence now includes all core entry families (topic/argument/question/answer/issue/opinion/artifact).
- Entry actions:
  - Reader-mode parity improved in modern (follow/report-level actions are now available in runtime checks).
  - Modern now includes `Details`, removing the previous menu-label drift.
  - Intentional enhancement drift remains:
    - Modern adds `Signal for Review` and `Submit Appeal`.
- Focus style parity:
  - Focus ring suppression now matches in modern and legacy explore-nav checks (`outline: none`, `box-shadow: none`).

## Script and Runtime Hardening Implemented

- `scripts/qa/migration-parity-walkthrough.mjs`: dynamic topic-entry checks from `/api/home`.
- `scripts/qa/migration-parity-screenshots.mjs`: dynamic topic-entry screenshot pair + manifest source metadata.
- `scripts/qa/migration-authenticated-parity.mjs` (new):
  - Creates/signs in a disposable test user when credentials are not provided.
  - Supports privileged credential aliases (`WT_PARITY_PRIVILEGED_*`).
  - Captures signed-in account menu parity.
  - Captures entry-family action/breadcrumb parity.
  - Captures role-switch action menu evidence.
  - Captures style-state screenshots (hover/focus) for modern and legacy.
- `scripts/qa/setup-parity-test-creds.mjs` (new):
  - Upserts reusable reader and privileged parity test users.
  - Applies screener/reviewer roles and optional admin-role link for privileged parity checks.
- Runtime apply steps used for this pass:
  - `npm run build:server`
  - `npm run build:client:dev`
  - `pm2 restart wikitruth`

## Artifact Storage Note

- Raw logs/screenshots were generated under:
  - `docs/qa/artifacts/runtime-evidence-2026-04-22-v2/`
  - `docs/qa/artifacts/runtime-evidence-2026-04-22-auth-v6/`
- `docs/qa/artifacts/` is gitignored in this repo, so this summary remains the committed source of runtime evidence outcomes.
