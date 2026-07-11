# Product Workflows Implementation Checklist

Scope: reading/contribution UX, discussions, discovery/ranking, notifications, visualization, and day-to-day workflow quality.

## A. Authoring and Editing Experience

- [ ] `FLOW-001` Implement inline create/edit/reply flows without disruptive page transitions.
  - Done when: create/edit/reply can complete in-context for topics, arguments, questions, issues, and comments.
  - Sources: `Development Phases`, `Wikitruth Tasks`, `Backlog`.

- [ ] `FLOW-002` Implement entry creation wizard from navbar (`Topic`, `Statement`, `Question`) with target-context selection.
  - Done when: users can create entry under correct parent with type-specific defaults.
  - Sources: `Wikitruth Tasks`, `Backlog`.

- [ ] `FLOW-003` Implement clipboard move/copy/link batch workflow across entry types.
  - Done when: users can queue actions and apply them with conflict and permission checks.
  - Sources: `Development Phases`, `Wikitruth Tasks`, `Backlog`.

- [ ] `FLOW-004` Implement entry conversion utility (`Topic <-> Statement/Fact`, plus supported compatible conversions).
  - Done when: conversion preserves history and validates required fields.
  - Sources: `Wikitruth Tasks`, `Backlog`.

- [ ] `FLOW-005` Implement markdown-capable editor with grammar-assist and safe rendering.
  - Done when: editor supports markdown + controlled rich text while preserving sanitization.
  - Sources: `Development Phases`, `Wikitruth Tasks`, `References & Related Materials`.

- [ ] `FLOW-006` Implement compact, readable list cards with expand/collapse and preview controls.
  - Done when: list readability and content density can be toggled with persistent user preference.
  - Sources: `Development Phases`, `Wikitruth Tasks`, `Wikitruth Notes`.

## B. Threading, Discussion, and Debate

- [ ] `FLOW-007` Implement strict argument discussion threads with optional 1v1 alternation mode.
  - Done when: thread rules can enforce alternating replies for selected debate modes.
  - Sources: `Scenarios & Use Cases`, `Mechanics & Architecture`, `Backlog`.

- [ ] `FLOW-008` Implement separate unrated discussion channel for emotional/user sentiment comments.
  - Done when: unrated comments are visible but excluded from truth scoring.
  - Sources: `Scenarios & Use Cases`, `Development Phases`.

- [ ] `FLOW-009` Implement comment classifications (`Supplement`, `Objection`, `Question`) and routing.
  - Done when: classification drives display grouping and moderation behavior.
  - Sources: `Scenarios & Use Cases`, `Wikitruth Notes`.

- [ ] `FLOW-010` Implement discussion obsolescence tagging when parent argument revisions invalidate old comments.
  - Done when: outdated comments can be flagged and optionally hidden with reason metadata.
  - Sources: `Scenarios & Use Cases`, `Versioning & History`.

- [ ] `FLOW-011` Implement issue-discussion tab and action-linked conversations (verdict, issue, move, rename, link).
  - Done when: each action can host context-specific discussion with history.
  - Sources: `Backlog`, `Wikitruth Tasks`.

- [ ] `FLOW-012` Implement thread quality constraints (max length, anti-spam cadence, repeated-post protection).
  - Done when: configured thresholds enforce healthy discussion behavior.
  - Sources: `Development Phases`, `Scenarios & Use Cases`.

## C. Discovery, Ranking, and Navigation

- [ ] `FLOW-013` Implement Home sections (`Latest`, `Trending`, `Top`) with mixed entry feed.
  - Done when: each section has deterministic ranking and pagination behavior.
  - Sources: `Wikitruth Tasks`, `Development Phases`, `FixthePH Notes`.

- [ ] `FLOW-014` Implement Explore filters by type, status, tag, screening state, and relationship.
  - Done when: filter combinations are composable and sharable via URL params.
  - Sources: `Wikitruth Tasks`, `Backlog`.

- [ ] `FLOW-015` Implement sidebar context graph (`Parent`, `Siblings`, `Children`, related entries).
  - Done when: users can navigate local graph without leaving context.
  - Sources: `Wikitruth Tasks`, `Development Phases`, `Backlog`.

- [ ] `FLOW-016` Implement breadcrumb and context title system for deep hierarchies.
  - Done when: current context is always visible and clickable to ancestors.
  - Sources: `Wikitruth Tasks`, `FixthePH Notes`.

- [ ] `FLOW-017` Implement at-a-glance summary blocks targeting 5-second comprehension.
  - Done when: each topic supports concise overview and key takeaways section.
  - Sources: `Wikitruth Tasks`, `Wikitruth Notes`, `Mechanics & Architecture`.

