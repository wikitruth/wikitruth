'use strict';

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    userId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    clientIp: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    createDate: { type: Date, default: Date.now },
  });
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  schema.plugin(require('../plugins/pagedFind'));
  schema.index({ userId: 1 });
  schema.index({ clientId: 1 });
  schema.set('autoIndex', app.get('env') === 'development');
  app.db.model('TrustedClient', schema);
};
