'use strict';

import type { SchemaFactory } from '../factory';
import {
  STRUCTURED_DEBATE_CONSENT_VERSION,
  STRUCTURED_DEBATE_FORMAT_VERSION,
  STRUCTURED_DEBATE_PHASE_KEYS,
  STRUCTURED_DEBATE_PHASE_STATUSES,
  STRUCTURED_DEBATE_STATUSES,
} from '../../../types/structuredDebate';

const factory: SchemaFactory = function (app, mongoose) {
  const phaseSchema = new mongoose.Schema({
    key: { type: String, enum: STRUCTURED_DEBATE_PHASE_KEYS, required: true },
    label: { type: String, required: true, maxlength: 40 },
    order: { type: Number, required: true, min: 0, max: 10 },
    status: { type: String, enum: STRUCTURED_DEBATE_PHASE_STATUSES, required: true },
    startedAt: { type: Date, default: null },
    dueAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  }, { _id: false });

  const transitionSchema = new mongoose.Schema({
    eventType: {
      type: String,
      enum: ['pilot_created', 'pilot_paused', 'pilot_resumed', 'phase_advanced', 'pilot_closed', 'pilot_cancelled'],
      required: true,
    },
    actorUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    actorLabel: { type: String, default: 'Facilitator', maxlength: 80 },
    fromStatus: { type: String, enum: ['', ...STRUCTURED_DEBATE_STATUSES], default: '' },
    toStatus: { type: String, enum: ['', ...STRUCTURED_DEBATE_STATUSES], default: '' },
    fromPhase: { type: String, enum: ['', ...STRUCTURED_DEBATE_PHASE_KEYS], default: '' },
    toPhase: { type: String, enum: ['', ...STRUCTURED_DEBATE_PHASE_KEYS], default: '' },
    publicReason: { type: String, default: '', maxlength: 500 },
    createDate: { type: Date, default: Date.now },
  }, { _id: true });

  const schema = new mongoose.Schema({
    activeEntryKey: { type: String, default: null },
    entryObjectType: { type: Number, required: true, index: true },
    entryObjectName: { type: String, required: true, index: true },
    entryId: { type: mongoose.Schema.ObjectId, required: true, index: true },
    entryTitle: { type: String, required: true, maxlength: 300 },
    entryFriendlyUrl: { type: String, default: '', maxlength: 300 },
    proposition: { type: String, required: true, minlength: 10, maxlength: 500 },
    status: { type: String, enum: STRUCTURED_DEBATE_STATUSES, default: 'open', index: true },
    formatVersion: { type: String, default: STRUCTURED_DEBATE_FORMAT_VERSION, immutable: true },
    consentVersion: { type: String, default: STRUCTURED_DEBATE_CONSENT_VERSION, immutable: true },
    participantLimit: { type: Number, default: 12, min: 2, max: 40 },
    phaseWindowHours: { type: Number, default: 24, min: 1, max: 168 },
    contributionLimitPerParticipantPerPhase: { type: Number, default: 1, min: 1, max: 1, immutable: true },
    evidenceRequired: { type: Boolean, default: true, immutable: true },
    currentPhaseKey: { type: String, enum: STRUCTURED_DEBATE_PHASE_KEYS, default: 'opening' },
    phases: { type: [phaseSchema], default: [] },
    facilitatorUserIds: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    createUsername: { type: String, default: '', maxlength: 80 },
    createDate: { type: Date, default: Date.now, index: true },
    editDate: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    transitions: { type: [transitionSchema], default: [] },
  }, { optimisticConcurrency: true });

  schema.index(
    { activeEntryKey: 1 },
    { unique: true, partialFilterExpression: { activeEntryKey: { $type: 'string' } } },
  );
  schema.index({ entryObjectType: 1, entryId: 1, createDate: -1 });
  schema.index({ status: 1, editDate: -1 });
  schema.set('autoIndex', true);

  app.db.model('StructuredDebatePilot', schema);
};

export = factory;
