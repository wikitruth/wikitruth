'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    kind: {
      type: String,
      enum: [
        'authentication_denied', 'request_denied', 'rate_limited',
        'idempotent_replay', 'idempotency_conflict',
        'job_queued', 'job_completed', 'job_failed', 'job_cancelled',
        'advice_submitted', 'advice_countersigned', 'advice_rejected', 'advice_stale',
      ],
      required: true,
      index: true,
    },
    apiClientId: { type: mongoose.Schema.ObjectId, ref: 'ApiClient', default: null, index: true },
    clientId: { type: String, default: '', index: true },
    agentRunId: { type: String, default: '', index: true },
    operationId: { type: String, default: '', index: true },
    method: { type: String, default: '' },
    path: { type: String, default: '' },
    statusCode: { type: Number, default: 0 },
    code: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  });

  schema.index({ apiClientId: 1, occurredAt: -1 });
  schema.index({ apiClientId: 1, kind: 1, occurredAt: -1 });
  schema.set('autoIndex', true);
  app.db.model('AgentOperationEvent', schema);
};

export = factory;
