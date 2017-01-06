'use strict';

var constants   = require('../../constants');

exports = module.exports = function(app, mongoose) {
  var schema = new mongoose.Schema({
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    references: { type: String, default: '' },
    friendlyUrl: { type: String },
    screeningStatus: { type: Number, default: constants.SCREENING_STATUS.status0.code }, // SCREENING_STATUS
    questionId: { type: mongoose.Schema.ObjectId },
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    private: { type: Boolean, default: false }, // if true, should be restricted to group/user owners and not included in public backup
    childrenCount: {
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
  schema.set('autoIndex', true);
  app.db.model('Answer', schema);
};
