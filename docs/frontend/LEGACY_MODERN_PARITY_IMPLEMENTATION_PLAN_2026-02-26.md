# Legacy vs Modern Client Parity Implementation Plan (2026-02-26)

Status legend:
- [ ] Not started
- [x] Completed

## Goal
Close remaining functional gaps between the legacy templates/controllers and the modern React client while keeping legacy flows available for comparison.

## Phase P0: Broken or Missing Core Flows

- [x] P0.1 Fix broken My Diary navigation route in modern client.
Acceptance criteria: Header `My Diary` link resolves to an implemented modern route and no longer lands on 404.

- [x] P0.2 Implement modern Contact form backend submission.
Acceptance criteria: Modern contact page submits to backend endpoint, includes validation, and returns success/error from server (not local-only mock success).

- [x] P0.3 Restore Fast Switch functional parity.
Acceptance criteria: Modern Fast Switch supports PIN-based flow equivalent to legacy behavior (not just shortcut links), with failure and success states.

## Phase P1: Major Feature Parity Gaps

- [x] P1.1 Expand profile contributions to full multi-entity feed parity.
Acceptance criteria: Modern contributions supports all legacy entity buckets (topics, arguments, questions, answers, artifacts, issues, opinions) with tab/slice behavior.

- [ ] P1.2 Complete profile settings parity.
Acceptance criteria: Modern profile settings includes legacy-equivalent Fast Switch enable/disable + PIN management and existing private-profile controls.

- [ ] P1.3 Complete account settings parity.
Acceptance criteria: Modern account settings includes contact info update, identity update, password update, and social account connect/disconnect parity.

- [ ] P1.4 Complete entry detail parity for topic/argument/question/issue/opinion/answer/artifact pages.
Acceptance criteria: Related/child lists and discussion/context sections match legacy behavior where applicable; counts are not hardcoded placeholders.

- [ ] P1.5 Implement entry actions parity (more/options menu).
Acceptance criteria: Modern entry option surface supports key legacy actions (edit/report/follow/share, role-aware admin and screener actions).

- [ ] P1.6 Restore search behavior parity.
Acceptance criteria: Modern search supports content scope (`all/wiki/diary`), tab routing, and “view more” semantics aligned with legacy.

- [ ] P1.7 Restore contextual sidebar/navigation parity.
Acceptance criteria: Modern layout provides legacy-equivalent contextual side navigation (section context, diary/groups shortcuts, related links) with responsive behavior.

- [ ] P1.8 Correct parity report accuracy.
Acceptance criteria: Existing parity matrix reflects true current state and no longer marks incomplete areas as fully done.

## Phase P2: Secondary and Cleanup Parity

- [ ] P2.1 Add missing Home artifacts section in modern homepage.
Acceptance criteria: If artifacts exist in home payload, modern home renders an artifacts block with links.

- [ ] P2.2 Resolve or retire unwired migration scaffolds under `client/src/pages/Wiki/*`.
Acceptance criteria: Each scaffold page is either fully wired and implemented or documented as deferred/retired with explicit rationale.

- [ ] P2.3 Add regression tests for parity-critical routes.
Acceptance criteria: Tests cover P0/P1 route behavior for diary/contact/fast-switch/contributions/account-settings/search and fail on regressions.

## Cross-Cutting Implementation Rules

- [ ] C1 Keep legacy templates/controllers intact for side-by-side comparison.

- [ ] C2 Deliver in small commits per checklist item.

- [ ] C3 Update this checklist immediately after each completed item.

- [ ] C4 Run targeted verification after each item (`npm test` scope + smoke checks for touched routes/pages).

## Suggested Execution Order

- [ ] S1 P0.1 -> P0.2 -> P0.3
- [ ] S2 P1.1 -> P1.2 -> P1.3
- [ ] S3 P1.4 -> P1.5 -> P1.6 -> P1.7
- [ ] S4 P2.1 -> P2.2 -> P2.3
- [ ] S5 Final parity matrix/doc refresh
