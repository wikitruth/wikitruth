'use strict';

import type { SchemaFactory } from '../factory';
import { CIVIC_TENANT_ROLES } from '../../../types/civicTenancy';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    tenantId: { type: String, required: true, lowercase: true, trim: true, index: true },
    userId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    roles: [{ type: String, enum: CIVIC_TENANT_ROLES }],
    active: { type: Boolean, default: true, index: true },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    createDate: { type: Date, default: Date.now },
    editDate: { type: Date, default: Date.now },
  });

  schema.index({ tenantId: 1, userId: 1 }, { unique: true });
  schema.index({ tenantId: 1, roles: 1, active: 1 });
  app.db.model('TenantMembership', schema);
};

export = factory;
