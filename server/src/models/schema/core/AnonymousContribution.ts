'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    entryType: {
      type: String,
      enum: ['topic', 'argument', 'question', 'answer', 'issue', 'opinion', 'artifact'],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    content: { type: String, required: true },
    references: { type: String, default: '' },
    parentType: { type: String, default: '' },
    parentId: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'in_review', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
    submitterHash: { type: String, required: true, index: true },
    receiptHash: { type: String, required: true },
    contentHash: { type: String, required: true, index: true },
    risk: {
      score: { type: Number, default: 0 },
      flags: [{ type: String }],
    },
    moderation: {
      reviewerUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
      reviewerUsername: { type: String, default: '' },
      reason: { type: String, default: '' },
      reviewedAt: { type: Date, default: null },
      publishedEntryType: { type: String, default: '' },
      publishedEntryId: { type: mongoose.Schema.ObjectId, default: null },
    },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  });

  schema.index({ submitterHash: 1, createdAt: -1 });
  schema.index({ status: 1, createdAt: -1 });
  schema.index({ contentHash: 1, createdAt: -1 });
  schema.set('autoIndex', true);

  app.db.model('AnonymousContribution', schema);
};

export = factory;
