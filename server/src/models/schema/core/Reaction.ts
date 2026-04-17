'use strict';

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ...
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    objectType: { type: Number, required: true },
    objectName: { type: String, required: true },
    entryId: { type: mongoose.Schema.ObjectId, required: true },
    userId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    channel: { type: String, required: true, enum: ['exposure', 'vote', 'value'] },
    value: { type: String, required: true },
    createDate: { type: Date, default: Date.now },
    editDate: { type: Date, default: Date.now },
  });

  schema.index({ entryId: 1, objectType: 1, channel: 1, value: 1 });
  schema.index({ entryId: 1, userId: 1, channel: 1 }, { unique: true });
  schema.set('autoIndex', true);

  app.db.model('Reaction', schema);
};
