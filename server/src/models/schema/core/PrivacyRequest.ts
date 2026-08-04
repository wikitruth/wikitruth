'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const timelineSchema = new mongoose.Schema({
    type: { type: String, required: true },
    note: { type: String, default: '' },
    actorUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    at: { type: Date, required: true },
  }, { _id: false });
  const schema = new mongoose.Schema({
    reference: { type: String, required: true, unique: true, index: true },
    activeKey: { type: String, default: null, select: false },
    type: { type: String, enum: ['export', 'anonymization'], required: true, index: true },
    status: {
      type: String,
      enum: ['submitted', 'in_review', 'approved', 'ready', 'processing', 'completed', 'rejected', 'cancelled', 'blocked', 'failed'],
      default: 'submitted',
      index: true,
    },
    requesterUserId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    subjectUserId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    reason: { type: String, default: '', maxlength: 500 },
    legalHold: {
      active: { type: Boolean, default: false, index: true },
      reason: { type: String, default: '', maxlength: 500 },
      changedAt: { type: Date, default: null },
      changedByUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    },
    review: {
      reviewedAt: { type: Date, default: null },
      reviewedByUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
      decisionNote: { type: String, default: '', maxlength: 500 },
    },
    approval: {
      approvedAt: { type: Date, default: null },
      approvedByUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    },
    preview: {
      tokenHash: { type: String, default: '', select: false },
      expiresAt: { type: Date, default: null },
      generatedAt: { type: Date, default: null },
      counts: { type: mongoose.Schema.Types.Mixed, default: {} },
      blockers: [{ type: String }],
    },
    download: {
      readyAt: { type: Date, default: null },
      readyExpiresAt: { type: Date, default: null },
      tokenHash: { type: String, default: '', select: false },
      tokenExpiresAt: { type: Date, default: null },
      downloadedAt: { type: Date, default: null },
    },
    execution: {
      startedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null },
      executedByUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
      pseudonym: { type: String, default: '' },
      failureCode: { type: String, default: '' },
    },
    timeline: { type: [timelineSchema], default: [] },
    createDate: { type: Date, default: Date.now, index: true },
    editDate: { type: Date, default: Date.now },
  });
  schema.index({ subjectUserId: 1, createDate: -1 });
  schema.index({ status: 1, type: 1, createDate: -1 });
  schema.index({ activeKey: 1 }, { unique: true, partialFilterExpression: { activeKey: { $type: 'string' } } });
  schema.set('autoIndex', true);
  app.db.model('PrivacyRequest', schema);
};

export = factory;
