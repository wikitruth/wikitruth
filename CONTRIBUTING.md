# Contributing to Wikitruth

Thank you for helping improve Wikitruth. Contributions should make public
knowledge easier to examine while preserving evidence, context, safety, and
fairness.

## Before You Start

- Read the project `README.md` and the concise system contracts in
  `docs/canonical/`.
- Search existing issues and pull requests before proposing overlapping work.
- Open an issue before a large architectural, data-model, governance, or user
  experience change so the direction can be discussed first.
- Report vulnerabilities privately according to `SECURITY.md`.

## Development Setup

Wikitruth supports Node.js 22 and 24. Use the version declared in `.nvmrc` when
available.

```bash
npm ci
npm run dev:all
```

Do not commit local `.env` files. Refer to
`docs/frontend/ENVIRONMENT_VARIABLES.md` for configuration guidance and use
synthetic data for local development and tests.

## Contribution Workflow

1. Fork the repository and create a focused branch.
2. Make one coherent change at a time.
3. Add or update tests for behavior changes.
4. Run the relevant validation locally.
5. Open a pull request targeting `develop` and explain the change, its impact,
   and the checks you ran.

`master` is the default release branch. Normal contributions should enter
through `develop` rather than being pushed directly to `master`.

## Validation

At minimum, run the smoke checks and the tests relevant to your change:

```bash
npm run ci:smoke
npm run test:server -- --runInBand
npm run test:client -- --runInBand
npm run build
```

The complete pull-request pipeline runs `npm run test:ci`. Browser-facing
changes should also include appropriate Playwright, accessibility, or visual
verification.

## Contribution Standards

- Use the project name **Wikitruth**.
- Keep source files at or below 1,000 lines whenever practical.
- Preserve API, URL, data, and legacy-compatibility contracts unless the pull
  request explicitly changes an approved contract.
- Keep public-interest claims source-attributed and distinguish evidence,
  allegations, opinions, and outcomes.
- Do not introduce reputation or guilt scores, inherited liability, harassment,
  doxxing, or unnecessary personal data.
- Never commit secrets, production exports, private records, or third-party
  material that the project does not have permission to redistribute.
- Keep generated files and unrelated formatting changes out of focused pull
  requests.

## Pull Requests

A useful pull request includes:

- what changed and why;
- the user-visible and technical impact;
- migration, compatibility, security, or rollback considerations;
- screenshots for meaningful interface changes; and
- the exact validation performed.

Maintainers may ask for changes when a contribution conflicts with canonical
system behavior, lacks evidence or tests, creates privacy or safety risks, or
mixes unrelated work.

## Licensing

By submitting a contribution, you agree that it may be distributed under the
repository's GNU Affero General Public License v3.0 or later (`AGPL-3.0-or-later`).
Only submit work you have the right to license.
