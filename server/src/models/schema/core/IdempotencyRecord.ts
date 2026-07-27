'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    apiClientId: { type: mongoose.Schema.ObjectId, ref: 'ApiClient', required: true, index: true },
    keyHash: { type: String, required: true },
    fingerprint: { type: String, required: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    agentRunId: { type: String, required: true, index: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending', index: true },
    responseStatus: { type: Number, default: null },
    responseBody: { type: mongoose.Schema.Types.Mixed, default: null },
    requestId: { type: String, default: '' },
    createDate: { type: Date, default: Date.now, index: true },
    completedDate: { type: Date, default: null },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  });
  schema.index({ apiClientId: 1, keyHash: 1 }, { unique: true });
  schema.index({ apiClientId: 1, agentRunId: 1, createDate: -1 });
  schema.set('autoIndex', true);
  app.db.model('IdempotencyRecord', schema);
};

export = factory;

