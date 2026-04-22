'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    userId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, index: true },
    title: { type: String, default: '' },
    body: { type: String, default: '' },
    link: { type: String, default: '' },
    objectType: { type: Number, default: null, index: true },
    objectName: { type: String, default: '' },
    objectId: { type: mongoose.Schema.ObjectId, default: null, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null, index: true },
    createDate: { type: Date, default: Date.now, index: true },
  });

  schema.index({ userId: 1, readAt: 1, createDate: -1 });
  schema.set('autoIndex', true);

  app.db.model('Notification', schema);
};

export = factory;
