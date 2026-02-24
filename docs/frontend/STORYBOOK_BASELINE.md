# Storybook Baseline

This project now includes an optional Storybook setup for component cataloging and baseline visual regression workflows.

## Commands

- Start Storybook dev server:
  - `npm run storybook`
- Build static Storybook output:
  - `npm run storybook:build`

## Scope

- Framework: `@storybook/react-webpack5`
- Addons: essentials + interactions
- Initial stories:
  - `client/src/stories/Button.stories.js`
  - `client/src/stories/LoadingSpinner.stories.js`

## Visual Diffing Baseline

Use static Storybook builds as the baseline artifact for visual checks in CI (for example with Chromatic or an equivalent screenshot diff service).

Recommended baseline flow:

1. Build static Storybook with `npm run storybook:build`.
2. Publish build output (`storybook-static`) in CI.
3. Run external snapshot diff tooling against pull request builds.
