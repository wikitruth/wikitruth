# Legacy Compatibility Ownership Map

| Area | Path | Ownership |
| --- | --- | --- |
| Legacy runtime controllers | `legacy/server/controllers/**` | Legacy layer |
| Legacy async controllers | `legacy/server/controllers/async/**` | Legacy layer |
| Legacy templates | `legacy/templates/**` | Legacy layer |
| Legacy static assets | `legacy/static/**` | Legacy layer |
| Legacy build scripts | `legacy/build/**` | Legacy layer |
| Compatibility bridge adapters | `legacy/compatibility/server/{bootstrap.js,mount.js,pathResolver.js}` | Compatibility layer |
| Modern compatibility hooks | `server/src/app.ts`, `server/src/middlewares/routes.ts`, `server/src/config/{config.js,development.json}` | Modern runtime (seam only) |
