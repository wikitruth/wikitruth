'use strict';

exports = module.exports = function(app, mongoose) {
  var schema = new mongoose.Schema({
    content: { type: String, default: '' },
    title: { type: String, default: '' },
    ownerId: { type: mongoose.Schema.ObjectId },
    ownerType: { type: Number }, // MODEL_TYPES
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User'},
    type: { type: Number }, // ARGUMENT_TYPES
    linkedArguments: [
      {
        argumentId: { type: mongoose.Schema.ObjectId },
        linkType: { type: Number } // ARGUMENT_LINK_TYPES
      }
    ]
  });
  schema.plugin(require('../plugins/pagedFind'));
  schema.index({ title: 1 });
  schema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('Argument', schema);
};
