# Deprecation Replacement Plan

This plan tracks high-risk deprecated dependencies and defines a safe replacement sequence for runtime stability.

## Upgrade Matrix

| Area | Current Package(s) | Risk | Replacement Target | Migration Notes |
|---|---|---|---|---|
| HTTP client | No direct `request` dependency in `package.json` / `package-lock.json` | Historical deprecation target; risk is regression if legacy `request` calls are reintroduced | Keep Native `fetch` (Node 22) + adapter approach | Keep response/error mapping backward compatible and block reintroduction of `request`. |
| Template engine alias | `jade` | Deprecated name; modern ecosystem is `pug` | `pug` package and `cons.pug` renderer only | Remove `cons.jade` and jade-specific view references after parity checks. |
| Google auth | `passport-google`, `passport-google-oauth` | Legacy strategy packages, stale maintenance | `passport-google-oauth20` | Keep callback route/claims mapping compatible with current session payload. |
| Generic OAuth adapter | `passport-oauth` | Likely orphaned legacy dependency and maintenance risk | Remove if unused, otherwise use provider-specific maintained strategies (`oauth2`) | Verify runtime imports/usages before removal; avoid broad auth rewrite in one step. |

## Delivery Sequence

1. Introduce compatibility adapters behind feature flags.
2. Confirm `request` is absent from direct dependencies and code paths, then enforce this via docs/checks.
3. Switch template engine usage to `pug` only, then remove `jade` runtime references.
4. Replace Google auth strategy with `passport-google-oauth20` while preserving callback contracts.
5. Remove orphaned auth adapter packages after production verification windows.

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
