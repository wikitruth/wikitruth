'use strict';

import type { SchemaFactory } from '../factory';

const factory: SchemaFactory = function (app, mongoose) {
  const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    email: { type: String, unique: true },
    roles: {
      admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
      account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
      screener: { type: Boolean, default: false },
      reviewer: { type: Boolean, default: false },
    },
    isActive: String,
    timeCreated: { type: Date, default: Date.now },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    mobileTokens: [
      {
        tokenId: { type: String, default: '' },
        tokenHash: { type: String, default: '' },
        issuedAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, default: Date.now },
        revokedAt: { type: Date, default: null },
        client: {
          platform: { type: String, default: '' },
          version: { type: String, default: '' },
          build: { type: String, default: '' },
        },
      },
    ],
    twitter: {},
    github: {},
    facebook: {},
    google: {},
    apple: {},
    microsoft: {},
    tumblr: {},
    preferences: { type: mongoose.Schema.Types.Mixed },
    search: [String],
  });
  userSchema.methods.canPlayRoleOf = function (role: any) {
    if (role === 'admin' && this.roles.admin) {
      return true;
    }
    if (role === 'account' && this.roles.account) {
      return true;
    }
    if (role === 'reviewer' && this.roles.reviewer) {
      return true;
    }
    if (role === 'screener' && this.roles.screener) {
      return true;
    }

    return false;
  };
  userSchema.methods.defaultReturnUrl = function() {
    const returnUrl = '/';
    /*if (this.canPlayRoleOf('account')) {
      returnUrl = '/account/';
    }

    if (this.canPlayRoleOf('admin')) {
      returnUrl = '/admin/';
    }*/

    return returnUrl;
  };
  userSchema.methods.isAdmin = function() {
    return this.canPlayRoleOf('admin');
  };
  userSchema.statics.encryptPassword = function (password: any, done: any) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const bcrypt = require('bcrypt');
    bcrypt.genSalt(10, function (err: any, salt: any) {
      if (err) {
        return done(err);
      }

      bcrypt.hash(password, salt, function (err: any, hash: any) {
        done(err, hash);
      });
    });
  };
  userSchema.statics.validatePassword = async function (password: any, hash: any) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const bcrypt = require('bcrypt');
    return bcrypt.compare(password, hash);
  };
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  userSchema.plugin(require('../plugins/pagedFind'));
  // userSchema.index({ username: 1 }, { unique: true });
  // userSchema.index({ email: 1 }, { unique: true });
  userSchema.index({ timeCreated: 1 });
  userSchema.index({ 'twitter.id': 1 });
  userSchema.index({ 'github.id': 1 });
  userSchema.index({ 'facebook.id': 1 });
  userSchema.index({ 'google.id': 1 });
  userSchema.index({ 'apple.id': 1 });
  userSchema.index({ 'microsoft.id': 1 });
  userSchema.index({ search: 1 });
  userSchema.set('autoIndex', (app.get('env') === 'development'));
  app.db.model('User', userSchema);
};

export = factory;
