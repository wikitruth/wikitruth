'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const statusSchema = new mongoose.Schema({
    _id: { type: String },
    pivot: { type: String, default: '' },
    name: { type: String, default: '' },
  });
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  statusSchema.plugin(require('../plugins/pagedFind'));
  statusSchema.index({ pivot: 1 });
  statusSchema.index({ name: 1 });
  statusSchema.set('autoIndex', (app.get && app.get('env') === 'development'));
  app.db.model('Status', statusSchema);
};

export = factory;
