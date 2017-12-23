'use strict';

var constants   = require('../../constants');

module.exports = function(app, mongoose) {
  var schema = new mongoose.Schema({
    title: { type: String, default: '' },
    contextTitle: { type: String }, // A title alias for current context
    contentPreview: { type: String}, // A preview lines of text to display in list view
    content: { type: String, default: '' },
    friendlyUrl: { type: String },
    referenceDate: { type: Date }, // If the entry is time/date sensitive or may become obsolete in the future, add a ref date
    references: { type: String, default: '' },
    parentId: { type: mongoose.Schema.ObjectId, default: null }, // Used when the parent is also a topic
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    categoryId: { type: mongoose.Schema.ObjectId, ref: 'Topic' }, // the root topic where this entry belong
    ownerId: { type: mongoose.Schema.ObjectId, default: null }, // Required when owner is not a Topic. Useful for filtering
    ownerType: { type: Number, default: -1 }, // OBJECT_TYPES
    icon: { type: String }, // ex: "fa fa-plane"
    typeId: { type: Number }, // TOPIC_TYPES
    tags: [ { type: Number } ], // OBJECT_TAGS
    screening: {
      status: { type: Number, default: constants.SCREENING_STATUS.status0.code}, // SCREENING_STATUS
      history: [{
        userId: { type: mongoose.Schema.ObjectId, ref: 'User' },
        date: { type: Date, default: Date.now },
        status: { type: Number } // SCREENING_STATUS
      }]
    },
    private: { type: Boolean, default: false }, // if true, should be restricted to group/user owners and not included in public backup
    ethicalStatus: {
      hasValue: { type: Boolean, default: false },
      status: { type: Number } // ETHICAL_STATUS
    },
    outline: [
      {
        listType: { type: Number }, // OBJECT_TYPES
        id: { type: mongoose.Schema.ObjectId },
        title: { type: String }, // Friendly title/caption
        isDefault: { type: Boolean }, // default=uncategorized
        isValued: { type: Boolean },
        items: [{
          id: { type: mongoose.Schema.ObjectId },
          isPro: { type: Boolean }
        }]
      }
    ],
    verdict: {
      status: { type: Number },
      editDate: { type: Date },
      editUserId: { type: mongoose.Schema.ObjectId, ref: 'User'}
    },
    childrenCount: {
      topics: {
        total: { type: Number, default: 0 },
        accepted: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        rejected: { type: Number, default: 0 }
      },
      artifacts: {
        total: { type: Number, default: 0 },
        accepted: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        rejected: { type: Number, default: 0 }
      },
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
    sharing: {
      users: [{
        userId: { type: mongoose.Schema.ObjectId, ref: 'User'},
        grantDate: { type: Date, default: Date.now },
        permission: { type: Number, default: 1 } // 1 read, 2 read/write
      }]
    },
    extras: { type: mongoose.Schema.Types.Mixed }
  });
  schema.methods.getType = function() {
    return constants.OBJECT_TYPES.topic;
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
  schema.set('autoIndex', true); // (app.get('env') === 'development'));
  app.db.model('Topic', schema);
};
