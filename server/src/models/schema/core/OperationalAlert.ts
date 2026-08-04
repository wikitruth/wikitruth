'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    ruleId: { type: mongoose.Schema.ObjectId, ref: 'OperationalAlertRule', required: true, index: true },
    dedupeKey: { type: String, required: true, index: true },
    status: { type: String, enum: ['active', 'acknowledged', 'resolved'], default: 'active', index: true },
    severity: { type: String, enum: ['warning', 'critical'], required: true, index: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    occurrenceCount: { type: Number, default: 1 },
    firstTriggeredAt: { type: Date, required: true },
    lastTriggeredAt: { type: Date, required: true, index: true },
    acknowledgedAt: { type: Date, default: null },
    acknowledgedBy: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    acknowledgement: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    expiresAt: { type: Date, required: true },
  });
  schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  schema.index({ dedupeKey: 1, status: 1, lastTriggeredAt: -1 });
  schema.set('autoIndex', true);
  app.db.model('OperationalAlert', schema);
};

export = factory;
