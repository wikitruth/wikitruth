'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    apiClientId: { type: mongoose.Schema.ObjectId, ref: 'ApiClient', required: true, index: true },
    windowStart: { type: Date, required: true },
    count: { type: Number, default: 0, min: 0 },
    limit: { type: Number, required: true, min: 1 },
    lastIp: { type: String, default: '' },
    createDate: { type: Date, default: Date.now },
    editDate: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  });

  schema.index({ apiClientId: 1, windowStart: 1 }, { unique: true });
  schema.index({ windowStart: -1, apiClientId: 1 });
  schema.set('autoIndex', true);
  app.db.model('ApiClientRateBucket', schema);
};

export = factory;
