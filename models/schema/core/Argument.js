'use strict';

exports = module.exports = function(app, mongoose) {
  var schema = new mongoose.Schema({
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    references: { type: String, default: '' },
    parentId: { type: mongoose.Schema.ObjectId, default: null }, // always an Argument
    ownerId: { type: mongoose.Schema.ObjectId }, // usually a Topic but can be a different object
    ownerType: { type: Number }, // OBJECT_TYPES
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User'},
    typeId: { type: Number }, // ARGUMENT_TYPES
    groupId: { type: Number, default: -1 },
    threadId: { type: mongoose.Schema.ObjectId, ref: 'Argument' },
    against: { type: Boolean, default: false }, // how it relates to parent Argument, default is in support
    linkedArguments: [
      {
        argumentId: { type: mongoose.Schema.ObjectId },
        linkType: { type: Number } // ARGUMENT_LINK_TYPES
      }
    ],
    verdict: {
      status: { type: Number },
      editDate: { type: Date },
      editUserId: { type: mongoose.Schema.ObjectId, ref: 'User'}
    }
  });
  schema.plugin(require('../plugins/pagedFind'));
  schema.index({ title: 1 });
  schema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('Argument', schema);
};
