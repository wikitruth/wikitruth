'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const recoveryCodeSetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    batchId: { type: String, required: true },
    codes: [
      {
        hash: { type: String, required: true },
        usedAt: { type: Date, default: null },
      },
    ],
    createDate: { type: Date, default: Date.now },
    editDate: { type: Date, default: Date.now },
  });

  recoveryCodeSetSchema.set('autoIndex', app.get('env') === 'development');
  app.db.model('RecoveryCodeSet', recoveryCodeSetSchema);
};

export = factory;
