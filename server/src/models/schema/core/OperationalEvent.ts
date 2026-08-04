'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    kind: { type: String, required: true, index: true },
    severity: { type: String, enum: ['info', 'warning', 'error', 'critical'], required: true, index: true },
    source: { type: String, required: true, index: true },
    code: { type: String, default: '', index: true },
    fingerprint: { type: String, required: true, index: true },
    message: { type: String, required: true },
    path: { type: String, default: '' },
    requestId: { type: String, default: '' },
    occurredAt: { type: Date, required: true, index: true },
    expiresAt: { type: Date, required: true },
  });
  schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  schema.index({ kind: 1, occurredAt: -1 });
  schema.index({ fingerprint: 1, occurredAt: -1 });
  schema.set('autoIndex', true);
  app.db.model('OperationalEvent', schema);
};

export = factory;
