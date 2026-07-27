'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    taskType: { type: String, enum: ['revalidation', 'source_check', 'evidence_gap', 'quorum_gap'], required: true, index: true },
    objectType: { type: Number, required: true, index: true },
    objectName: { type: String, required: true, index: true },
    objectId: { type: mongoose.Schema.ObjectId, required: true, index: true },
    channel: { type: String, enum: ['', 'factual', 'ethical'], default: '' },
    dueAt: { type: Date, required: true, index: true },
    priority: { type: String, enum: ['normal', 'elevated', 'critical'], default: 'normal', index: true },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['open', 'completed', 'dismissed'], default: 'open', index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createDate: { type: Date, default: Date.now, index: true },
    editDate: { type: Date, default: Date.now },
    completedDate: { type: Date, default: null },
    completedUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
  });
  schema.index({ taskType: 1, objectType: 1, objectId: 1, channel: 1 }, { unique: true });
  schema.index({ status: 1, dueAt: 1, priority: 1 });
  schema.set('autoIndex', true);
  app.db.model('KnowledgeReviewTask', schema);
};

export = factory;

