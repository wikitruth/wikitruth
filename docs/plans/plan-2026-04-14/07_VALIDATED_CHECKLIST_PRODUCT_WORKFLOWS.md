# Validated Checklist: Product Workflows (Code-Rechecked)

Date validated: 2026-04-14  
Validation basis: current repository code (`server/src`, `client/src`) only.

Status legend:
- `implemented`
- `partial`
- `not_implemented`

## A. Authoring and Editing Experience

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| FLOW-001 | `not_implemented` | Create/edit/reply routes exist, but use dedicated pages (for example create/edit pages and opinion create route). | No in-context inline authoring/edit/reply UX across types. |
| FLOW-002 | `partial` | Separate create pages exist (`Topic`, `Argument`, `Question`) and context can be passed (`topicId`, query params, group context). | No unified navbar creation wizard with guided target-context selection and type defaults in one flow. |
| FLOW-003 | `partial` | Modern clipboard page supports local save/remove; legacy async clipboard supports mark/move/paste-link batch actions. | Modern workflow lacks full batch move/copy/link conflict+permission checks end-to-end. |
| FLOW-004 | `not_implemented` | `ConvertPage` updates verdict status via moderation APIs. | No entity-type conversion (`Topic <-> Statement/Fact`) preserving history. |
| FLOW-005 | `partial` | TipTap rich editor + sanitization pipeline (client and server) implemented. | No grammar-assist layer and no explicit markdown-first roundtrip guarantees. |
| FLOW-006 | `partial` | List rows and content previews exist; some pages support search/sort and content collapse. | No robust expand/collapse density controls with persistent per-user list-card presentation preferences across app sections. |

## B. Threading, Discussion, and Debate

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| FLOW-007 | `not_implemented` | Discussion comments (`Opinion`) exist with parent links. | No strict debate modes (including optional 1v1 alternation enforcement). |
| FLOW-008 | `partial` | `Opinion`/comments are operationally separate from verdict scoring flow. | No explicit unrated emotional/sentiment channel model and policy boundaries. |
| FLOW-009 | `not_implemented` | Opinion model has no classification field for supplement/objection/question. | No classification-driven routing/grouping/moderation behavior. |
| FLOW-010 | `not_implemented` | No revision invalidation pipeline was found for existing comments. | No obsolescence tagging/hiding tied to parent argument revisions. |
| FLOW-011 | `partial` | Entry pages show issues + comments; issue pages include discussion-like comments. | No action-linked conversation threads for verdict/move/rename/link operations with dedicated history contexts. |
| FLOW-012 | `not_implemented` | No thread cadence/anti-spam constraints found in discussion handlers. | Missing max thread length, repeated-post protection, and cadence controls. |

## C. Discovery, Ranking, and Navigation

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| FLOW-013 | `partial` | Home page serves mixed latest entries and sectioned lists from `/api/home`. | No explicit `Trending`/`Top` ranked sections with deterministic ranking definitions. |
| FLOW-014 | `partial` | Explore supports type tabs; list/search pages support view modes and query params. | Missing comprehensive filter matrix (status/tag/relationship/screening combinations with sharable URL state). |
| FLOW-015 | `partial` | Context sidebar provides topic children/siblings/related links; topic navigation context is present. | Context graph behavior is incomplete for non-topic entities and broader graph traversal cases. |
| FLOW-016 | `partial` | Breadcrumbs exist on many pages; page headers/tabs provide context. | Deep hierarchy breadcrumbing to full ancestor chains is not consistently implemented. |
| FLOW-017 | `partial` | Topic page includes key topics/key facts blocks and metadata labels. | No standardized 5-second summary block schema with enforced key takeaways across all topics. |
| FLOW-018 | `partial` | Archived status exists in screening model/query logic on backend. | Modern UI lacks strong archived/outdated mode toggles and clear stale-warning presentation. |

