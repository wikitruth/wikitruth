# Runtime Preflight Runbook (T7-03 / T7-04)

Validates environment-level invariants before promoting a build to a managed
runtime. PM2 deployments additionally use
`RUNTIME_COMPATIBILITY_PM2_CHECK_2026-04-18.md`; other service managers use the
checks recorded in the private operator inventory.

## When to run

- Before any managed runtime restart of Wikitruth in any environment.
- Before promoting a release branch to staging or production.
- After a Node version change, brew formula upgrade, or `npm rebuild`.

## Command

```bash
npm run runtime:preflight
```

This runs `scripts/runtime/preflight-check.sh`.

## Checks performed

| ID   | Check                                                 | Failure mode  | Recovery                                                                                |
| ---- | ----------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------- |
| RP-1 | Node major satisfies `engines.node` lower bound       | Hard fail     | Install supported Node major (`nvm install --lts` or `n stable` per environment policy) |
| RP-2 | Node major below declared upper bound                 | Warning       | Track in upgrade plan; verify native modules build before promoting Node major          |
| RP-3 | npm version reported vs `engines.npm`                 | Informational | None                                                                                    |
| RP-4 | `bcrypt` loadable in current node binary              | Hard fail     | `npm rebuild bcrypt --update-binary` then re-run preflight                              |
| RP-5 | Brew dylibs referenced by `node` binary exist (macOS) | Warning       | `brew reinstall <formula>` for any reported missing path                                |

## Rollback-safe deploy gate

Production deploy procedure includes the following hard ordering:

1. `npm ci`
2. `npm run runtime:preflight` — must exit 0
3. `npm run build`
4. Run the service-manager readiness check from the private operator inventory.
   For PM2, `npm run runtime:pm2:check` must exit 0.
5. Publish only after the full `docs/runbooks/PRODUCTION_RELEASE.md` gate passes.

If step 2 or 4 fails, the deploy is aborted and the previous managed process is
left running. No partial promotion is allowed.

## Known gotchas

- Node 25.x is past the declared `<25` upper bound. The preflight will surface this as a warning today; promote `engines.node` only after validating bcrypt + mongoose native bindings on the new major.
- On Apple Silicon hosts that have switched between Intel-emulated and arm64 brew installs, `otool -L $(command -v node)` may surface `/usr/local/Cellar/...` references that no longer exist. Reinstall the affected formula.
