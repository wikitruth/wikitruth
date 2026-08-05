'use strict';

import type { SchemaFactory } from '../factory';
import { STRUCTURED_DEBATE_STANCES } from '../../../types/structuredDebate';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    pilotId: { type: mongoose.Schema.ObjectId, ref: 'StructuredDebatePilot', required: true, index: true },
    userId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    publicUsername: { type: String, required: true, maxlength: 80 },
    stance: { type: String, enum: STRUCTURED_DEBATE_STANCES, required: true },
    status: { type: String, enum: ['active', 'withdrawn'], default: 'active', index: true },
    consentVersion: { type: String, required: true, maxlength: 100 },
    publicAttributionAccepted: { type: Boolean, required: true },
    consentedAt: { type: Date, required: true },
    withdrewAt: { type: Date, default: null },
    createDate: { type: Date, default: Date.now },
    editDate: { type: Date, default: Date.now },
  });

  schema.index({ pilotId: 1, userId: 1 }, { unique: true });
  schema.index({ pilotId: 1, stance: 1, status: 1, createDate: 1 });
  schema.set('autoIndex', true);

  app.db.model('StructuredDebateParticipant', schema);
};

export = factory;
