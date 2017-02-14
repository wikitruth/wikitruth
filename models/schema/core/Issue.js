'use strict';

var constants   = require('../../constants');

exports = module.exports = function(app, mongoose) {
  var schema = new mongoose.Schema({
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    contentPreview: { type: String}, // A preview lines of text to display in list view
    friendlyUrl: { type: String },
    issueType: { type: Number, default: constants.ISSUE_TYPES.type100.code },
    ownerId: { type: mongoose.Schema.ObjectId },
    ownerType: { type: Number }, // OBJECT_TYPES
    screening: {
      status: { type: Number, default: constants.SCREENING_STATUS.status0.code}, // SCREENING_STATUS
      history: [{
        userId: { type: mongoose.Schema.ObjectId, ref: 'User' },
        date: { type: Date, default: Date.now },
        status: { type: Number } // SCREENING_STATUS
      }]
    },
    childrenCount: {
      opinions: {
        total: { type: Number, default: 0 },
        accepted: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        rejected: { type: Number, default: 0 }
      }
    },
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User'},
    private: { type: Boolean, default: false }, // if true, should be restricted to group/user owners and not included in public backup
    isCritical: { type: Boolean }
  });
  schema.plugin(require('../plugins/pagedFind'));
  schema.index({ title: 1 });
  schema.index({
    title: "text",
    content: "text"
  }, {
    weights: {
      title: 10,
      content: 8
    },
    name: "TextIndex"
  });
  schema.set('autoIndex', true);
  app.db.model('Issue', schema);
};
