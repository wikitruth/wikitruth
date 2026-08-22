'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    objectType: { type: Number, required: true, index: true },
    objectName: { type: String, required: true, index: true },
    objectId: { type: mongoose.Schema.ObjectId, required: true, index: true },
    channel: { type: String, enum: ['factual', 'ethical'], default: 'factual', required: true, index: true },
    channelStatus: {
      type: String,
      enum: ['supported', 'refuted', 'mixed', 'insufficient_evidence', 'permissible', 'impermissible', 'contested', 'not_applicable', 'abstain'],
      required: true,
      index: true,
    },
    verdictStatus: { type: Number, default: null, index: true },
    rationale: { type: String, default: '' },
    framework: { type: String, default: '' },
    evidenceRefs: [{ type: mongoose.Schema.ObjectId, ref: 'Artifact' }],
    confidence: { type: Number, min: 0, max: 100, default: 50 },
    expertise: { type: String, default: '' },
    affiliation: { type: String, default: '', index: true },
    eligibilityStatus: { type: String, enum: ['eligible', 'ineligible'], default: 'eligible', index: true },
    eligibilityReason: { type: String, default: '' },
    conflictDeclared: { type: Boolean, default: false, index: true },
    conflictDetails: { type: String, default: '' },
    policyVersion: { type: String, required: true, default: '2026-07-v3-standard', index: true },
    outcomeStatus: { type: String, enum: ['active', 'upheld', 'overturned', 'superseded'], default: 'active', index: true },
    outcomeDate: { type: Date, default: null },
    voterUserId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    voterUsername: { type: String, default: '' },
    sourceAdviceId: { type: mongoose.Schema.ObjectId, ref: 'VerdictAdvice', default: null, index: true },
    createDate: { type: Date, default: Date.now, index: true },
    editDate: { type: Date, default: Date.now },
  });

  schema.index({ objectType: 1, objectId: 1, channel: 1, channelStatus: 1 });
  schema.index({ objectType: 1, objectId: 1, channel: 1, voterUserId: 1 }, { unique: true });
  schema.index({ voterUserId: 1, outcomeStatus: 1, outcomeDate: -1 });
  schema.set('autoIndex', true);

  app.db.model('VerdictVote', schema);
};

export = factory;
