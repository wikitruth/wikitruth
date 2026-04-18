# Legacy Compatibility Workspace

This directory is the isolated home for legacy runtime assets and code.

## Boundaries

- Legacy implementation lives here.
- Modern implementation stays in `client/`, `server/src/`, and modern `public/`.
- Modern server integration is limited to thin mount/proxy seams.

## Structure

- `server/` legacy controllers and compatibility mount
- `server/pathResolver.js` compatibility path resolver utility
- `templates/` dust/jade templates
- `static/` legacy static assets (`css`, `js`, `layouts`, `views`, `components`, etc.)
- `build/` Grunt/task + bower/jshint-era build files
- `config/` compatibility configuration artifacts
- `contracts/` path map and compatibility manifests
