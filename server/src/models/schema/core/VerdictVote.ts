'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    objectType: { type: Number, required: true, index: true },
    objectName: { type: String, required: true, index: true },
    objectId: { type: mongoose.Schema.ObjectId, required: true, index: true },
    verdictStatus: { type: Number, required: true, index: true },
    rationale: { type: String, default: '' },
    voterUserId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    voterUsername: { type: String, default: '' },
    createDate: { type: Date, default: Date.now, index: true },
    editDate: { type: Date, default: Date.now },
  });

  schema.index({ objectType: 1, objectId: 1, verdictStatus: 1 });
  schema.index({ objectType: 1, objectId: 1, voterUserId: 1 }, { unique: true });
  schema.set('autoIndex', true);

  app.db.model('VerdictVote', schema);
};

export = factory;
