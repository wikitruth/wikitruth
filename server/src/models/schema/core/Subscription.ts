'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    userId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    objectType: { type: Number, required: true, index: true },
    objectName: { type: String, required: true, index: true },
    objectId: { type: mongoose.Schema.ObjectId, required: true, index: true },
    triggers: {
      type: [String],
      default: ['reply', 'screening', 'verdict', 'issue'],
    },
    active: { type: Boolean, default: true, index: true },
    createDate: { type: Date, default: Date.now, index: true },
    editDate: { type: Date, default: Date.now },
  });

  schema.index({ userId: 1, objectType: 1, objectId: 1 }, { unique: true });
  schema.index({ objectType: 1, objectId: 1, active: 1 });
  schema.set('autoIndex', true);

  app.db.model('Subscription', schema);
};

export = factory;
