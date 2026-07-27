'use strict';

import type { SchemaFactory } from '../factory';

// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
const constants = require('../../constants');

const factory: SchemaFactory = function (app, mongoose) {
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
    typeId: { type: Number, default: constants.ARGUMENT_TYPES.factual },
    artifactType: {
      type: String,
      enum: ['document', 'image', 'audio', 'video', 'dataset', 'web_capture', 'physical_record', 'testimony', 'other'],
      default: 'other',
      index: true,
    },
    provenance: {
      originType: {
        type: String,
        enum: ['primary', 'secondary', 'derived', 'unknown'],
        default: 'unknown',
      },
      creator: { type: String, default: '' },
      publisher: { type: String, default: '' },
      publicationDate: { type: Date, default: null },
      captureDate: { type: Date, default: null },
      archiveUrl: { type: String, default: '' },
      checksum: { type: String, default: '' },
      sourceIntegrity: {
        status: { type: String, enum: ['unchecked', 'healthy', 'changed', 'broken', 'blocked'], default: 'unchecked', index: true },
        checkedAt: { type: Date, default: null },
        nextCheckAt: { type: Date, default: null, index: true },
        httpStatus: { type: Number, default: null },
        finalUrl: { type: String, default: '' },
        redirectCount: { type: Number, default: 0 },
        contentHash: { type: String, default: '' },
        expectedHash: { type: String, default: '' },
        hashMatches: { type: Boolean, default: null },
        contentType: { type: String, default: '' },
        contentLength: { type: Number, default: null },
        error: { type: String, default: '' },
      },
      accessLimitations: { type: String, default: '' },
      verifiabilityNotes: { type: String, default: '' },
      sourceQuality: {
        identity: { type: Number, min: 0, max: 4, default: null },
        proximity: { type: Number, min: 0, max: 4, default: null },
        integrity: { type: Number, min: 0, max: 4, default: null },
        recency: { type: Number, min: 0, max: 4, default: null },
        reproducibility: { type: Number, min: 0, max: 4, default: null },
        total: { type: Number, min: 0, max: 20, default: null },
        notes: { type: String, default: '' },
        reviewDate: { type: Date, default: null },
        reviewUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
        reviewUsername: { type: String, default: '' },
      },
    },
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
  schema.statics.getFolder = function (username: string, entity: { private?: boolean }) {
    return '/media/artifacts/' + (username && entity.private ? 'users/' + username + '/' : '');
  };
  schema.statics.isImage = function (entity: { file: { type: string } }) {
    return entity.file.type.startsWith('image');
  };

  // schema methods
  schema.methods.getType = function () {
    return constants.OBJECT_TYPES.artifact;
  };
  schema.methods.getFolder = function (username: string) {
    // router
    return (this.constructor as unknown as { getFolder: (u: string, e: unknown) => string }).getFolder(username, this);
  };
  schema.methods.getFilePath = function (username: string) {
    return this.getFolder(username) + this._id + '_' + this.file.name;
  };
  schema.methods.getThumbnailPath = function (username: string) {
    if (this.isImage()) {
      return this.getFolder(username) + this._id + '_thumbnail_' + this.file.name;
    }
    return null;
  };
  schema.methods.isImage = function () {
    // router
    return (this.constructor as unknown as { isImage: (e: unknown) => boolean }).isImage(this);
  };
  schema.methods.setThumbnailPath = function (username: string) {
    if (this.file.name) {
      this.filePath = this.getFilePath(username);
      if (this.isImage()) {
        this.thumbnailPath = this.getThumbnailPath(username);
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
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

export = factory;
