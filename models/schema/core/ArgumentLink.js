'use strict';

var constants   = require('../../constants');

module.exports = function(app, mongoose) {
  var schema = new mongoose.Schema({
    title: { type: String }, // contextual title (optional)
    argumentId: { type: mongoose.Schema.ObjectId, ref: 'Argument' }, // the original Argument it links to
    parentId: { type: mongoose.Schema.ObjectId, default: null }, // always an Argument
    categoryId: { type: mongoose.Schema.ObjectId, ref: 'Topic' }, // the root topic where this entry belong
    ownerId: { type: mongoose.Schema.ObjectId }, // usually a Topic but can be a different object
    ownerType: { type: Number }, // OBJECT_TYPES
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User'},
    threadId: { type: mongoose.Schema.ObjectId, ref: 'Argument' },
    screening: {
      status: { type: Number, default: constants.SCREENING_STATUS.status0.code}, // SCREENING_STATUS
      history: [{
        userId: { type: mongoose.Schema.ObjectId, ref: 'User' },
        date: { type: Date, default: Date.now },
        status: { type: Number } // SCREENING_STATUS
      }]
    },
    linkType: { type: Number, default: constants.LINK_TYPES.child },
    bidirectional: { type: Boolean, default: true }, // If yes, it will show the corresponding behavior on the opposite side.
    private: { type: Boolean, default: false }, // if true, should be restricted to group/user owners and not included in public backup
    negative: { type: Boolean, default: false }, // a negative or positive statement
    against: { type: Boolean, default: false }, // how it relates to parent Argument, default is in support
    childrenCount: {
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
    }
  });
  schema.methods.getType = function() {
    return constants.OBJECT_TYPES.argumentLink;
  };
  schema.plugin(require('../plugins/pagedFind'));
  schema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('ArgumentLink', schema);
};
