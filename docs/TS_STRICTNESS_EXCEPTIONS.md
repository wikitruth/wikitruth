# TypeScript Strictness Exceptions

Strictness step 1 is enabled in `tsconfig.server.json`:

- `noImplicitAny: true`
- `strictNullChecks: true`

Current exception mechanism is `@ts-nocheck` on migrated legacy modules while the codebase is being incrementally typed.

## Exception Count

- Total files with `@ts-nocheck`: `95`

## Exception Scope

- `controllers/**` (legacy route and page controllers)
- `middlewares/**` (route wiring and policy middlewares)
- `models/**` (schema modules and model wiring)
- `services/**` (domain service layer)
- `utils/**` (legacy utility layer)
- `types/http.ts` (temporary interop typing gap while strict migration is in progress)

## Tracking Command

Use this command to inspect current exceptions:

```bash
rg -n "@ts-nocheck" --glob '*.ts' controllers middlewares models services utils types
```

## Reduction Plan

1. Remove `@ts-nocheck` from middleware and utility modules first.
2. Remove `@ts-nocheck` from service modules after model interfaces are tightened.
3. Remove `@ts-nocheck` from controllers after request/response model typing is stabilized.
4. Keep schema plugins and legacy edge models last due highest typing surface area.
