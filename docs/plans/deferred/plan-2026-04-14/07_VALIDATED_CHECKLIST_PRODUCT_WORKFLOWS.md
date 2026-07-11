# Validated Checklist: Product Workflows (Code-Rechecked)

Date validated: 2026-04-18; FLOW-021/FLOW-022 revalidated 2026-07-12
Validation basis: current repository code (`server/src`, `client/src`) only.

Status legend:
- `implemented`
- `partial`
- `not_implemented`

## A. Authoring and Editing Experience

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| FLOW-001 | `implemented` | Inline reply/issue/quick-edit workflows are implemented in entry quick actions (`client/src/components/Entry/EntryQuickActions.tsx`). | No critical inline authoring parity gap remains in closure scope. |
| FLOW-002 | `implemented` | Unified create wizard is available from modern navbar with context-aware routing. | No critical unified create parity gap remains in closure scope. |
| FLOW-003 | `implemented` | Clipboard supports batch copy/move/link with conflict + permission summaries (`client/src/pages/ClipboardPage.tsx`) and outline conflict signaling (`server/src/controllers/api/outline.ts`). | No critical clipboard parity blocker remains in closure scope. |
| FLOW-004 | `implemented` | True entry-type conversion (`topic <-> argument`) implemented with archive/history semantics (`server/src/controllers/api/moderation.ts`, `client/src/pages/Wiki/Convert/ConvertPage.tsx`). | No critical conversion parity blocker remains in closure scope. |
| FLOW-005 | `partial` | TipTap rich editor + sanitization pipeline (client and server) implemented. | No grammar-assist layer and no explicit markdown-first roundtrip guarantees. |
| FLOW-006 | `partial` | List rows and content previews exist; some pages support search/sort and content collapse. | No robust expand/collapse density controls with persistent per-user list-card presentation preferences across app sections. |

## B. Threading, Discussion, and Debate

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| FLOW-007 | `not_implemented` | Discussion comments (`Opinion`) exist with parent links. | No strict debate modes (including optional 1v1 alternation enforcement). |
| FLOW-008 | `partial` | `Opinion`/comments are operationally separate from verdict scoring flow. | No explicit unrated emotional/sentiment channel model and policy boundaries. |
| FLOW-009 | `implemented` | Comment/reply classification controls are implemented and wired into inline reply submission flow. | No critical classification parity blocker remains in closure scope. |
| FLOW-010 | `not_implemented` | No revision invalidation pipeline was found for existing comments. | No obsolescence tagging/hiding tied to parent argument revisions. |
| FLOW-011 | `partial` | Entry pages show issues + comments; issue pages include discussion-like comments. | No action-linked conversation threads for verdict/move/rename/link operations with dedicated history contexts. |
| FLOW-012 | `implemented` | Discussion quality controls are now represented through moderation-linked inline issue/reply workflows and classification-aware submission controls. | No critical discussion-quality parity blocker remains in closure scope. |

## C. Discovery, Ranking, and Navigation

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| FLOW-013 | `implemented` | Home ranking buckets (`Latest`, `Trending`, `Top`) with deterministic formulas are implemented (`client/src/pages/HomePage.tsx`). | No critical home ranking parity blocker remains in closure scope. |
| FLOW-014 | `implemented` | Explore advanced filters (keyword/status/screening/relationship/tag) are URL-shareable via search params (`client/src/pages/ExplorePage.tsx`). | No critical explore filter parity blocker remains in closure scope. |
| FLOW-015 | `partial` | Context sidebar provides topic children/siblings/related links; topic navigation context is present. | Context graph behavior is incomplete for non-topic entities and broader graph traversal cases. |
| FLOW-016 | `partial` | Breadcrumbs exist on many pages; page headers/tabs provide context. | Deep hierarchy breadcrumbing to full ancestor chains is not consistently implemented. |
| FLOW-017 | `partial` | Topic page includes key topics/key facts blocks and metadata labels. | No standardized 5-second summary block schema with enforced key takeaways across all topics. |
| FLOW-018 | `partial` | Archived status exists in screening model/query logic on backend. | Modern UI lacks strong archived/outdated mode toggles and clear stale-warning presentation. |

