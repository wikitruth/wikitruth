'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const componentSchema = new mongoose.Schema({
    key: { type: String, required: true },
    status: { type: String, enum: ['healthy', 'attention', 'unavailable', 'unknown'], required: true },
    summary: { type: String, required: true },
  }, { _id: false });
  const schema = new mongoose.Schema({
    overall: { type: String, enum: ['healthy', 'attention', 'unavailable', 'unknown'], required: true, index: true },
    components: { type: [componentSchema], default: [] },
    generatedAt: { type: Date, required: true, index: true },
    expiresAt: { type: Date, required: true },
  });
  schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  schema.index({ generatedAt: -1 });
  schema.set('autoIndex', true);
  app.db.model('HealthSnapshot', schema);
};

export = factory;
