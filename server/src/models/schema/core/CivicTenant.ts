'use strict';

import type { SchemaFactory } from '../factory';
import {
  CIVIC_DEPLOYMENT_MODES,
  CIVIC_TENANT_STATUSES,
} from '../../../types/civicTenancy';

const factory: SchemaFactory = function (app, mongoose) {
  const sectionSchema = new mongoose.Schema({
    slug: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    icon: { type: String, default: 'circle' },
    kinds: [{ type: String }],
    createKinds: [{ type: String }],
    enabled: { type: Boolean, default: true },
  }, { _id: false });

  const schema = new mongoose.Schema({
    tenantId: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    status: { type: String, enum: CIVIC_TENANT_STATUSES, default: 'active', index: true },
    countryCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    navTitle: { type: String, default: '', trim: true },
    slogan: { type: String, default: '' },
    domains: [{ type: String, lowercase: true, trim: true }],
    branding: {
      logoIcon: { type: String, default: '' },
      favicon: { type: String, default: '' },
      primaryColor: { type: String, default: '#1f6f50' },
      accentColor: { type: String, default: '#d96b27' },
      surfaceColor: { type: String, default: '#f5f1e8' },
      fontFamily: { type: String, default: '' },
    },
    localization: {
      defaultLocale: { type: String, default: 'en' },
      supportedLocales: [{ type: String }],
      timezone: { type: String, default: 'UTC' },
      currency: { type: String, default: 'USD', uppercase: true },
    },
    geography: {
      levels: [{
        _id: false,
        key: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
      }],
      addressFields: [{ type: String }],
    },
    sections: { type: [sectionSchema], default: [] },
    featureFlags: { type: mongoose.Schema.Types.Mixed, default: {} },
    extensionSchemas: { type: mongoose.Schema.Types.Mixed, default: {} },
    moderationPolicyVersion: { type: String, default: '1' },
    electionSystem: { type: String, default: '' },
    deploymentMode: { type: String, enum: CIVIC_DEPLOYMENT_MODES, default: 'shared' },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    createDate: { type: Date, default: Date.now },
    editDate: { type: Date, default: Date.now },
  });

  schema.index({ domains: 1, status: 1 });
  schema.index({ countryCode: 1, status: 1, title: 1 });
  app.db.model('CivicTenant', schema);
};

export = factory;
