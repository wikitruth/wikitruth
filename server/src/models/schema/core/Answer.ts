'use strict';

import type { SchemaFactory } from '../factory';

// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
const constants = require('../../constants');

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    contentPreview: { type: String }, // A preview lines of text to display in list view
    references: { type: String, default: '' },
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
    questionId: { type: mongoose.Schema.ObjectId },
    groupId: { type: mongoose.Schema.ObjectId, ref: 'Group', default: null },
    categoryId: { type: mongoose.Schema.ObjectId, ref: 'Topic' }, // the root topic where this entry belong
    createDate: { type: Date, default: Date.now },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    editDate: { type: Date, default: Date.now },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    private: { type: Boolean, default: false }, // if true, should be restricted to group/user owners and not included in public backup
    verdict: {
      status: { type: Number },
      editDate: { type: Date },
      editUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    },
    verdicts: {
      factual: {
        status: { type: String, enum: ['pending', 'supported', 'refuted', 'mixed', 'insufficient_evidence'], default: 'pending' },
        reasoning: { type: String, default: '' },
        evidenceRefs: [{ type: mongoose.Schema.ObjectId, ref: 'Artifact' }],
        decisionMode: { type: String, enum: ['none', 'consensus', 'admin_override'], default: 'none' },
        policyVersion: { type: String, default: '' },
        overrideReason: { type: String, default: '' },
        consensusSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
        editDate: { type: Date, default: null },
        editUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
      },
      ethical: {
        status: { type: String, enum: ['pending', 'permissible', 'impermissible', 'contested', 'not_applicable'], default: 'pending' },
        reasoning: { type: String, default: '' },
        framework: { type: String, default: '' },
        evidenceRefs: [{ type: mongoose.Schema.ObjectId, ref: 'Artifact' }],
        decisionMode: { type: String, enum: ['none', 'consensus', 'admin_override'], default: 'none' },
        policyVersion: { type: String, default: '' },
        overrideReason: { type: String, default: '' },
        consensusSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
        editDate: { type: Date, default: null },
        editUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
      },
    },
    childrenCount: {
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
  schema.methods.getType = function () {
    return constants.OBJECT_TYPES.answer;
  };
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  schema.plugin(require('../plugins/pagedFind'));
  schema.index({ title: 1 });
  schema.index(
    {
      title: 'text',
      content: 'text',
      references: 'text',
    },
    {
      weights: {
        title: 10,
        content: 8,
        references: 6,
      },
      name: 'TextIndex',
    }
  );
  schema.set('autoIndex', true);
  app.db.model('Answer', schema);
};

export = factory;
