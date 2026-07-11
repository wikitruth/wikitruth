'use strict';

import crypto from 'crypto';
import type { Router } from 'express';

import appModForDb from '../../app';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import * as flowUtils from '../../utils/flowUtils';
import { logEntryEvent } from '../../services/entryEventsService';
import {
  getBootstrapBackupAvailability,
  restoreDatabaseBackup,
} from './adminBackupRoutes';

type CountModel = {
  countDocuments: (query?: Record<string, unknown>) => Promise<number>;
};

type InstallDb = {
  Admin: CountModel;
  Topic: CountModel;
  User: CountModel;
};

interface InstallBody {
  bootstrapToken?: unknown;
  confirmText?: unknown;
}

const db = (appModForDb as unknown as { db: { models: InstallDb } }).db.models;
const attemptsByAddress = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

function getConfiguredBootstrapToken(): string {
  return String(process.env.WIKITRUTH_INSTALL_TOKEN || '').trim();
}

function isTokenConfigured(token: string): boolean {
  return token.length >= 16;
}

function safeTokenEquals(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function consumeAttempt(req: WikitruthRequest, res: WikitruthResponse): boolean {
  const now = Date.now();
  const address = String(req.ip || req.socket?.remoteAddress || 'unknown');
  const current = attemptsByAddress.get(address);
  const attempt = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + ATTEMPT_WINDOW_MS }
    : { count: current.count + 1, resetAt: current.resetAt };
  attemptsByAddress.set(address, attempt);

  res.setHeader('RateLimit-Limit', String(MAX_ATTEMPTS));
  res.setHeader('RateLimit-Remaining', String(Math.max(0, MAX_ATTEMPTS - attempt.count)));
  res.setHeader('RateLimit-Reset', String(Math.ceil(attempt.resetAt / 1000)));

  if (attempt.count > MAX_ATTEMPTS) {
    res.status(429).json({
      success: false,
      message: 'Too many bootstrap attempts. Try again after the rate-limit window.',
    });
    return false;
  }

  return true;
}

async function getCoreDatabaseState() {
  const [admins, topics, users] = await Promise.all([
    db.Admin.countDocuments({}),
    db.Topic.countDocuments({}),
    db.User.countDocuments({}),
  ]);

  return {
    empty: admins === 0 && topics === 0 && users === 0,
    hasAdmin: admins > 0,
    hasTopics: topics > 0,
    hasUsers: users > 0,
  };
}

export = function (router: Router) {
  router.get('/', async function (_req: WikitruthRequest, res: WikitruthResponse) {
    const state = await getCoreDatabaseState();
    const token = getConfiguredBootstrapToken();
    const backup = getBootstrapBackupAvailability();

    res.json({
      success: true,
      install: {
        databaseEmpty: state.empty,
        initialized: !state.empty,
        hasAdmin: state.hasAdmin,
        tokenConfigured: isTokenConfigured(token),
        tokenRequired: true,
        backupReady: backup.ready,
        requiredCollections: backup.requiredCollections,
        missingCollections: backup.missingCollections,
        eligible: state.empty && isTokenConfigured(token) && backup.ready,
        adminRestorePath: state.hasAdmin ? '/admin/db-backup' : null,
      },
    });
  });

  router.post('/restore', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!consumeAttempt(req, res)) {
      return;
    }

    const state = await getCoreDatabaseState();
    if (!state.empty) {
      res.status(409).json({
        success: false,
        message: state.hasAdmin
          ? 'The database is initialized. Sign in as an administrator and use the admin restore page.'
          : 'Bootstrap restore is only available when users, administrators, and topics are all empty.',
      });
      return;
    }

    const configuredToken = getConfiguredBootstrapToken();
    if (!isTokenConfigured(configuredToken)) {
      res.status(503).json({
        success: false,
        message: 'Bootstrap restore is disabled until WIKITRUTH_INSTALL_TOKEN is configured with at least 16 characters.',
      });
      return;
    }

    const body = (req.body || {}) as InstallBody;
    const suppliedToken = String(body.bootstrapToken || '');
    if (!safeTokenEquals(suppliedToken, configuredToken)) {
      res.status(403).json({ success: false, message: 'Bootstrap token is invalid.' });
      return;
    }

    if (String(body.confirmText || '').trim().toUpperCase() !== 'RESTORE') {
      res.status(400).json({
        success: false,
        message: 'Restore confirmation failed. Type RESTORE to continue.',
      });
      return;
    }

    const backup = getBootstrapBackupAvailability();
    if (!backup.ready) {
      res.status(409).json({
        success: false,
        message: `Bootstrap backup is incomplete. Missing collections: ${backup.missingCollections.join(', ')}.`,
      });
      return;
    }

    const summary = await restoreDatabaseBackup({
      restorePublicData: true,
      restorePrivateData: true,
    });
    flowUtils.resetCache(req);

    const restoredState = await getCoreDatabaseState();
    if (!restoredState.hasAdmin || !restoredState.hasTopics || !restoredState.hasUsers) {
      res.status(500).json({
        success: false,
        message: 'Restore finished but required administrator, user, or topic data is still missing.',
        restore: { summary },
      });
      return;
    }

    try {
      await logEntryEvent({
        scope: 'privileged',
        eventType: 'install.bootstrap.restore',
        objectType: 1,
        objectName: 'topic',
        objectId: 'bootstrap',
        actorUserId: '',
        actorUsername: 'bootstrap',
        message: 'Executed one-time empty-database bootstrap restore',
        payload: { summary },
      });
    } catch (error) {
      console.error('Unable to record bootstrap restore audit event:', error);
    }

    res.json({
      success: true,
      message: 'Bootstrap restore completed. Sign in with a restored administrator account.',
      restore: {
        completedAt: new Date().toISOString(),
        summary,
      },
    });
  });
};
