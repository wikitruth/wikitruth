# Deprecation Replacement Plan

This plan tracks high-risk deprecated dependencies and defines a safe replacement sequence for runtime stability.

## Upgrade Matrix

| Area | Current Package(s) | Risk | Replacement Target | Migration Notes |
|---|---|---|---|---|
| HTTP client | `request` | Deprecated package with unmaintained transitive tree | Native `fetch` (Node 22) with an adapter layer | Keep response/error mapping backward compatible before switching callers. |
| Template engine alias | `jade` | Deprecated name; modern ecosystem is `pug` | `pug` package and `cons.pug` renderer only | Remove `cons.jade` and jade-specific view references after parity checks. |
| Google auth | `passport-google`, `passport-google-oauth` | Legacy strategy packages, stale maintenance | `passport-google-oauth20` | Keep callback route/claims mapping compatible with current session payload. |
| Generic OAuth adapter | `passport-oauth` | Low ecosystem momentum for legacy strategy usage | Use provider-specific maintained strategies (`oauth2`) | Replace only where still used by runtime routes; avoid broad auth rewrite in one step. |

## Delivery Sequence

1. Introduce compatibility adapters behind feature flags.
2. Migrate `request` call sites to a single HTTP adapter implementation.
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
