'use strict';

module.exports = function(app, mongoose) {
  var schema = new mongoose.Schema({
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User' }
  });
  schema.plugin(require('../plugins/pagedFind'));
  schema.index({ id: 1 });
  schema.index({ word: 1 });
  schema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('Meaning', schema);
};
