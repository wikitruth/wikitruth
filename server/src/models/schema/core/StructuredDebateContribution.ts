'use strict';

import type { SchemaFactory } from '../factory';
import {
  STRUCTURED_DEBATE_CONTRIBUTION_TYPES,
  STRUCTURED_DEBATE_PHASE_KEYS,
  STRUCTURED_DEBATE_STANCES,
} from '../../../types/structuredDebate';

const factory: SchemaFactory = function (app, mongoose) {
  const evidenceSchema = new mongoose.Schema({
    url: { type: String, required: true, maxlength: 2000 },
    label: { type: String, default: '', maxlength: 160 },
  }, { _id: false });

  const schema = new mongoose.Schema({
    pilotId: { type: mongoose.Schema.ObjectId, ref: 'StructuredDebatePilot', required: true, index: true },
    participantId: { type: mongoose.Schema.ObjectId, ref: 'StructuredDebateParticipant', required: true, index: true },
    userId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    publicUsername: { type: String, required: true, maxlength: 80 },
    stance: { type: String, enum: STRUCTURED_DEBATE_STANCES, required: true, index: true },
    phaseKey: { type: String, enum: STRUCTURED_DEBATE_PHASE_KEYS, required: true, index: true },
    contributionType: { type: String, enum: STRUCTURED_DEBATE_CONTRIBUTION_TYPES, required: true },
    content: { type: String, required: true, minlength: 40, maxlength: 2000 },
    evidenceLinks: { type: [evidenceSchema], default: [] },
    authorshipType: { type: String, enum: ['human', 'agent'], default: 'human', index: true },
    apiClientId: { type: mongoose.Schema.ObjectId, ref: 'ApiClient', default: null, index: true },
    apiClientName: { type: String, default: '' },
    agentRunId: { type: String, default: '', index: true },
    agentModel: { type: String, default: '' },
    agentProvider: { type: String, default: '' },
    agentPurpose: { type: String, default: '' },
    agentSourceManifest: [{ type: mongoose.Schema.Types.Mixed }],
    revisionNumber: { type: Number, default: 1, min: 1, immutable: true },
    createDate: { type: Date, default: Date.now, index: true },
    editDate: { type: Date, default: Date.now },
  });

  schema.index({ pilotId: 1, participantId: 1, phaseKey: 1 }, { unique: true });
  schema.index({ pilotId: 1, phaseKey: 1, createDate: 1 });
  schema.index({ apiClientId: 1, agentRunId: 1, createDate: -1 });
  schema.set('autoIndex', true);

  app.db.model('StructuredDebateContribution', schema);
};

export = factory;
