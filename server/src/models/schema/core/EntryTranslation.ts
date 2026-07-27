'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const historySchema = new mongoose.Schema({
    action: { type: String, enum: ['submitted', 'updated', 'published', 'rejected'], required: true },
    reason: { type: String, default: '' },
    actorUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    actorUsername: { type: String, default: '' },
    date: { type: Date, default: Date.now },
  }, { _id: true });
  const schema = new mongoose.Schema({
    objectType: { type: Number, required: true, index: true },
    objectName: { type: String, required: true, index: true },
    objectId: { type: mongoose.Schema.ObjectId, required: true, index: true },
    locale: { type: String, required: true, lowercase: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    contentPreview: { type: String, default: '' },
    sourceRevisionId: { type: mongoose.Schema.ObjectId, ref: 'EntryRevision', required: true, index: true },
    sourceRevisionNumber: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'published', 'rejected'], default: 'pending', index: true },
    history: { type: [historySchema], default: [] },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    createUsername: { type: String, default: '' },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    editUsername: { type: String, default: '' },
    reviewUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    reviewUsername: { type: String, default: '' },
    reviewReason: { type: String, default: '' },
    reviewDate: { type: Date, default: null },
    createDate: { type: Date, default: Date.now, index: true },
    editDate: { type: Date, default: Date.now },
  });
  schema.index({ objectType: 1, objectId: 1, locale: 1 }, { unique: true });
  schema.index({ status: 1, editDate: -1 });
  schema.set('autoIndex', true);
  app.db.model('EntryTranslation', schema);
};

export = factory;
