'use strict';

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (app, mongoose) {
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
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  schema.plugin(require('../plugins/pagedFind'));
  schema.set('autoIndex', app.get('env') === 'development');
  app.db.model('ObjectLink', schema);
};
