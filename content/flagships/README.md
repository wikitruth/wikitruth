# Real-world flagship pilots

This folder contains versioned, public-source content packs used to exercise Wikitruth's real review workflow. A pack may create pending entries, evidence links, review-calibration guidance, and pending translations. It must never manufacture a verdict, reviewer vote, appeal outcome, or consensus.

## Safety model

- `npm run content:flagships:check` is read-only and prints the exact insert/unchanged plan.
- Apply mode requires an existing creator account, an exact database-name match, and the literal confirmation phrase.
- Deterministic IDs make a matching rerun idempotent. A changed content hash, ID collision, or reused slug fails closed for manual review.
- Newly created records are rolled back if an apply operation fails. Existing records are never overwritten.
- Published entries and translations remain pending until real reviewers act through the governed product workflow.

## Publication checklist

1. Review every source and time-sensitive value against the current primary publication.
2. Run `npm run content:flagships:check` against the intended environment and retain the summary.
3. Confirm the active Wikitruth parent topic and FixPH tenant shown by the dry run.
4. Set `WT_FLAGSHIP_CREATOR_USERNAME` to the accountable publishing account.
5. Run:

   ```sh
   npm run content:flagships:apply -- \
     --expected-database=<exact-database-name> \
     --confirm=publish-pending-flagship-pilots
   ```

6. Verify all created URLs, evidence relationships, pending translations, audit events, revisions, and aggregate counts.
7. Assign at least the pack's minimum number of independent reviewers. Record qualifications and dissent rather than forcing agreement.
8. Revalidate the entries on the stated cadence and whenever a cited authority publishes a material correction or update.

The database name and creator account are operator inputs and must not be committed here.
