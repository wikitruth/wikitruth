'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    leftId: { type: mongoose.Schema.ObjectId },
    leftType: { type: Number },
    rightId: { type: mongoose.Schema.ObjectId },
    rightType: { type: Number },
    relationship: { type: String, enum: ['child', 'support', 'oppose', 'related', 'evidence', 'source', 'dependency'], required: true, index: true },
    private: { type: Boolean, default: false },
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    extras: { type: mongoose.Schema.Types.Mixed },
  });
  schema.index({ leftType: 1, leftId: 1, rightType: 1, rightId: 1, relationship: 1 }, { unique: true });
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  schema.plugin(require('../plugins/pagedFind'));
  schema.set('autoIndex', app.get('env') === 'development');
  app.db.model('ObjectLink', schema);
};

export = factory;
