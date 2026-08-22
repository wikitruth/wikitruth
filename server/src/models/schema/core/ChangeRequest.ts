'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    objectType: { type: Number, required: true, index: true },
    objectId: { type: mongoose.Schema.ObjectId, required: true, index: true },
    baseRevisionId: { type: mongoose.Schema.ObjectId, ref: 'EntryRevision', required: true, index: true },
    baseRevisionNumber: { type: Number, required: true },
    baseSnapshotHash: { type: String, required: true },
    proposedChanges: { type: mongoose.Schema.Types.Mixed, required: true },
    summary: { type: String, required: true },
    status: {
      type: String,
      enum: ['open', 'accepted', 'partially_accepted', 'rejected', 'stale', 'withdrawn'],
      default: 'open',
      index: true,
    },
    acceptedFields: [{ type: String }],
    decisionNote: { type: String, default: '' },
    appliedRevisionId: { type: mongoose.Schema.ObjectId, ref: 'EntryRevision', default: null },
    createDate: { type: Date, default: Date.now, index: true },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    createUsername: { type: String, default: '' },
    apiClientId: { type: mongoose.Schema.ObjectId, ref: 'ApiClient', default: null, index: true },
    apiClientName: { type: String, default: '' },
    agentRunId: { type: String, default: '', index: true },
    agentModel: { type: String, default: '' },
    agentProvider: { type: String, default: '' },
    agentPurpose: { type: String, default: '' },
    sourceManifest: [{ type: mongoose.Schema.Types.Mixed }],
    decisionDate: { type: Date, default: null },
    decisionUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    decisionUsername: { type: String, default: '' },
  });

  schema.index({ objectType: 1, objectId: 1, status: 1, createDate: -1 });
  schema.set('autoIndex', true);
  app.db.model('ChangeRequest', schema);
};

export = factory;
