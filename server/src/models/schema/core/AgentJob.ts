'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    apiClientId: { type: mongoose.Schema.ObjectId, ref: 'ApiClient', required: true, index: true },
    accountableUserId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    agentRunId: { type: String, required: true, index: true },
    agentModel: { type: String, default: '' },
    agentProvider: { type: String, default: '' },
    agentPurpose: { type: String, default: '' },
    sourceManifest: [{ type: mongoose.Schema.Types.Mixed }],
    status: {
      type: String,
      enum: ['queued', 'running', 'cancel_requested', 'cancelled', 'completed', 'completed_with_errors', 'failed'],
      default: 'queued',
      index: true,
    },
    commands: [{ type: mongoose.Schema.Types.Mixed }],
    results: [{ type: mongoose.Schema.Types.Mixed }],
    nextIndex: { type: Number, default: 0 },
    activeIndex: { type: Number, default: null },
    succeededCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    leaseOwner: { type: String, default: '' },
    leaseExpiresAt: { type: Date, default: null, index: true },
    error: { type: String, default: '' },
    createDate: { type: Date, default: Date.now, index: true },
    startDate: { type: Date, default: null },
    completedDate: { type: Date, default: null },
    editDate: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  });

  schema.index({ apiClientId: 1, createDate: -1, _id: -1 });
  schema.index({ status: 1, leaseExpiresAt: 1, createDate: 1 });
  schema.set('autoIndex', true);
  app.db.model('AgentJob', schema);
};

export = factory;
