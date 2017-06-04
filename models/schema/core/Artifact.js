'use strict';

module.exports = function(app, mongoose) {
  var schema = new mongoose.Schema({
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    source: { type: String, default: '' },
    url: { type: String, default: '' },
    friendlyUrl: { type: String },
    ownerId: { type: mongoose.Schema.ObjectId },
    ownerType: { type: Number }, // MODEL_TYPES
    categoryId: { type: mongoose.Schema.ObjectId, ref: 'Topic' }, // the root topic where this entry belong
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User' }
  });
  schema.plugin(require('../plugins/pagedFind'));
  schema.index({ title: 1 });
  schema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('Artifact', schema);
};
