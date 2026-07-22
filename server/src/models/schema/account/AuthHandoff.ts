'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const authHandoffSchema = new mongoose.Schema({
    codeHash: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceOrigin: { type: String, required: true },
    targetOrigin: { type: String, required: true, index: true },
    returnPath: { type: String, required: true, default: '/' },
    authenticationMethod: { type: String, required: true },
    authenticatedAt: { type: Date, required: true },
    passkeyVerifiedAt: { type: Date, default: null },
    createDate: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    consumedAt: { type: Date, default: null },
  });

  authHandoffSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  authHandoffSchema.set('autoIndex', app.get('env') === 'development');
  app.db.model('AuthHandoff', authHandoffSchema);
};

export = factory;
