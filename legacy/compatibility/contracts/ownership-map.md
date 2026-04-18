# Legacy Compatibility Ownership Map

| Area | Path | Ownership |
| --- | --- | --- |
| Legacy runtime controllers | `legacy/compatibility/server/controllers/**` | Compatibility layer |
| Legacy async controllers | `legacy/compatibility/server/controllers/async/**` | Compatibility layer |
| Legacy templates | `legacy/compatibility/templates/**` | Compatibility layer |
| Legacy static assets | `legacy/compatibility/static/**` | Compatibility layer |
| Legacy build scripts | `legacy/compatibility/build/**` | Compatibility layer |
| Compatibility mount + resolver | `legacy/compatibility/server/{mount.js,pathResolver.js}` | Compatibility layer |
| Modern seam wrappers | `server/src/controllers/*.ts`, `server/src/controllers/async/*.ts` | Modern runtime (seam only) |
| Modern compatibility hooks | `server/src/app.ts`, `server/src/middlewares/routes.ts`, `server/src/config/development.json` | Modern runtime (seam only) |
