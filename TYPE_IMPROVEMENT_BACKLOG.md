# Type Improvement Backlog

Derived from `TYPE_IMPROVEMENT_PROJECT.md`.

## P0 Foundations (1-2 Weeks)

- [x] `TP-01` Baseline automation: add and run type metrics command (`npm run type:metrics`).
- [x] `TP-02` Guardrails: reject new file-level `@ts-nocheck` additions in scoped server TS directories.
- [x] `TP-03` Remove `@ts-nocheck` from `types/http.ts` with strict typed request/response contracts.
- [x] `TP-04` Remove `@ts-nocheck` from `middlewares/requestValidation.ts` and `middlewares/apiError.ts`.
- [x] `TP-05` Remove `@ts-nocheck` from `middlewares/requestContext.ts` and `utils/logger.ts`.

## P1 Utilities and Services (2-4 Weeks)

- [x] `TP-06` Remove `@ts-nocheck` from `utils/httpClient.ts`, `utils/utils.ts`, `utils/mongoose.ts`.
- [x] `TP-07` Remove `@ts-nocheck` from `utils/flowUtils.ts`, `utils/workflow/index.ts`, `utils/sendmail/index.ts`, `utils/slugify/index.ts`.
- [x] `TP-08` Remove `@ts-nocheck` from `services/*` with explicit return types and model boundary interfaces.
- [ ] `TP-09` Add typed error classes/codes used by services and API envelope.

## P2 Controllers (4-7 Weeks)

- [ ] `TP-10` Remove `@ts-nocheck` from `controllers/api/*` with typed params/query/body DTOs.
- [ ] `TP-11` Remove `@ts-nocheck` from `controllers/async/*` with typed session locals and service calls.
- [ ] `TP-12` Remove `@ts-nocheck` from remaining non-API controllers without route behavior changes.

## P3 Models and Final Strictness (7-10 Weeks)

- [ ] `TP-13` Remove `@ts-nocheck` from non-schema model wiring files (`models/*.ts`, `models/schema/models.ts`).
- [ ] `TP-14` Remove `@ts-nocheck` from schema modules incrementally by domain (`account`, then `core`).
- [ ] `TP-15` Remove `@ts-nocheck` from schema plugins and finalize typed plugin interfaces.
- [ ] `TP-16` Reach zero `@ts-nocheck`; update strictness exceptions doc and close project.

## Done Criteria

- [ ] `@ts-nocheck = 0` across scoped server TS files.
- [ ] `npm run build:server` passes under strict mode.
- [ ] `npm run test:server` passes.
- [ ] Tracking docs updated (`TYPE_IMPROVEMENT_PROJECT.md`, `docs/TS_STRICTNESS_EXCEPTIONS.md`).
