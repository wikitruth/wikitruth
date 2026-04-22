# Wikitruth Drive Implementation Plan (2026-04-14)

This plan package was generated after scanning the imported Google Drive corpus one-by-one.

## What Is Included

1. [01_SOURCE_SCAN_CATALOG.md](./01_SOURCE_SCAN_CATALOG.md)
   - One-by-one scan log of all imported files.
   - File classification (product requirement, design artifact, reference material, seed content, etc).
   - Extracted implementable signals where available.

2. [02_IMPLEMENTATION_CHECKLIST_CORE_PLATFORM.md](./02_IMPLEMENTATION_CHECKLIST_CORE_PLATFORM.md)
   - Concrete build checklist for domain model, authoring lifecycle, review/verdict engine, and security foundations.

3. [03_IMPLEMENTATION_CHECKLIST_PRODUCT_WORKFLOWS.md](./03_IMPLEMENTATION_CHECKLIST_PRODUCT_WORKFLOWS.md)
   - Concrete build checklist for UX, discovery/ranking, discussions, timelines, notifications, and data visualizations.

4. [04_IMPLEMENTATION_CHECKLIST_CONTENT_AND_FIXPH.md](./04_IMPLEMENTATION_CHECKLIST_CONTENT_AND_FIXPH.md)
   - Concrete build checklist for topic seeding, content governance operations, and FixThePH implementation.

5. [05_IDEA_TRACKER_NORMALIZED.md](./05_IDEA_TRACKER_NORMALIZED.md)
   - Normalized tracker of extracted ideas/features/plans with IDs and source mapping.

6. [06_VALIDATED_CHECKLIST_CORE_PLATFORM.md](./06_VALIDATED_CHECKLIST_CORE_PLATFORM.md)
   - Revalidated status of every `CORE-*` item against current code.
   - Marks each item as `implemented`, `partial`, or `not_implemented` with concrete gaps.

7. [07_VALIDATED_CHECKLIST_PRODUCT_WORKFLOWS.md](./07_VALIDATED_CHECKLIST_PRODUCT_WORKFLOWS.md)
   - Revalidated status of every `FLOW-*` item against current code.
   - Includes explicit missing pieces per workflow item.

8. [08_VALIDATED_CHECKLIST_CONTENT_FIXPH.md](./08_VALIDATED_CHECKLIST_CONTENT_FIXPH.md)
   - Revalidated status of every `CONTENT-*` and `FIXPH-*` item against current code/docs.
   - Highlights policy and operations gaps separately from code features.

9. [09_GAP_CHECKLIST_PLAN.md](./09_GAP_CHECKLIST_PLAN.md)
   - Concrete execution checklist derived from validated gaps.
   - Organized by implementation tracks for phased delivery.
   - Includes migration closure gate linking to `docs/plans/MIGRATION_CLOSURE_PENDING_CHECKLIST_PLAN_2026-04-18.md`.

## Execution Order

1. Complete the platform-critical checklist in `02` first.
2. Build the user-facing contribution/discovery workflows in `03`.
3. Run content seeding and FixPH execution in `04`.
4. Keep `05` as the working backlog source-of-truth for ongoing triage and status updates.
5. Use `06`/`07`/`08` as the active status baseline before starting any new implementation chunk.
6. Use `09` as the current actionable execution sequence for gap closure.

## Suggested Workflow

- Use item IDs (`CORE-*`, `FLOW-*`, `CONTENT-*`, `FIXPH-*`) in PR titles and commit messages.
- Mark each completed checklist item in place.
- When an item is split or re-scoped, update `05_IDEA_TRACKER_NORMALIZED.md` first, then link from checklist docs.
