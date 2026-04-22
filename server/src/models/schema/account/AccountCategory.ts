'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const categorySchema = new mongoose.Schema({
    _id: { type: String },
    pivot: { type: String, default: '' },
    name: { type: String, default: '' },
  });
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  categorySchema.plugin(require('../plugins/pagedFind'));
  categorySchema.index({ pivot: 1 });
  categorySchema.index({ name: 1 });
  categorySchema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('AccountCategory', categorySchema);
};

export = factory;
