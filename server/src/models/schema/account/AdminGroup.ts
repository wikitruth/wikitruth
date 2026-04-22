'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const adminGroupSchema = new mongoose.Schema({
    _id: {type: String},
    name: {type: String, default: ''},
    permissions: [{name: String, permit: Boolean}]
  });
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  adminGroupSchema.plugin(require('../plugins/pagedFind'));
  adminGroupSchema.index({ name: 1 }, { unique: true });
  adminGroupSchema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('AdminGroup', adminGroupSchema);
};

export = factory;
