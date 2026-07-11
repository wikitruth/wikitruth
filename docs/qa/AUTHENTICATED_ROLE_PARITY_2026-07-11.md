# Authenticated Role Parity Evidence (2026-07-11)

## Result

Credentialed modern/legacy parity passed with a disposable all-role account. The runner created temporary User, Account, and Admin records, exercised the role and entry workflows, scrubbed the manifest, deleted all temporary records, and verified zero matching user residue.

Command:

```bash
npm run test:parity:authenticated:disposable
```

Evidence:

- `docs/qa/artifacts/parity-authenticated-disposable-2026-07-11/manifest.json`

## Entry Families

Topic, argument, question, answer, issue, opinion, and artifact pages were captured in modern and legacy modes. Every family reported zero capture errors and both implementations exposed their authenticated action menus.

## Role Isolation

All five role switches returned `200` and succeeded.

| Active role | Screening | Take ownership | Delete | Convert | Signal | Appeal |
| --- | --- | --- | --- | --- | --- | --- |
| Reader | No | No | No | No | Yes | Yes |
| Contributor | No | No | No | No | Yes | Yes |
| Screener | Yes | No | No | No | Yes | Yes |
| Reviewer | No | No | No | No | Yes | Yes |
| Admin | Yes | Yes | Yes | Yes | Yes | Yes |

The first capture exposed admin capabilities leaking into contributor/reviewer presentation modes. `EntryActionsMenu` was corrected to use the active role, a focused regression test was added, the client was rebuilt/restarted, and this retained rerun confirms the correction.

## Data Safety

- Generated signup was disabled.
- The test identity is redacted from the retained manifest.
- Screenshots were transient and are not retained in Git.
- Temporary User, Account, and Admin records were deleted in a `finally` cleanup path.
- A post-run query confirmed zero `wt_disposable_*` users.
