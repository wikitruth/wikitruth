'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    templateKey: { type: String, required: true, index: true },
    recipientMasked: { type: String, required: true },
    recipientHash: { type: String, required: true, index: true },
    encryptedPayload: { type: String, required: true, select: false },
    idempotencyKey: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['queued', 'processing', 'delivered', 'failed', 'suppressed'],
      required: true,
      default: 'queued',
      index: true,
    },
    providerId: { type: String, default: '', index: true },
    providerName: { type: String, default: '' },
    providerType: { type: String, enum: ['', 'resend', 'smtp'], default: '' },
    providerMessageId: { type: String, default: '', index: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 4 },
    availableAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, default: null, index: true },
    deliveredAt: { type: Date, default: null },
    test: { type: Boolean, default: false, index: true },
    actorUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null, index: true },
    sourceNotificationOutboxIds: [{ type: mongoose.Schema.ObjectId, ref: 'NotificationOutbox' }],
    lastError: { type: String, default: '' },
    errorCode: { type: String, default: '' },
    createDate: { type: Date, default: Date.now, index: true },
    editDate: { type: Date, default: Date.now },
  });
  schema.index({ status: 1, availableAt: 1, createDate: 1 });
  schema.index({ providerType: 1, providerMessageId: 1 });
  schema.set('autoIndex', true);
  app.db.model('EmailOutbox', schema);
};

export = factory;
