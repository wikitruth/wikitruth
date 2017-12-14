'use strict';

var constants   = require('../../constants');

module.exports = function(app, mongoose) {
  var schema = new mongoose.Schema({
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    source: { type: String, default: '' }, // Link to original content or URL
    file: {
      name: { type: String, default: ''}, // If present, indicates an inline file artifact
      type: { type: String },
      size: { type: Number },
      lastModifiedDate: { type: Date }
    },
    contentPreview: { type: String}, // A preview lines of text to display in list view
    friendlyUrl: { type: String },
    screening: {
      status: { type: Number, default: constants.SCREENING_STATUS.status0.code}, // SCREENING_STATUS
      history: [{
        userId: { type: mongoose.Schema.ObjectId, ref: 'User' },
        date: { type: Date, default: Date.now },
        status: { type: Number } // SCREENING_STATUS
      }]
    },
    ownerId: { type: mongoose.Schema.ObjectId },
    ownerType: { type: Number }, // MODEL_TYPES
    parentId: { type: mongoose.Schema.ObjectId, default: null }, // Artifacts can have sub-artifacts
    private: { type: Boolean, default: false }, // if true, should be restricted to group/user owners and not included in public backup
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    categoryId: { type: mongoose.Schema.ObjectId, ref: 'Topic' }, // the root topic where this entry belong
    tags: [ { type: Number } ], // OBJECT_TAGS
    childrenCount: {
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
    extras: { type: mongoose.Schema.Types.Mixed }
  });
  schema.methods.getType = function() {
    return constants.OBJECT_TYPES.artifact;
  };
  schema.methods.getFolder = function(username) {
    return '/media/artifacts/' + (username ? 'users/' + username + '/' : '');
  };
  schema.methods.getFilePath = function(username) {
    return '/media/artifacts/' + (username ? 'users/' + username + '/' : '') + this._id + '_' + this.file.name;
  };
  schema.methods.getThumbnailPath = function(username) {
    return '/media/artifacts/' + (username ? 'users/' + username + '/' : '') + this._id + '_thumbnail_' + this.file.name;
  };
  schema.methods.isImage = function() {
    return this.file.type.startsWith('image');
  };
  schema.plugin(require('../plugins/pagedFind'));
  schema.index({ title: 1 });
  schema.index({
    title: "text",
    content: "text",
    source: "text"
  }, {
    weights: {
      title: 10,
      content: 8,
      source: 6
    },
    name: "TextIndex"
  });
  schema.set('autoIndex', true); // (app.get('env') === 'development'));
  app.db.model('Artifact', schema);
};