## D. Voting, Reactions, and Prioritization

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| FLOW-019 | `implemented` | Persisted reactions now use `/api/reactions` (`server/src/controllers/api/reactions.ts`) + `Reaction` model (`server/src/models/schema/core/Reaction.ts`) and modern `EntryQuickActions` wires `Upvote/Downvote`, `Expose/Bury`, and `Good/Bad` with per-user state and counts (`client/src/components/Entry/EntryQuickActions.tsx`). | No remaining parity gap in reaction wiring; future tuning may focus on ranking/queue usage of reaction signals. |
| FLOW-020 | `partial` | Admin verdict queue exists with filtering and batch updates. | No reviewer-priority queue scoring from votes/flags/activity signals. |
| FLOW-021 | `not_implemented` | No reputation engine or weighted ranking model found. | Missing contributor/reviewer reputation metrics integrated into ranking. |
| FLOW-022 | `partial` | Profile contribution counters and sections exist. | No deterministic reviewer badge system or robust contributor scorecards tied to explicit rules. |

## E. Timeline, Notifications, and Follow System

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| FLOW-023 | `not_implemented` | “View History” action only routes to `?tab=history`; no timeline renderer or event model. | No unified sortable/filterable entry timeline linked to source actions. |
| FLOW-024 | `partial` | Follow toggle exists in entry actions using localStorage keys; profile has derived “following” view. | No true backend subscriptions for entries/threads and no trigger-configured event delivery. |
| FLOW-025 | `not_implemented` | Header has notification bell button with no notification center flow. | No notification inbox, unread counts, event typing, or deep links. |
| FLOW-026 | `partial` | Admin dashboard exposes verdict queue shortcut and realtime status. | No home-page screener/reviewer widgets summarizing pending screening + verification queues. |

## F. Visualization and Advanced Reading Modes

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| FLOW-027 | `implemented` | `VisualizePage` renders navigable graph nodes/edges with linked entry open behavior (vis-network). | Further quality improvements are possible, but core network visualization mode is implemented. |
| FLOW-028 | `not_implemented` | No timeline visualization route/component discovered. | Missing configurable timeline-depth visualization and list/timeline state parity. |
| FLOW-029 | `partial` | Outline tree/search/link APIs + outline link UI exist. | No weighted-section visualization and no mature manual curation UX for complete outline view management. |
| FLOW-030 | `partial` | View modes (`all/wiki/original`) exist in filters and are persisted locally on several pages. | Not role-aware “reading mode” system (`Nothing but truth`, metadata/issues overlays, etc.) with consistent cross-navigation persistence. |

## G. Quality, Performance, and Usability

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| FLOW-031 | `partial` | Responsive Bootstrap-based layouts and mobile nav/toggle behavior are present. | No explicit typography/layout preset system with measured readability targets across breakpoints. |
| FLOW-032 | `partial` | Pagination and bounded list limits exist in many pages and APIs. | No virtualization/incremental deep-hierarchy optimization strategy validated at high scale. |
| FLOW-033 | `partial` | Global shortcuts (`/`, `Ctrl/Cmd+K`, `?`, `Esc`) and action menus exist. | Heavy contributor/reviewer shortcut coverage (authoring/moderation operations) remains incomplete. |
| FLOW-034 | `partial` | Semantic improvements and ARIA usage are present; accessibility audit tests exist for selected components. | WCAG AA verification is not comprehensive across primary flows/dialogs. |
| FLOW-035 | `partial` | Several pages use compact list presentation, previews, and scoped sections. | No formal UX guardrail framework enforcing anti-clutter defaults and verbosity controls app-wide. |

## Summary

- `implemented`: 2 (`FLOW-019`, `FLOW-027`)
- `partial`: 22
- `not_implemented`: 11

Primary workflow gaps: inline authoring, true conversion + CR/history flows, reactions/reputation, notification center + real subscriptions, timeline UX, and stronger filtering/ranking systems.
