'use strict';

var constants   = require('../../constants');

exports = module.exports = function(app, mongoose) {
  var schema = new mongoose.Schema({
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    referenceDate: { type: Date }, // If the entry is time/date sensitive or may become obsolete in the future, add a ref date
    references: { type: String, default: '' },
    screeningStatus: { type: Number }, // SCREENING_STATUS
    parentId: { type: mongoose.Schema.ObjectId, default: null }, // always an Argument
    ownerId: { type: mongoose.Schema.ObjectId }, // usually a Topic but can be a different object
    ownerType: { type: Number }, // OBJECT_TYPES
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User'},
    typeId: { type: Number, default: constants.ARGUMENT_TYPES.factual }, // ARGUMENT_TYPES
    tags: [ { type: Number } ], // OBJECT_TAGS
    threadId: { type: mongoose.Schema.ObjectId, ref: 'Argument' },
    against: { type: Boolean, default: false }, // how it relates to parent Argument, default is in support
    ethicalStatus: {
      hasValue: { type: Boolean, default: false },
      status: { type: Number } // ETHICAL_STATUS
    },
    verdict: {
      status: { type: Number },
      editDate: { type: Date },
      editUserId: { type: mongoose.Schema.ObjectId, ref: 'User'}
    },
    childrenCount: {
      arguments: { type: Number },
      questions: { type: Number },
      issues: { type: Number },
      opinions: { type: Number }
    }
  });
  schema.plugin(require('../plugins/pagedFind'));
  schema.index({ title: 1 });
  schema.index({
    title: "text",
    content: "text",
    references: "text"
  }, {
    weights: {
      title: 10,
      content: 8,
      references: 6
    },
    name: "TextIndex"
  });
  schema.set('autoIndex', true); //(app.get('env') === 'development'));
  app.db.model('Argument', schema);
};
