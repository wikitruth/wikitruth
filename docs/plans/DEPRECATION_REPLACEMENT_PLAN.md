# Deprecation Replacement Plan

This plan tracks high-risk deprecated dependencies and defines a safe replacement sequence for runtime stability.

## Upgrade Matrix

| Area | Current Package(s) | Risk | Replacement Target | Migration Notes |
|---|---|---|---|---|
| HTTP client | No direct `request` dependency in `package.json` / `package-lock.json` | Historical deprecation target; risk is regression if legacy `request` calls are reintroduced | Keep Native `fetch` (Node 22) + adapter approach | Keep response/error mapping backward compatible and block reintroduction of `request`. |
| Template engine alias | `jade` | Deprecated name; modern ecosystem is `pug` | `pug` package and `cons.pug` renderer only | Remove `cons.jade` and jade-specific view references after parity checks. |
| Google auth | `passport-google-oauth20` | Replacement completed; production credentials still require live callback verification | Retain maintained OAuth 2 strategy | Keep callback routes and profile/session mapping covered by regression tests. |
| Twitter auth | Application-owned strategy on `passport-oauth1` | Replacement completed; production credentials still require live callback verification | Retain JSON-only profile/error handling | Do not restore `passport-twitter`, `xtraverse`, or an XML parser for provider errors. |
| Passport core | `passport@0.7.0` | Upgrade completed | Retain maintained session-regeneration behavior | Keep login/logout, social callback, CSRF, and legacy session regression tests. |
| Generic OAuth adapter | No direct `passport-oauth` dependency | Removal completed | Keep provider-specific maintained strategies | Block accidental direct reintroduction. |
| Database backup | Application-owned MongoDB-native JSON exporter | Replacement completed; archive compatibility remains operationally sensitive | Retain the service boundary and atomic collection writes | Preserve backup validation, restore preflight, progress reporting, and empty-database bootstrap behavior. |

## Delivery Sequence

1. Replace `mongodb-backup-fixed` behind the existing backup/restore service boundary and verify archive compatibility and recovery paths.
2. Introduce remaining compatibility adapters behind feature flags.
3. Confirm `request` is absent from direct dependencies and code paths, then enforce this via docs/checks.
4. Replace Google auth strategy with `passport-google-oauth20` while preserving callback contracts.
5. Remove orphaned auth adapter packages after production verification windows.
6. Switch template engine usage to `pug` only, then remove `jade` runtime references when legacy comparison mode is explicitly retired.

## Risk Notes

- HTTP migration can alter timeout/retry/error behavior if adapter parity is incomplete.
- Template migration can break legacy view rendering if file extension resolution changes.
- Auth strategy migration can break social login callback payloads and existing account-linking assumptions.
- Removing broad auth packages too early can break rarely used providers and admin flows.

## Rollback Strategy

1. Keep package-level migration in isolated commits/PRs so each replacement can be reverted independently.
2. Retain adapter feature flags to switch back to legacy implementation without redeploying schema changes.
3. Preserve existing callback routes until at least one full release cycle passes with stable auth metrics.
4. For each migration, prepare a one-command revert and lockfile restore (`git revert <sha>` + `npm ci`).

## Verification Checklist Per Package

- Smoke-test login/logout and session persistence.
- Validate `/home/`, `/login/`, `/app`, and `/api/home` still respond correctly.
- Validate server tests and client smoke tests remain green.
- Confirm no new high/critical vulnerabilities are introduced by replacement dependencies.

## Revalidation Notes (2026-05-15)

- `request` is not present as a direct dependency in `package.json` or `package-lock.json`.
- Runtime still registers both template engines (`server/src/app.ts`: `app.engine('jade', cons.jade)` and `app.engine('pug', cons.pug)`), so the template migration item is still pending.
- Runtime auth still imports `passport-google` (`server/src/middlewares/passport.ts`) and carries `passport-google-oauth` / `passport-oauth` dependencies in `package.json`.
- This plan remains active and should focus on template + auth strategy deprecation replacement, with `request` treated as a guardrail item.

## Revalidation Notes (2026-07-11)

- The current audit identifies `mongodb-backup-fixed` as the most urgent replacement because its transitive `bson` / `tar` vulnerabilities include critical and high findings without a safe direct patch path.
- The backup replacement must retain the modern admin backup/restore contract and secure empty-database restore flow; it should be delivered before auth and template migrations.
- Google auth replacement remains valid and should follow the backup migration in a separate, reversible change.
- The Jade-to-Pug cleanup remains valid but should stay coupled to an explicit legacy-comparison retirement decision rather than being pulled into the security wave.

## Implementation Progress (2026-07-11)

- Commit `b9f4bb28` completed the database-backup replacement, Google OAuth 2 migration, and direct generic OAuth dependency removal.
- Modern and legacy backup controllers now share one awaited service that writes the existing per-document JSON format atomically and partitions private records by user.
- Backup completion and document counts are returned to the modern admin UI and included in the privileged event payload.
- Commit `0f4ce298` removed Passport Twitter's vulnerable `xtraverse` / `xmldom` chain without removing Twitter OAuth 1 support.
- Commit `7c51046e` upgraded Passport core to `0.7.0` and passed focused session, callback, CSRF, and legacy compatibility verification.
- Remaining deprecation work is the Jade/Kraken-era template/localization chain. Keep this plan active until that compatibility migration is separately validated or legacy comparison mode is explicitly retired.
