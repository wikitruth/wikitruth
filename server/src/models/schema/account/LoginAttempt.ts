'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const attemptSchema = new mongoose.Schema({
    ip: {type: String, default: ''},
    user: {type: String, default: ''},
    time: {type: Date, default: Date.now, expires: app.config.loginAttempts.logExpiration}
  });
  attemptSchema.index({ ip: 1 });
  attemptSchema.index({ user: 1 });
  attemptSchema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('LoginAttempt', attemptSchema);
};

export = factory;
