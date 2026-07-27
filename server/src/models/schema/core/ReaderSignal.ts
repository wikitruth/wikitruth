'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    objectType: { type: Number, required: true, index: true },
    objectName: { type: String, required: true, index: true },
    objectId: { type: mongoose.Schema.ObjectId, required: true, index: true },
    signalType: {
      type: String,
      enum: ['controversial', 'incorrect_verdict', 'needs_reevaluation', 'wrong_category', 'duplicate'],
      required: true,
      index: true,
    },
    note: { type: String, default: '' },
    status: {
      type: String,
      enum: ['open', 'in_review', 'resolved', 'dismissed'],
      default: 'open',
      index: true,
    },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    createUsername: { type: String, default: '' },
    assignedUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null, index: true },
    resolutionNote: { type: String, default: '' },
    createDate: { type: Date, default: Date.now, index: true },
    editDate: { type: Date, default: Date.now },
  });

  schema.index({ status: 1, createDate: -1 });
  schema.index({ objectType: 1, objectId: 1, createDate: -1 });
  schema.set('autoIndex', true);

  app.db.model('ReaderSignal', schema);
};

export = factory;
