'use strict';

import type { SchemaFactory } from '../factory';

const TRANSPORTS = ['ble', 'cable', 'hybrid', 'internal', 'nfc', 'smart-card', 'usb'];

const factory: SchemaFactory = function (app, mongoose) {
  const passkeyCredentialSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    credentialId: { type: String, required: true },
    publicKey: { type: Buffer, required: true, select: false },
    userHandle: { type: String, required: true },
    rpId: { type: String, required: true },
    counter: { type: Number, required: true, default: 0, min: 0 },
    transports: [{ type: String, enum: TRANSPORTS }],
    deviceType: { type: String, enum: ['singleDevice', 'multiDevice'], default: 'singleDevice' },
    backedUp: { type: Boolean, default: false },
    aaguid: { type: String, default: '' },
    name: { type: String, default: 'Passkey', maxlength: 80 },
    status: { type: String, enum: ['active', 'revoked'], default: 'active', index: true },
    createDate: { type: Date, default: Date.now },
    lastUsedAt: { type: Date, default: null },
    editDate: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
    revokedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  });

  passkeyCredentialSchema.index({ rpId: 1, credentialId: 1 }, { unique: true });
  passkeyCredentialSchema.index({ userId: 1, status: 1, createDate: 1 });
  passkeyCredentialSchema.set('autoIndex', app.get('env') === 'development');
  app.db.model('PasskeyCredential', passkeyCredentialSchema);
};

export = factory;
