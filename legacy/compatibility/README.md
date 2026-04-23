# Legacy Compatibility Workspace

This directory is the bridge layer between modern runtime and the legacy stack.

## Boundaries

- Legacy implementation lives in `legacy/` (`legacy/server`, `legacy/templates`, `legacy/static`, `legacy/build`).
- Modern implementation stays in `client/`, `server/src/`, and modern `public/`.
- Mixed modern+legacy integration is limited to thin mount/proxy seams here.

## Structure

- `server/bootstrap.ts` compatibility bootstrap entrypoint
- `server/mount.ts` static/template mount adapter
- `server/pathResolver.ts` legacy-root path resolver utility
- `contracts/` path map and compatibility manifests
