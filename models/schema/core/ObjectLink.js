'use strict';

exports = module.exports = function(app, mongoose) {
  var schema = new mongoose.Schema({
    leftId: { type: mongoose.Schema.ObjectId },
    leftType: { type: Number },
    rightId: { type: mongoose.Schema.ObjectId },
    rightType: { type: Number },
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User' }
  });
  schema.plugin(require('../plugins/pagedFind'));
  schema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('ObjectLink', schema);
};
