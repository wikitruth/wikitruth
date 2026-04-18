'use strict';

module.exports = function (app: any, mongoose: any) {
  const schema = new mongoose.Schema({
    scope: {
      type: String,
      enum: ['entry', 'privileged'],
      default: 'entry',
      index: true,
    },
    eventType: { type: String, required: true, index: true },
    objectType: { type: Number, required: true, index: true },
    objectName: { type: String, required: true, index: true },
    objectId: { type: mongoose.Schema.ObjectId, required: true, index: true },
    actorUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null, index: true },
    actorUsername: { type: String, default: '' },
    message: { type: String, default: '' },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    createDate: { type: Date, default: Date.now, index: true },
  });

  schema.index({ objectType: 1, objectId: 1, createDate: -1 });
  schema.index({ scope: 1, createDate: -1 });
  schema.set('autoIndex', true);

  app.db.model('EntryEvent', schema);
};
