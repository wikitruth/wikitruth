'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    sessionKeyHash: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authenticationMethod: { type: String, required: true },
    remembered: { type: Boolean, default: false },
    userAgent: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    createDate: { type: Date, default: Date.now },
    lastActivityAt: { type: Date, default: Date.now },
    absoluteExpiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: '' },
  });

  schema.index({ absoluteExpiresAt: 1 }, { expireAfterSeconds: 0 });
  schema.index({ userId: 1, revokedAt: 1, absoluteExpiresAt: -1 });
  schema.set('autoIndex', app.get('env') === 'development');
  app.db.model('WebSession', schema);
};

export = factory;
