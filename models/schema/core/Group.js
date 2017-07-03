'use strict';

module.exports = function(app, mongoose) {
  var schema = new mongoose.Schema({
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    admins: [ { type: mongoose.Schema.ObjectId, ref: 'User' } ],
    members: [ { type: mongoose.Schema.ObjectId, ref: 'User' } ]
  });
  schema.plugin(require('../plugins/pagedFind'));
  schema.index({ title: 1 });
  schema.index({
    title: "text",
    description: "text"
  }, {
    weights: {
      title: 10,
      description: 8
    },
    name: "TextIndex"
  });
  schema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('Group', schema);
};
