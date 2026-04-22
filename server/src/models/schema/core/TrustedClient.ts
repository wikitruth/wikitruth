'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    userId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    clientIp: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    createDate: { type: Date, default: Date.now },
  });
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  schema.plugin(require('../plugins/pagedFind'));
  schema.index({ userId: 1 });
  schema.index({ clientId: 1 });
  schema.set('autoIndex', app.get('env') === 'development');
  app.db.model('TrustedClient', schema);
};

export = factory;
