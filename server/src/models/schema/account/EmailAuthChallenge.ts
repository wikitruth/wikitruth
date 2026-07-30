'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    challengeId: { type: String, required: true, unique: true },
    email: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    linkTokenHash: { type: String, required: true },
    completionTokenHash: { type: String, default: '' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    requestIpHash: { type: String, required: true, index: true },
    targetOrigin: { type: String, default: '' },
    returnPath: { type: String, default: '/' },
    rememberMe: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    maximumAttempts: { type: Number, required: true },
    deliveryStatus: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    createDate: { type: Date, default: Date.now, index: true },
    resendAvailableAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    verifiedAt: { type: Date, default: null },
    consumedAt: { type: Date, default: null },
    supersededAt: { type: Date, default: null },
  });

  schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  schema.index({ email: 1, createDate: -1 });
  schema.index({ requestIpHash: 1, createDate: -1 });
  schema.set('autoIndex', app.get('env') === 'development');
  app.db.model('EmailAuthChallenge', schema);
};

export = factory;
