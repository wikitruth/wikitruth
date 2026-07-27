'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const historySchema = new mongoose.Schema({
    action: { type: String, enum: ['submitted', 'updated', 'published', 'rejected', 'resolved'], required: true },
    reason: { type: String, default: '' },
    actorUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    actorUsername: { type: String, default: '' },
    date: { type: Date, default: Date.now },
  }, { _id: true });
  const schema = new mongoose.Schema({
    tenantId: { type: String, required: true, lowercase: true, trim: true, index: true },
    civicRecordId: { type: mongoose.Schema.ObjectId, ref: 'CivicRecord', required: true, index: true },
    requestType: { type: String, enum: ['subject_response', 'correction_request'], required: true, index: true },
    claimedRelationship: { type: String, default: '', trim: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    evidenceUrls: [{ type: String, trim: true }],
    status: { type: String, enum: ['pending', 'published', 'rejected', 'resolved'], default: 'pending', index: true },
    history: { type: [historySchema], default: [] },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    createUsername: { type: String, default: '' },
    reviewUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    reviewUsername: { type: String, default: '' },
    reviewReason: { type: String, default: '' },
    reviewDate: { type: Date, default: null },
    createDate: { type: Date, default: Date.now, index: true },
    editDate: { type: Date, default: Date.now },
  });
  schema.index({ tenantId: 1, civicRecordId: 1, status: 1, createDate: -1 });
  schema.set('autoIndex', true);
  app.db.model('CivicResponseRequest', schema);
};

export = factory;
