'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
const constants = require('../../constants');

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    source: { type: String, default: '' }, // Link to original content or URL
    file: {
      name: { type: String, default: '' }, // If present, indicates an inline file artifact
      type: { type: String },
      size: { type: Number },
      lastModifiedDate: { type: Date },
    },
    contentPreview: { type: String }, // A preview lines of text to display in list view
    friendlyUrl: { type: String },
    screening: {
      status: { type: Number, default: constants.SCREENING_STATUS.status0.code }, // SCREENING_STATUS
      history: [
        {
          userId: { type: mongoose.Schema.ObjectId, ref: 'User' },
          date: { type: Date, default: Date.now },
          status: { type: Number }, // SCREENING_STATUS
        },
      ],
    },
    ownerId: { type: mongoose.Schema.ObjectId },
    ownerType: { type: Number }, // MODEL_TYPES
    parentId: { type: mongoose.Schema.ObjectId, default: null }, // Artifacts can have sub-artifacts
    private: { type: Boolean, default: false }, // if true, should be restricted to group/user owners and not included in public backup
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    groupId: { type: mongoose.Schema.ObjectId, ref: 'Group', default: null },
    categoryId: { type: mongoose.Schema.ObjectId, ref: 'Topic' }, // the root topic where this entry belong
    tags: [{ type: Number }], // OBJECT_TAGS
    childrenCount: {
      artifacts: {
        total: { type: Number, default: 0 },
        accepted: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        rejected: { type: Number, default: 0 },
      },
      arguments: {
        total: { type: Number, default: 0 },
        accepted: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        rejected: { type: Number, default: 0 },
      },
      questions: {
        total: { type: Number, default: 0 },
        accepted: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        rejected: { type: Number, default: 0 },
      },
      issues: {
        total: { type: Number, default: 0 },
        accepted: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        rejected: { type: Number, default: 0 },
        acceptedCritical: { type: Number, default: 0 },
      },
      opinions: {
        total: { type: Number, default: 0 },
        accepted: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        rejected: { type: Number, default: 0 },
      },
    },
    extras: { type: mongoose.Schema.Types.Mixed },
  });

  // schema statics
  // @ts-ignore TS(7006): Parameter 'username' implicitly has an 'any' type.
  schema.statics.getFolder = function (username, entity) {
    return '/media/artifacts/' + (username && entity.private ? 'users/' + username + '/' : '');
  };
  // @ts-ignore TS(7006): Parameter 'entity' implicitly has an 'any' type.
  schema.statics.isImage = function (entity) {
    return entity.file.type.startsWith('image');
  };

  // schema methods
  schema.methods.getType = function () {
    return constants.OBJECT_TYPES.artifact;
  };
  // @ts-ignore TS(7006): Parameter 'username' implicitly has an 'any' type.
  schema.methods.getFolder = function (username) {
    // router
    return this.constructor.getFolder(username, this);
  };
  // @ts-ignore TS(7006): Parameter 'username' implicitly has an 'any' type.
  schema.methods.getFilePath = function (username) {
    return this.getFolder(username) + this._id + '_' + this.file.name;
  };
  // @ts-ignore TS(7006): Parameter 'username' implicitly has an 'any' type.
  schema.methods.getThumbnailPath = function (username) {
    if (this.isImage()) {
      return this.getFolder(username) + this._id + '_thumbnail_' + this.file.name;
    }
    return null;
  };
  schema.methods.isImage = function () {
    // router
    return this.constructor.isImage(this);
  };
  // @ts-ignore TS(7006): Parameter 'username' implicitly has an 'any' type.
  schema.methods.setThumbnailPath = function (username) {
    if (this.file.name) {
      this.filePath = this.getFilePath(username);
      if (this.isImage()) {
        this.thumbnailPath = this.getThumbnailPath(username);
      }
    }
  };

  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  schema.plugin(require('../plugins/pagedFind'));
  schema.index({ title: 1 });
  schema.index(
    {
      title: 'text',
      content: 'text',
      source: 'text',
    },
    {
      weights: {
        title: 10,
        content: 8,
        source: 6,
      },
      name: 'TextIndex',
    }
  );
  schema.set('autoIndex', true); // (app.get('env') === 'development'));
  app.db.model('Artifact', schema);
};
