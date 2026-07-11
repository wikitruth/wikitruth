'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    sourceObjectType: { type: Number, required: true, index: true },
    sourceObjectId: { type: mongoose.Schema.ObjectId, required: true, index: true },
    targetObjectType: { type: Number, required: true, index: true },
    targetObjectId: { type: mongoose.Schema.ObjectId, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    reason: { type: String, required: true },
    movedRelationships: { type: mongoose.Schema.Types.Mixed, default: {} },
    createDate: { type: Date, default: Date.now, index: true },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    completedDate: { type: Date, default: null },
    failureMessage: { type: String, default: '' },
  });

  schema.index({ sourceObjectType: 1, sourceObjectId: 1 }, { unique: true });
  schema.index({ targetObjectType: 1, targetObjectId: 1, status: 1 });
  schema.set('autoIndex', true);
  app.db.model('EntryRedirect', schema);
};

export = factory;

