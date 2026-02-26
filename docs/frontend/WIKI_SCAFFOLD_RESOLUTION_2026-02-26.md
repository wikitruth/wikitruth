# Wiki Scaffold Resolution (2026-02-26)

## Scope

Resolve unwired migration scaffolds under `client/src/pages/Wiki/*` by explicitly retiring them from the active modern route surface.

## Verification

- `client/src/routes/routeConfig.tsx` does not reference `client/src/pages/Wiki/*`.
- Active modern route surface uses non-scaffold pages under `client/src/pages/*` (for example: `TopicEntryPage.tsx`, `ArgumentEntryPage.tsx`, `QuestionEntryPage.tsx`, `IssueEntryPage.tsx`, `OpinionEntryPage.tsx`, `AnswerEntryPage.tsx`, `ArtifactEntryPage.tsx`, `SearchPage.tsx`, `VisualizePage.tsx`).

## Resolution Decision

Status legend:
- `Retired` = kept as migration reference only, intentionally not routed.
- `Modern replacement` = current page(s) that implement the active behavior.

| Scaffold group | Scaffold paths | Status | Modern replacement |
|---|---|---|---|
| Topics | `client/src/pages/Wiki/Topics/*` | Retired | `client/src/pages/TopicsPage.tsx`, `client/src/pages/TopicCreatePage.tsx`, `client/src/pages/TopicEntryPage.tsx` |
| Arguments | `client/src/pages/Wiki/Arguments/*` | Retired | `client/src/pages/ArgumentsPage.tsx`, `client/src/pages/ArgumentCreatePage.tsx`, `client/src/pages/ArgumentEntryPage.tsx` |
| Questions | `client/src/pages/Wiki/Questions/*` | Retired | `client/src/pages/QuestionsPage.tsx`, `client/src/pages/QuestionCreatePage.tsx`, `client/src/pages/QuestionEntryPage.tsx` |
| Answers | `client/src/pages/Wiki/Answers/*` | Retired | `client/src/pages/AnswersPage.tsx`, `client/src/pages/AnswerCreatePage.tsx`, `client/src/pages/AnswerEntryPage.tsx` |
| Artifacts | `client/src/pages/Wiki/Artifacts/*` | Retired | `client/src/pages/ArtifactsPage.tsx`, `client/src/pages/ArtifactCreatePage.tsx`, `client/src/pages/ArtifactEntryPage.tsx` |
| Issues | `client/src/pages/Wiki/Issues/*` | Retired | `client/src/pages/IssuesPage.tsx`, `client/src/pages/IssueCreatePage.tsx`, `client/src/pages/IssueEntryPage.tsx` |
| Opinions | `client/src/pages/Wiki/Opinions/*` | Retired | `client/src/pages/OpinionsPage.tsx`, `client/src/pages/OpinionCreatePage.tsx`, `client/src/pages/OpinionEntryPage.tsx` |
| Misc wiki flows | `client/src/pages/Wiki/Explore/*`, `client/src/pages/Wiki/Visualize/*`, `client/src/pages/Wiki/Related/*`, `client/src/pages/Wiki/Convert/*`, `client/src/pages/Wiki/Outline/*`, `client/src/pages/Wiki/Screening/*`, `client/src/pages/Wiki/Verdict/*` | Retired | `client/src/pages/SearchPage.tsx`, `client/src/pages/VisualizePage.tsx`, entry actions/screening/admin parity routes in active modern pages |

## Rationale

- Keeping scaffolds preserves migration history and implementation references.
- Retiring them from routing avoids duplicate code paths and false parity assumptions.
- Active parity work should target the routed modern pages only.
