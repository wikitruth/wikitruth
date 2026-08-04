'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true, index: true },
    source: { type: String, enum: ['health', 'events'], required: true, index: true },
    metric: { type: String, required: true },
    operator: { type: String, enum: ['gte'], default: 'gte' },
    threshold: { type: Number, required: true, min: 1 },
    windowMinutes: { type: Number, required: true, min: 1, max: 1440 },
    cooldownMinutes: { type: Number, required: true, min: 1, max: 10080 },
    severity: { type: String, enum: ['warning', 'critical'], default: 'warning' },
    builtIn: { type: Boolean, default: false },
    createDate: { type: Date, default: Date.now },
    editDate: { type: Date, default: Date.now },
  });
  schema.index({ source: 1, metric: 1 }, { unique: true });
  schema.set('autoIndex', true);
  app.db.model('OperationalAlertRule', schema);
};

export = factory;
