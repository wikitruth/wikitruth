'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    userId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, unique: true, index: true },
    username: { type: String, required: true, index: true },
    score: { type: Number, min: 0, max: 100, default: 0, index: true },
    level: { type: String, default: 'New contributor' },
    dimensions: {
      quality: { type: Number, min: 0, max: 100, default: 0 },
      participation: { type: Number, min: 0, max: 100, default: 0 },
      stewardship: { type: Number, min: 0, max: 100, default: 0 },
      evidence: { type: Number, min: 0, max: 100, default: 0 },
    },
    counts: { type: mongoose.Schema.Types.Mixed, default: {} },
    badges: [{ key: String, label: String, description: String }],
    formulaVersion: { type: String, required: true },
    calculatedAt: { type: Date, default: Date.now, index: true },
  });

  schema.index({ score: -1, calculatedAt: -1 });
  schema.set('autoIndex', true);
  app.db.model('ReputationSnapshot', schema);
};

export = factory;
