'use strict';

exports = module.exports = function(app, mongoose) {
  var schema = new mongoose.Schema({
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    parentId: { type: mongoose.Schema.ObjectId, default: null },
    ownerId: { type: mongoose.Schema.ObjectId },
    ownerType: { type: Number }, // OBJECT_TYPES
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User'},
    groupId: { type: Number, default: -1 }
  });
  schema.plugin(require('../plugins/pagedFind'));
  schema.index({ title: 1 });
  schema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('Opinion', schema);
};
