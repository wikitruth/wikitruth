'use strict';

var constants   = require('../../constants');

module.exports = function(app, mongoose) {
  var schema = new mongoose.Schema({
    title: { type: String, default: '' },
    contentPreview: { type: String}, // A preview lines of text to display in list view
    content: { type: String, default: '' },
    referenceDate: { type: Date }, // If the entry is time/date sensitive or may become obsolete in the future, add a ref date
    references: { type: String, default: '' },
    friendlyUrl: { type: String },
    screening: {
      status: { type: Number, default: constants.SCREENING_STATUS.status0.code}, // SCREENING_STATUS
      history: [{
        userId: { type: mongoose.Schema.ObjectId, ref: 'User' },
        date: { type: Date, default: Date.now },
        status: { type: Number } // SCREENING_STATUS
      }]
    },
    parentId: { type: mongoose.Schema.ObjectId, default: null }, // always an Argument
    categoryId: { type: mongoose.Schema.ObjectId, ref: 'Topic' }, // the root topic where this entry belong
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
    parentRelationship: { type: Number }, // see constants.PARENT_RELATIONSHIP
    private: { type: Boolean, default: false }, // if true, should be restricted to group/user owners and not included in public backup
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
      arguments: {
        total: { type: Number, default: 0 },
        accepted: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        rejected: { type: Number, default: 0 }
      },
      questions: {
        total: { type: Number, default: 0 },
        accepted: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        rejected: { type: Number, default: 0 }
      },
      issues: {
        total: { type: Number, default: 0 },
        accepted: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        rejected: { type: Number, default: 0 },
        acceptedCritical: { type: Number, default: 0 }
      },
      opinions: {
        total: { type: Number, default: 0 },
        accepted: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        rejected: { type: Number, default: 0 }
      }
    },
    extras: { type: mongoose.Schema.Types.Mixed }
  });
  schema.methods.getType = function() {
    return constants.OBJECT_TYPES.argument;
  };
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
