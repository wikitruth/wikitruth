'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const noteSchema = new mongoose.Schema({
    data: {type: String, default: ''},
    userCreated: {
      id: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
      name: {type: String, default: ''},
      time: {type: Date, default: Date.now}
    }
  });
  app.db.model('Note', noteSchema);

  // console.log('Note schema:', noteSchema);
  // console.log('Note schema:', app.db.models.Note.schema);
};

export = factory;
