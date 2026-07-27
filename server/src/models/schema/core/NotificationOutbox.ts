'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    userId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    notificationId: { type: mongoose.Schema.ObjectId, ref: 'Notification', required: true, index: true },
    channel: { type: String, enum: ['in_app', 'email_digest', 'web_push'], required: true, index: true },
    status: { type: String, enum: ['queued', 'processing', 'delivered', 'failed', 'skipped'], required: true, index: true },
    availableAt: { type: Date, default: Date.now, index: true },
    attempts: { type: Number, default: 0 },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastError: { type: String, default: '' },
    deliveredAt: { type: Date, default: null },
    createDate: { type: Date, default: Date.now, index: true },
    editDate: { type: Date, default: Date.now },
  });
  schema.index({ notificationId: 1, channel: 1 }, { unique: true });
  schema.index({ status: 1, channel: 1, availableAt: 1 });
  schema.set('autoIndex', true);
  app.db.model('NotificationOutbox', schema);
};

export = factory;
