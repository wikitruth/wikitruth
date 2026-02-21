# TypeScript Strictness Exceptions

Strictness step 1 is enabled in `tsconfig.server.json`:

- `noImplicitAny: true`
- `strictNullChecks: true`
- `strict: true`
- `noUncheckedIndexedAccess: true`
- `allowJs: false` (server compiler scope no longer relies on JS fallback)

Current exception mechanism is line-level `@ts-ignore` on legacy hotspots while the codebase is being incrementally hardened.

Type-improvement project plan and backlog:

- `TYPE_IMPROVEMENT_PROJECT.md`
- `TYPE_IMPROVEMENT_BACKLOG.md`

## Exception Count

- Total files with `@ts-nocheck`: `0`
- Total `@ts-ignore` occurrences (current snapshot): `1644`

## Exception Scope

- `controllers/**` (legacy route and page controller hotspots)
- `middlewares/**` (route composition/auth edge handling)
- `models/**` (legacy schema and plugin interoperability)
- `utils/**` (large legacy helper surface, especially `flowUtils`)

## Explicit JS Exclusions (Server Compiler Scope)

- `app.js`
- `server.js`
- `config/**/*.js`
- `public/templates/jade/**/*.js`

## Tracking Command

Use this command to inspect current exceptions:

```bash
rg -n "@ts-ignore" --glob '*.ts' controllers middlewares models services utils types
```

Or use the project metrics script:

```bash
npm run type:metrics
```

## Reduction Plan

1. Reduce `@ts-ignore` density in `utils/flowUtils.ts` and high-traffic controllers first.
2. Replace line-level suppressions with typed DTO/model interfaces in API/controller boundaries.
3. Add targeted tests whenever suppressions are removed from mutation-heavy flows.
4. Track `@ts-ignore` trend weekly using `npm run type:metrics` until materially reduced.
