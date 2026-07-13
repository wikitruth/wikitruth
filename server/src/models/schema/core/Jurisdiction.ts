'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    tenantId: { type: String, required: true, lowercase: true, trim: true, index: true },
    code: { type: String, required: true, trim: true },
    countryCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    levelKey: { type: String, required: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    friendlyUrl: { type: String, required: true, trim: true },
    parentId: { type: mongoose.Schema.ObjectId, ref: 'Jurisdiction', default: null, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    active: { type: Boolean, default: true, index: true },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    createDate: { type: Date, default: Date.now },
    editDate: { type: Date, default: Date.now },
  });

  schema.index({ tenantId: 1, code: 1 }, { unique: true });
  schema.index({ tenantId: 1, parentId: 1, levelKey: 1, name: 1 });
  app.db.model('Jurisdiction', schema);
};

export = factory;
