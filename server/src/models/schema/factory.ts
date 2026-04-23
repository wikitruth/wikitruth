'use strict';

import type { Mongoose } from 'mongoose';

/**
 * Common type for the legacy schema factory pattern used throughout
 * `server/src/models/schema/**`.
 *
 * Each schema module exports a function with this signature via `export =`,
 * which mirrors the historical CJS shape `module.exports = function (app, mongoose) {...}`.
 *
 * `app` is intentionally `any` because the schema modules touch a heterogeneous
 * surface (Express Application + Kraken `app.config` + `db.model` / `db.models` +
 * `get(env)` + sibling-model invocations); tightening it requires the Track 4 /
 * Track 5 modernization work and is tracked separately in the code-health plan.
 *
 * The purpose of this typed factory is to *eliminate* the per-line
 * TypeScript suppressions (TS2304 / TS2580 / TS2451 / TS7006) around the
 * legacy CJS boilerplate, not to retype the legacy `app` object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppLike = any;

export type SchemaFactory = (app: AppLike, mongoose: Mongoose) => void;
