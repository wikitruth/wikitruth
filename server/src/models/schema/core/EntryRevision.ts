'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    objectType: { type: Number, required: true, index: true },
    objectId: { type: mongoose.Schema.ObjectId, required: true, index: true },
    revisionNumber: { type: Number, required: true },
    parentRevisionId: { type: mongoose.Schema.ObjectId, ref: 'EntryRevision', default: null },
    source: {
      type: String,
      enum: ['bootstrap', 'create', 'update', 'merge', 'change_request', 'rollback'],
      required: true,
      index: true,
    },
    summary: { type: String, default: '' },
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true },
    snapshotHash: { type: String, required: true, immutable: true },
    changedFields: [{ type: String }],
    createDate: { type: Date, default: Date.now, index: true, immutable: true },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null, immutable: true },
    createUsername: { type: String, default: '', immutable: true },
  });

  schema.index({ objectType: 1, objectId: 1, revisionNumber: 1 }, { unique: true });
  schema.index({ objectType: 1, objectId: 1, snapshotHash: 1 }, { unique: true });
  schema.index({ objectType: 1, objectId: 1, createDate: -1 });
  schema.set('autoIndex', true);
  app.db.model('EntryRevision', schema);
};

export = factory;

