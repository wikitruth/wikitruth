# Legacy Compatibility Isolation Report

Date: 2026-04-18
Plan: `docs/plans/completed/LEGACY_COMPATIBILITY_ISOLATION_CHECKLIST_PLAN_2026-04-18.md`

## Outcome

Legacy runtime artifacts were isolated under `legacy/compatibility/` while preserving legacy URL behavior and keeping modern root routes (`/*`) intact (`/app/*` remains an alias).

## Before and After Mapping

Source of truth: `legacy/compatibility/contracts/path-map.json`

Key moves:
- `public/templates` -> `legacy/templates`
- `public/views` -> `legacy/static/views`
- `public/layouts` -> `legacy/static/layouts`
- `public/js` -> `legacy/static/js`
- `public/css` -> `legacy/static/css`
- `public/less` -> `legacy/static/less`
- `public/fonts` -> `legacy/static/fonts`
- `public/components` -> `legacy/static/components`
- `tasks` -> `legacy/build/tasks`
- `Gruntfile.js` -> `legacy/build/Gruntfile.js`
- legacy server controllers moved to `legacy/server/controllers/**` with seam wrappers left in `server/src/controllers/**`

Ownership mapping:
- `legacy/compatibility/contracts/ownership-map.md`

## Compatibility Runtime Changes

- Added compatibility mount module:
  - `legacy/compatibility/server/mount.ts`
- Added compatibility path resolver:
  - `legacy/compatibility/server/pathResolver.ts`
- Wired mount seam into modern app bootstrap:
  - `server/src/app.ts`
- Wired legacy route loader/template root to compatibility path:
  - `server/src/middlewares/routes.ts`
- Added modern-only fallback mode:
  - `LEGACY_COMPATIBILITY_ENABLED=false` redirects legacy entry routes to `/`

## Guardrails Added

- `scripts/check-legacy-files-isolated.sh`
  - ensures legacy files are not reintroduced outside compatibility root
- `scripts/check-modern-no-compat-imports.sh`
  - enforces compatibility references only in approved seam files

Integrated in scripts:
- `package.json` -> `lint:compat:isolation`, `lint:compat:imports`

## Verification Evidence

### Build and Test

Executed and passing:
- `npm run lint:compat:isolation`
- `npm run lint:compat:imports`
- `npm run build:server`
- `npm run build:client:dev`
- `npm run test:server`
- `npm run test:client`

### Runtime Smoke (Compatibility ON)

Executed on `PORT=8124` with `LEGACY_COMPATIBILITY_ENABLED=true`:
- `/` -> `200`
- `/about/` -> `200`
- `/contact/` -> `200`
- `/login/` -> `200`
- `/app` -> `302` (`Location: /`)
- `/app/explore` -> `302` (`Location: /explore`)
- `/explore` -> `200`
- `/api/auth/me` -> `200`

### Runtime Smoke (Compatibility OFF / Modern-only)

Executed on `PORT=8125` with `LEGACY_COMPATIBILITY_ENABLED=false`:
- `/` -> `302` (`Location: /app`)
- `/login/` -> `302` (`Location: /`)
- `/about/` -> `302` (`Location: /`)
- `/app` -> `302` (`Location: /`)
- `/app/search` -> `302` (`Location: /search`)
- `/search` -> `200`

## Notes

- Updated legacy about page controller to mongoose-8 compatible query style:
  - `legacy/templates/jade/about/index.js`
- Legacy compatibility plan is now fully checked and ready to archive under completed plans.