- [ ] `FLOW-018` Implement archived/outdated visibility modes and reader warnings.
  - Done when: readers can switch between current, archived, and outdated entries.
  - Sources: `Development Phases`, `Backlog`.

## D. Voting, Reactions, and Prioritization

- [x] `FLOW-019` Implement non-verdict popularity reactions (`Upvote/Downvote`, `Expose/Bury`, `Good/Bad`).
  - Done when: popularity scores are decoupled from truth/verdict states.
  - Sources: `Development Phases`, `Backlog`, `Upvoting`.

- [ ] `FLOW-020` Implement reviewer-priority queues based on votes, flags, and activity.
  - Done when: reviewer dashboards show priority-sorted review candidates.
  - Sources: `Mechanics & Architecture`, `Upvoting`, `Scenarios & Use Cases`.

- [x] `FLOW-021` Implement contributor/reviewer reputation signals and weighted ranking inputs.
  - Done when: ranking considers reputation + content quality + screening state.
  - Implemented: formula-versioned snapshots plus trusted Explore ranking from reputation, accepted screening, and popularity (`04d75333`).
  - Sources: `Research Features`, `Wikitruth Notes`, `Backlog`.

- [x] `FLOW-022` Implement reviewer badges and contributor profile scorecards.
  - Done when: badge rules are deterministic and visible in profile/timeline.
  - Implemented: deterministic badge thresholds and four-dimension profile/member scorecards (`04d75333`).
  - Sources: `Reviewer Badges`, `Backlog`, `Wikitruth Notes`.

## E. Timeline, Notifications, and Follow System

- [ ] `FLOW-023` Implement unified timeline view for each entry (edits, verdicts, issues, links, discussions).
  - Done when: timeline events are sortable/filterable and linked to source action records.
  - Sources: `Development Phases`, `Wikitruth Tasks`, `Backlog`.

- [ ] `FLOW-024` Implement follow/subscribe system for entries and threads.
  - Done when: followers receive event notifications based on selected triggers.
  - Sources: `Development Phases`, `Backlog`.

- [ ] `FLOW-025` Implement notification center with event types (`screening`, `verdict`, `reply`, `mention`, `new post`).
  - Done when: notification list supports unread counts and deep links.
  - Sources: `Development Phases`, `Backlog`.

- [ ] `FLOW-026` Implement reviewer/screener queue widgets on Home.
  - Done when: pending screening and pending verification summaries are visible to eligible users.
  - Sources: `Wikitruth Tasks`, `Backlog`.

## F. Visualization and Advanced Reading Modes

- [ ] `FLOW-027` Implement network visualization mode for linked topics/arguments/issues/artifacts.
  - Done when: users can traverse graph nodes and open linked entries.
  - Sources: `Development Phases`, `Wikitruth Tasks`, `References & Related Materials`.

- [ ] `FLOW-028` Implement timeline visualization mode with configurable depth.
  - Done when: users can switch between list and timeline while preserving active filters.
  - Sources: `Development Phases`, `Wikitruth Tasks`.

- [ ] `FLOW-029` Implement outline visualization with depth controls and weighted sections.
  - Done when: outline can be generated and manually curated.
  - Sources: `Research Features`, `Wikitruth Notes`, `Backlog`.

- [ ] `FLOW-030` Implement role-aware reading modes (`Nothing but truth`, `Show unreviewed`, `Show metadata/issues`).
  - Done when: each mode has clear scope and survives navigation.
  - Sources: `Mechanics & Architecture`, `Backlog`.

## G. Quality, Performance, and Usability

- [ ] `FLOW-031` Implement mobile-first and desktop-optimized typography/layout presets.
  - Done when: readability metrics and spacing are consistent across breakpoints.
  - Sources: `Development Phases`, `Wikitruth Tasks`, `FixthePH Notes`.

- [ ] `FLOW-032` Implement fast list rendering and incremental loading for deep hierarchies.
  - Done when: nested list performance remains stable under high entry counts.
  - Sources: `Wikitruth Tasks`, `Backlog`.

- [ ] `FLOW-033` Implement keyboard shortcuts and quick action menus for heavy contributors/reviewers.
  - Done when: key authoring/review actions are keyboard-accessible.
  - Sources: `Wikitruth Tasks`.

- [ ] `FLOW-034` Implement semantic HTML and accessibility baseline across entry pages and dialogs.
  - Done when: core screens pass linting and WCAG AA-level checks for primary flows.
  - Sources: `Wikitruth Tasks`.

- [ ] `FLOW-035` Implement UX quality guardrails against clutter and verbosity (compact defaults, concise previews, scoped expansions).
  - Done when: primary pages maintain high signal-to-noise and avoid content overload.
  - Sources: `Backlog`, `Note to self`, `Wikitruth Notes`.
