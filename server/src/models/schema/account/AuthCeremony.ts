'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const authCeremonySchema = new mongoose.Schema({
    purpose: {
      type: String,
      enum: ['registration', 'authentication', 'step_up', 'passwordless_signup'],
      required: true,
      index: true,
    },
    challengeHash: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    userHandle: { type: String, default: '' },
    rpId: { type: String, required: true },
    expectedOrigin: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createDate: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
  });

  authCeremonySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  authCeremonySchema.index({ userId: 1, purpose: 1, consumedAt: 1 });
  authCeremonySchema.set('autoIndex', app.get('env') === 'development');
  app.db.model('AuthCeremony', authCeremonySchema);
};

export = factory;
