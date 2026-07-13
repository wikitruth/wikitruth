'use strict';

import type { SchemaFactory } from '../factory';
import {
  CIVIC_ENTRY_RELATIONSHIPS,
  CIVIC_LINKED_OBJECT_NAMES,
} from '../civicEnums';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    tenantId: { type: String, required: true, lowercase: true, trim: true, index: true },
    civicRecordId: { type: mongoose.Schema.ObjectId, ref: 'CivicRecord', required: true, index: true },
    objectType: { type: Number, required: true, index: true },
    objectName: { type: String, enum: CIVIC_LINKED_OBJECT_NAMES, required: true, index: true },
    objectId: { type: mongoose.Schema.ObjectId, required: true, index: true },
    relationship: { type: String, enum: CIVIC_ENTRY_RELATIONSHIPS, required: true, index: true },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    createUsername: { type: String, default: '' },
    createDate: { type: Date, default: Date.now, index: true },
  });

  schema.index(
    { tenantId: 1, civicRecordId: 1, relationship: 1, objectType: 1, objectId: 1 },
    { unique: true },
  );
  schema.index({ tenantId: 1, objectType: 1, objectId: 1 });
  app.db.model('CivicEntryLink', schema);
};

export = factory;
