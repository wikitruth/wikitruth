# Page-by-Page Legacy vs Modern Comparison Pack (2026-04-22)

## Purpose

Create a practical, page-by-page comparison set to verify whether legacy pages were fully migrated into modern routes.

This pack is intended for parity execution, not just route listing.

## Documents in This Pack

1. `docs/qa/PAGE_BY_PAGE_LEGACY_MODERN_COMPARISON_MATRIX_2026-04-22.md`
   - Full page pairing matrix (legacy route/template vs modern route/component)
   - Migration status and evidence references
   - Common UI elements side-by-side matrix (top nav, sidebar, menus, breadcrumbs, page actions, placement, style baseline)

2. `docs/qa/PAGE_BY_PAGE_LEGACY_MODERN_COMPARISON_CHECKLISTS_2026-04-22.md`
   - Detailed page checklists by family
   - Sections, features, elements, actions, data contracts, permissions, responsive behavior
   - Explicit parity dimensions for element placement/hierarchy and visual style/design baseline

## Source Baseline Used

- Modern route surface: `client/src/routes/routeConfig.tsx`
- Legacy templates: `legacy/templates/dust/**`, `legacy/templates/jade/**`
- Redirect/alias ownership: `server/src/middlewares/routes.ts`
- Existing parity audit source: `docs/plans/LEGACY_MODERN_MIGRATION_PARITY_AUDIT_CHECKLIST_PLAN_2026-04-19.md`
- Existing runtime audit: `docs/qa/LEGACY_MODERN_PARITY_AUDIT_2026-04-20.md`
- Runtime evidence bundle for this comparison pass: `docs/qa/LEGACY_MODERN_RUNTIME_EVIDENCE_SUMMARY_2026-04-22.md`
- URL drift approvals: `docs/plans/LEGACY_MODERN_URL_FORMAT_DRIFT_CHECKLIST_PLAN_2026-04-22.md`
- Signed-in parity runner: `scripts/qa/migration-authenticated-parity.mjs`
- Reusable parity credential setup: `scripts/qa/setup-parity-test-creds.mjs`, `docs/qa/PARITY_TEST_CREDENTIALS_RUNBOOK_2026-04-22.md`

## Status Legend

- `Aligned (Code Evidence)` = present and parity-aligned by code review.
- `Needs Runtime Evidence` = likely implemented, but still needs live parity proof.
- `Partial` = page exists, but parity-critical pieces are still missing/incomplete.
- `Alias/Redirect` = intentional route-shape difference with redirect normalization.
- `Modern Only (Intentional)` = new modern surface with no legacy page equivalent.

## Normalization Rules

- For route-shape comparison, legacy paths are normalized by removing the `/legacy` prefix.
- URL-format drift decisions are tracked in:
  - `docs/plans/LEGACY_MODERN_URL_FORMAT_DRIFT_CHECKLIST_PLAN_2026-04-22.md`

## How to Use This Pack

1. Start in the matrix doc and pick a page family.
2. Open the corresponding checklist section.
3. Execute checks in this order:
   - Route ownership and redirects
   - Page sections/elements
   - User actions
   - API/data contract shape
   - Role/permission gating
   - Mobile/responsive behavior
   - SEO/meta/analytics (where applicable)
4. Capture evidence (screenshots, API payloads, logs, test output).
5. Update status and notes directly in the matrix/checklist.

## Scope Note

This pack focuses on migration parity between legacy and modern behavior.
It does not redefine product roadmap items that are intentionally modern-only (for example: `/notifications`, `/timeline`, `/create`, `/admin/audit`).
