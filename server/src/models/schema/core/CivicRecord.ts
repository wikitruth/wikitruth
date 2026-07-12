'use strict';

import type { SchemaFactory } from '../factory';
import {
  CIVIC_RECORD_KINDS,
  CIVIC_RECORD_STAGES,
  CIVIC_RECORD_STATUSES,
  CIVIC_SEVERITIES,
} from '../../../types/civic';

const factory: SchemaFactory = function (app, mongoose) {
  const historySchema = new mongoose.Schema({
    action: { type: String, required: true },
    summary: { type: String, required: true },
    reason: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    actorUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    actorUsername: { type: String, default: '' },
    fromStatus: { type: String, enum: CIVIC_RECORD_STATUSES, default: null },
    toStatus: { type: String, enum: CIVIC_RECORD_STATUSES, default: null },
    fromStage: { type: String, enum: CIVIC_RECORD_STAGES, default: null },
    toStage: { type: String, enum: CIVIC_RECORD_STAGES, default: null },
    relatedRecordIds: [{ type: mongoose.Schema.ObjectId, ref: 'CivicRecord' }],
  }, { _id: true });

  const schema = new mongoose.Schema({
    kind: { type: String, enum: CIVIC_RECORD_KINDS, required: true, index: true },
    title: { type: String, required: true, trim: true },
    friendlyUrl: { type: String, required: true, trim: true, index: true },
    summary: { type: String, default: '', trim: true },
    description: { type: String, default: '' },
    status: { type: String, enum: CIVIC_RECORD_STATUSES, default: 'pending', index: true },
    stage: { type: String, enum: CIVIC_RECORD_STAGES, default: 'reported', index: true },
    severity: { type: String, enum: CIVIC_SEVERITIES, default: 'info', index: true },
    parentId: { type: mongoose.Schema.ObjectId, ref: 'CivicRecord', default: null, index: true },
    relatedRecordIds: [{ type: mongoose.Schema.ObjectId, ref: 'CivicRecord' }],
    artifactIds: [{ type: mongoose.Schema.ObjectId, ref: 'Artifact' }],
    issueIds: [{ type: mongoose.Schema.ObjectId, ref: 'Issue' }],
    location: {
      countryCode: { type: String, default: 'PH', uppercase: true },
      region: { type: String, default: '' },
      province: { type: String, default: '' },
      city: { type: String, default: '' },
      barangay: { type: String, default: '' },
      address: { type: String, default: '' },
      coordinates: {
        latitude: { type: Number, min: -90, max: 90, default: null },
        longitude: { type: Number, min: -180, max: 180, default: null },
      },
    },
    responsibility: {
      institutionId: { type: mongoose.Schema.ObjectId, ref: 'CivicRecord', default: null },
      officeId: { type: mongoose.Schema.ObjectId, ref: 'CivicRecord', default: null },
      personId: { type: mongoose.Schema.ObjectId, ref: 'CivicRecord', default: null },
      role: { type: String, default: '' },
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
    },
    project: {
      budget: { type: Number, min: 0, default: null },
      currency: { type: String, default: 'PHP', uppercase: true },
      contractor: { type: String, default: '' },
      contractReference: { type: String, default: '' },
      progressPercent: { type: Number, min: 0, max: 100, default: null },
      startDate: { type: Date, default: null },
      targetEndDate: { type: Date, default: null },
      actualEndDate: { type: Date, default: null },
    },
    observation: {
      observedAt: { type: Date, default: null },
      sourceUrl: { type: String, default: '' },
      escalationStatus: {
        type: String,
        enum: ['submitted', 'screening', 'accepted', 'escalated', 'addressed', 'rejected'],
        default: 'submitted',
      },
    },
    election: {
      position: { type: String, default: '' },
      electionDate: { type: Date, default: null },
      jurisdiction: { type: String, default: '' },
      platform: { type: String, default: '' },
    },
    outcome: {
      summary: { type: String, default: '' },
      happenedAt: { type: Date, default: null },
    },
    history: { type: [historySchema], default: [] },
    private: { type: Boolean, default: false, index: true },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    createDate: { type: Date, default: Date.now, index: true },
    editDate: { type: Date, default: Date.now, index: true },
  });

  schema.index({ kind: 1, parentId: 1, title: 1 });
  schema.index({ kind: 1, status: 1, stage: 1, editDate: -1 });
  schema.index({ 'location.region': 1, 'location.city': 1, kind: 1 });
  schema.index({ title: 'text', summary: 'text', description: 'text' });

  app.db.model('CivicRecord', schema);
};

export = factory;
