'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    leftId: { type: mongoose.Schema.ObjectId },
    leftType: { type: Number },
    rightId: { type: mongoose.Schema.ObjectId },
    rightType: { type: Number },
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    extras: { type: mongoose.Schema.Types.Mixed },
  });
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  schema.plugin(require('../plugins/pagedFind'));
  schema.set('autoIndex', app.get('env') === 'development');
  app.db.model('ObjectLink', schema);
};

export = factory;
