'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, index: true },
    sequence: { type: Number, default: 0 },
  });
  schema.set('autoIndex', true);
  app.db.model('EntryRevisionCounter', schema);
};

export = factory;