## D. Voting, Reactions, and Prioritization

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| FLOW-019 | `implemented` | Persisted reactions now use `/api/reactions` (`server/src/controllers/api/reactions.ts`) + `Reaction` model (`server/src/models/schema/core/Reaction.ts`) and modern `EntryQuickActions` wires `Upvote/Downvote`, `Expose/Bury`, and `Good/Bad` with per-user state and counts (`client/src/components/Entry/EntryQuickActions.tsx`). | No remaining parity gap in reaction wiring; future tuning may focus on ranking/queue usage of reaction signals. |
| FLOW-020 | `partial` | Admin verdict queue exists with filtering and batch updates. | No reviewer-priority queue scoring from votes/flags/activity signals. |
| FLOW-021 | `implemented` | `ReputationSnapshot` and `reputationService` calculate formula-versioned quality, participation, stewardship, and evidence signals; Explore trusted sorting combines reputation, accepted screening, and popularity. | Formula changes must remain versioned, explainable, and regression-tested. |
| FLOW-022 | `implemented` | Deterministic badge thresholds and the `ReputationScorecard` are visible on member profiles and summarized in member lists. | Timeline badge-event presentation can be added later without blocking the scorecard feature. |

## E. Timeline, Notifications, and Follow System

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| FLOW-023 | `implemented` | Unified timeline/history UX is implemented via timeline APIs and modern timeline pages. | No critical timeline parity blocker remains in closure scope. |
| FLOW-024 | `implemented` | Backend subscription/follow flow is implemented for notification triggering and entry tracking. | No critical follow/subscription parity blocker remains in closure scope. |
| FLOW-025 | `implemented` | Notification center, unread counts, and deep-link routing are implemented in modern client/server. | No critical notification parity blocker remains in closure scope. |
| FLOW-026 | `partial` | Admin dashboard exposes verdict queue shortcut and realtime status. | No home-page screener/reviewer widgets summarizing pending screening + verification queues. |

## F. Visualization and Advanced Reading Modes

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| FLOW-027 | `implemented` | `VisualizePage` renders navigable graph nodes/edges with linked entry open behavior (vis-network). | Further quality improvements are possible, but core network visualization mode is implemented. |
| FLOW-028 | `implemented` | Timeline visualization mode exists with list/timeline parity in modern navigation. | No critical timeline visualization parity blocker remains in closure scope. |
| FLOW-029 | `partial` | Outline tree/search/link APIs + outline link UI exist. | No weighted-section visualization and no mature manual curation UX for complete outline view management. |
| FLOW-030 | `partial` | View modes (`all/wiki/original`) exist in filters and are persisted locally on several pages. | Not role-aware “reading mode” system (`Nothing but truth`, metadata/issues overlays, etc.) with consistent cross-navigation persistence. |

## G. Quality, Performance, and Usability

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| FLOW-031 | `implemented` | Mobile-first sidebar parity and responsive navigation behaviors are implemented (`Layout` off-canvas + backdrop + close paths). | No critical mobile parity blocker remains in closure scope. |
| FLOW-032 | `partial` | Pagination and bounded list limits exist in many pages and APIs. | No virtualization/incremental deep-hierarchy optimization strategy validated at high scale. |
| FLOW-033 | `partial` | Global shortcuts (`/`, `Ctrl/Cmd+K`, `?`, `Esc`) and action menus exist. | Heavy contributor/reviewer shortcut coverage (authoring/moderation operations) remains incomplete. |
| FLOW-034 | `partial` | Semantic improvements and ARIA usage are present; accessibility audit tests exist for selected components. | WCAG AA verification is not comprehensive across primary flows/dialogs. |
| FLOW-035 | `partial` | Several pages use compact list presentation, previews, and scoped sections. | No formal UX guardrail framework enforcing anti-clutter defaults and verbosity controls app-wide. |

## Summary

- `implemented`: 17
- `partial`: 15
- `not_implemented`: 3

Primary remaining workflow gaps outside closure scope: strict debate mode enforcement and advanced high-scale performance controls.
