# Agent Workflow

This document defines how coding agents and maintainers should investigate,
implement, validate, and deliver changes to Wikitruth. Repository instructions
in `AGENTS.md` remain authoritative and must be read first.

## Start-of-Work Checklist

- [ ] Read `AGENTS.md` and the relevant canonical cards under `docs/canonical/`.
- [ ] Confirm the current branch, upstream, worktree status, and remote target.
- [ ] Trace the active runtime path before changing code; do not infer behavior
      from an unused adapter, archived plan, or generated file.
- [ ] Identify the smallest complete user flow affected by the change.
- [ ] Check for unrelated work and preserve it.
- [ ] Confirm whether the request authorizes implementation, publication, or
      production deployment. These are separate permissions.

## Branch and Publication Policy

- `develop` is the integration branch.
- Maintainer work may be committed and pushed directly to `develop` only when
  the repository owner explicitly requests direct delivery.
- Public contributors use topic branches and pull requests targeting `develop`.
- `master` is the release branch. Do not push or promote changes to `master`
  unless the repository owner explicitly requests that release operation.
- A request to commit or push does not authorize a deployment, service restart,
  proxy change, database migration, or DNS change.

## Investigation and Implementation

1. Reproduce or inspect the current behavior and retain concrete evidence.
2. Locate the active caller, data contract, and rendered consumer.
3. Prefer the smallest complete fix, including its regression test.
4. Follow approved canonical cards. If implementation conflicts with one,
   surface the mismatch instead of silently changing the intended behavior.
5. Keep source files within the repository size rule and extract substantial
   new logic when practical.
6. Do not create synthetic production behavior. Demo or fixture data must be
   deterministic, clearly identified as synthetic, and isolated from real data.
7. Never fabricate public counts, scores, reactions, comments, rankings, or
   evidence. Use persisted data, an explicitly documented calculation, or show
   an honest empty/zero state.

## Data and Migration Rules

- Never commit database dumps, production exports, session data, credentials,
  private contact information, or populated operator inventories.
- Migration scripts must be idempotent where practical and offer a dry-run or
  read-only audit mode before applying writes.
- Define the exact cohort and reference guards before destructive cleanup.
- Create and validate a restricted backup before production data changes.
- Treat source migration, final delta synchronization, spam cleanup, and domain
  cutover as separate operations with separate evidence.
- Never use production data for local tests. Use isolated databases and
  deterministic fixtures.

## Validation Contract

Run checks in proportion to risk. A typical substantive web change includes:

```bash
npm run type:check
npm run test:server -- --runInBand <focused-server-tests>
npm run test:client -- --runInBand <focused-client-tests>
npm run build:server
npm run build:client
```

Also:

- lint all changed source and test files;
- run broader suites when shared contracts or infrastructure change;
- test the affected rendered flow, not only the build output;
- include a 390 px mobile viewport and a desktop viewport for visible web work;
- check for clipping, overflow, loading traps, runtime overlays, and relevant
  browser console errors;
- inspect `git diff --check`, the final diff, and staged paths before committing.

If a check fails because of a known repository baseline, identify the exact
pre-existing failure and still validate every changed path independently.

## Security and Public-Repository Review

Before publication:

- inspect staged files for secrets, private keys, tokens, passwords, connection
  strings, personal data, production exports, and host-specific inventory;
- keep populated deployment details outside the public repository;
- use placeholders in public runbooks and templates;
- confirm generated files and ignored paths did not capture sensitive data;
- stage only the intended files.

## Commit and Delivery

- Prefer focused semantic commits, for example `fix:`, `feat:`, `docs:`, or
  `chore:`.
- Direct maintainer delivery may contain multiple focused commits when that
  makes review or rollback clearer.
- After pushing, verify the remote branch SHA and a clean worktree.
- Do not describe work as deployed until the target runtime has loaded the
  intended build and passed outside-in verification.

## Status Vocabulary

Report these states separately:

- **planned**: approach agreed, no implementation claim;
- **implemented**: local files changed;
- **tested**: named checks passed;
- **committed**: commit exists locally;
- **pushed**: remote branch contains the commit;
- **deployed**: target runtime was changed;
- **live-verified**: the deployed user flow passed outside-in verification.

## Deployment Handoff

Production work requires all of the following:

- explicit deployment authorization in the current request;
- the checklist in `docs/runbooks/PRODUCTION_RELEASE.md`;
- a populated private operator inventory based on
  `docs/runbooks/PRIVATE_OPERATOR_INVENTORY_TEMPLATE.md`;
- a known release SHA, backup/rollback path, and verification owner.
