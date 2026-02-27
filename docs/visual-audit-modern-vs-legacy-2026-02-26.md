# Visual Audit: Legacy vs Modern Client (2026-02-26)

## Scope

- Compared legacy routes (`/…`) against modern routes (`/app/…`) on the same local dataset.
- Captured full-page screenshots for list/index routes and detail/entry routes.
- Screenshot set:
  - `/Users/dsalunga/Projects/Wikitruth/wikitruth/.build/visual-audit/2026-02-26/legacy`
  - `/Users/dsalunga/Projects/Wikitruth/wikitruth/.build/visual-audit/2026-02-26/modern`

## Summary

- Total route pairs audited: `29`
- Critical regressions (modern route broken): `0`
- Major visual/functional drift (works but materially different flow): `0`
- Minor/moderate drift: `29`

## Critical Regressions (P0)

- [x] `arguments` entry restored:
  - Legacy: `/argument/the-fda-has-received-many-anecdotal-reports-of-adverse-reactions-to-foods-containing-msg/5a4df5791271ae80f6009554`
  - Modern: `/app/arguments/entry/the-fda-has-received-many-anecdotal-reports-of-adverse-reactions-to-foods-containing-msg/5a4df5791271ae80f6009554`
  - API: `GET /api/arguments/entry/5a4df5791271ae80f6009554` now returns `200` (verified `2026-02-27`).
- [x] `questions` entry restored:
  - Legacy: `/question/accepted-question/5896a1f7ad8ebac0293812ca`
  - Modern: `/app/questions/entry/accepted-question/5896a1f7ad8ebac0293812ca`
  - API: `GET /api/questions/entry/5896a1f7ad8ebac0293812ca` now returns `200` (verified `2026-02-27`).
- [x] `issues` entry restored:
  - Legacy: `/issue/abc/595e4fcc37c6cc10212e1689`
  - Modern: `/app/issues/entry/abc/595e4fcc37c6cc10212e1689`
  - API: `GET /api/issues/entry/595e4fcc37c6cc10212e1689` now returns `200` (verified `2026-02-27`).
- [x] `opinions` entry restored:
  - Legacy: `/opinion/abc/595e4fd637c6cc10212e168a`
  - Modern: `/app/opinions/entry/abc/595e4fd637c6cc10212e168a`
  - API: `GET /api/opinions/entry/595e4fd637c6cc10212e168a` now returns `200` (verified `2026-02-27`).
- [x] `artifacts` entry restored:
  - Legacy: `/artifact/sample-artifact/59e467f7ea72bc2893f3f83e`
  - Modern: `/app/artifacts/entry/sample-artifact/59e467f7ea72bc2893f3f83e`
  - API: `GET /api/artifacts/entry/59e467f7ea72bc2893f3f83e` now returns `200` (verified `2026-02-27`).

## Major Drift (P1)

- [x] `visualize` page parity restored:
  - Modern now renders an interactive graph/network canvas with node click navigation and fullscreen toggle.
- [x] Topic entry richness parity restored:
  - Modern now includes stat cards, collapsible body/see-more behavior, branch context blocks, and richer related-topic sections.
- [x] Member profile overview parity restored:
  - Modern now includes contribution stat tiles and legacy summary placeholders (`Account Details`, `Reputation`, `Timeline & Activities`).
- [x] Member contributions parity restored:
  - Modern now includes `Latest/Popular` and screening-state filters plus grouped per-type sections with headings/icons.
- [x] Fast-switch UX parity restored:
  - Modern now uses tabbed `Login / Fast Switch` and a multi-box 6-digit PIN flow.
- [x] Contact page split layout parity restored:
  - Modern now mirrors legacy two-column form + right-side contact info panel.
- [x] Login page flow/layout parity restored:
  - Modern now uses legacy-style `Login / Fast Switch` tabs and side-by-side social/CTA block.

## Minor/Moderate Drift (P2)

- [x] Header/sidebar detail parity:
  - Context sidebar now includes denser `Browse` and contextual relation blocks across major entry routes.
- [x] Explore/top-level route mapping consistency:
  - Modern client now exposes `/app/explore` as an explicit route and uses it in primary navigation.
- [x] Visual token parity:
  - Modern profile header gradient is pinned to legacy token values.
- [x] Empty-state copy parity:
  - Extra member-directory helper subtitles were removed to match legacy voice.

## Route-by-Route Snapshot Status

| Pair | Status |
|---|---|
| home (`/` vs `/app`) | Minor drift |
| explore (`/explore` vs `/app/explore`) | Moderate drift |
| topics (`/topics` vs `/app/topics`) | Moderate drift |
| arguments (`/arguments` vs `/app/arguments`) | Minor drift |
| questions (`/questions` vs `/app/questions`) | Minor drift |
| answers (`/answers` vs `/app/answers`) | Moderate drift |
| artifacts (`/artifacts` vs `/app/artifacts`) | Minor drift |
| issues (`/issues` vs `/app/issues`) | Minor drift |
| opinions (`/opinions` vs `/app/opinions`) | Minor drift |
| groups (`/groups` vs `/app/groups`) | Minor drift |
| members (`/members` vs `/app/members`) | Minor drift |
| screeners/reviewers/administrators | Minor drift |
| search (`/search` vs `/app/search`) | Minor drift |
| visualize (`/visualize` vs `/app/visualize`) | Moderate drift |
| contact (`/contact` vs `/app/contact`) | Moderate drift |
| fast-switch (`/fast-switch` vs `/app/fast-switch`) | Moderate drift |
| login (`/login` vs `/app/login`) | Moderate drift |
| topic entry | Moderate drift |
| argument/question/issue/opinion/artifact entry | Moderate drift |
| member profile/contributions | Moderate drift |

## Implementation Order

- [x] P0: Fix all broken entry APIs and modern detail pages first.
- [x] P1: Restore major missing UX sections (visualize graph, profile stats/filter blocks, fast-switch interaction pattern, contact/login layout parity).
- [x] P2: Tighten remaining sidebar/context/detail styling parity.
