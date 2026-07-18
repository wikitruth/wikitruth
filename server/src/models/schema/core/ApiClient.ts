'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const schema = new mongoose.Schema({
    clientId: { type: String, required: true, unique: true, index: true, immutable: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    userId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    tokenPrefix: { type: String, required: true },
    secretHash: { type: String, required: true, select: false },
    scopes: [{
      type: String,
      enum: ['entries:read', 'contributions:write', 'graph:write', 'civic:write', 'moderation:write', 'admin:write'],
    }],
    status: { type: String, enum: ['active', 'revoked'], default: 'active', required: true, index: true },
    expiresAt: { type: Date, default: null, index: true },
    rateLimitPerMinute: { type: Number, min: 10, max: 600, default: 60 },
    lastUsedAt: { type: Date, default: null },
    lastUsedIp: { type: String, default: '' },
    requestCount: { type: Number, default: 0 },
    createUserId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    createDate: { type: Date, default: Date.now, immutable: true },
    editUserId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    editDate: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
    revokedByUserId: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
  });

  schema.index({ userId: 1, status: 1, createDate: -1 });
  schema.set('autoIndex', true);
  app.db.model('ApiClient', schema);
};

export = factory;
