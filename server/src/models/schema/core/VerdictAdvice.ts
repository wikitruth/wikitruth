'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    objectType: { type: Number, required: true, index: true },
    objectName: { type: String, required: true, index: true },
    objectId: { type: mongoose.Schema.ObjectId, required: true, index: true },
    baseRevisionId: { type: mongoose.Schema.ObjectId, ref: 'EntryRevision', required: true, index: true },
    baseRevisionNumber: { type: Number, required: true },
    baseSnapshotHash: { type: String, required: true },
    channel: { type: String, enum: ['factual', 'ethical'], required: true, index: true },
    channelStatus: {
      type: String,
      enum: ['supported', 'refuted', 'mixed', 'insufficient_evidence', 'permissible', 'impermissible', 'contested', 'not_applicable', 'abstain'],
      required: true,
      index: true,
    },
    rationale: { type: String, required: true },
    framework: { type: String, default: '' },
    evidenceRefs: [{ type: mongoose.Schema.ObjectId, ref: 'Artifact' }],
    confidence: { type: Number, min: 0, max: 100, default: 50 },
    expertise: { type: String, default: '' },
    affiliation: { type: String, default: '' },
    conflictDeclared: { type: Boolean, default: false },
    conflictDetails: { type: String, default: '' },
    policyVersion: { type: String, required: true },
    eligibilityStatus: { type: String, enum: ['eligible', 'ineligible'], required: true },
    eligibilityReason: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'reviewing', 'countersigned', 'rejected', 'stale'], default: 'pending', index: true },
    apiClientId: { type: mongoose.Schema.ObjectId, ref: 'ApiClient', required: true, index: true },
    apiClientName: { type: String, required: true },
    agentRunId: { type: String, default: '', index: true },
    agentModel: { type: String, default: '' },
    agentProvider: { type: String, default: '' },
    agentPurpose: { type: String, default: '' },
    sourceManifest: [{ type: mongoose.Schema.Types.Mixed }],
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    createUsername: { type: String, default: '' },
    createDate: { type: Date, default: Date.now, index: true },
    decisionNote: { type: String, default: '' },
    decisionUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    decisionUsername: { type: String, default: '' },
    decisionDate: { type: Date, default: null },
    resultingVoteId: { type: mongoose.Schema.ObjectId, ref: 'VerdictVote', default: null },
  });

  schema.index({ objectType: 1, objectId: 1, channel: 1, status: 1, createDate: -1 });
  schema.index({ apiClientId: 1, agentRunId: 1, createDate: -1 });
  schema.set('autoIndex', true);
  app.db.model('VerdictAdvice', schema);
};

export = factory;
