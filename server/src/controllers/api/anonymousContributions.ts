'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import appModForDb from '../../app';
import {
  ANONYMOUS_ENTRY_TYPES,
  anonymousAdoptionUrl,
  assessAnonymousRisk,
  contentFingerprint,
  createReceipt,
  hashAnonymousIdentity,
  hashReceipt,
  parseAnonymousContribution,
  receiptMatches,
  type AnonymousContributionLimits,
  type AnonymousEntryType,
} from '../../services/anonymousContributionsService';

const app = appModForDb as unknown as {
  config: {
    cryptoKey: string;
    anonymousContributions?: Partial<AnonymousContributionLimits> & {
      enabled?: boolean;
      perHour?: number;
      perDay?: number;
    };
  };
  db: { models: Record<string, any> };
};
const db = app.db.models;

const DEFAULT_LIMITS: AnonymousContributionLimits = {
  minimumFormAgeMs: 3000,
  maximumTitleLength: 180,
  maximumContentLength: 12000,
  maximumReferencesLength: 4000,
  maximumLinks: 8,
};

function positiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function settings() {
  const configured = app.config.anonymousContributions || {};
  return {
    enabled: configured.enabled === true,
    perHour: positiveNumber(configured.perHour, 3),
    perDay: positiveNumber(configured.perDay, 10),
    limits: {
      minimumFormAgeMs: positiveNumber(configured.minimumFormAgeMs, DEFAULT_LIMITS.minimumFormAgeMs),
      maximumTitleLength: positiveNumber(configured.maximumTitleLength, DEFAULT_LIMITS.maximumTitleLength),
      maximumContentLength: positiveNumber(configured.maximumContentLength, DEFAULT_LIMITS.maximumContentLength),
      maximumReferencesLength: positiveNumber(configured.maximumReferencesLength, DEFAULT_LIMITS.maximumReferencesLength),
      maximumLinks: positiveNumber(configured.maximumLinks, DEFAULT_LIMITS.maximumLinks),
    },
  };
}

function canModerate(req: WikitruthRequest): boolean {
  return Boolean(req.user?.roles?.screener || req.user?.roles?.reviewer || req.user?.roles?.admin);
}

function requireModerator(req: WikitruthRequest, res: WikitruthResponse): boolean {
  if (!req.user?._id && !req.user?.id) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return false;
  }
  if (!canModerate(req)) {
    res.status(403).json({ success: false, message: 'Screener, reviewer, or admin privileges required' });
    return false;
  }
  return true;
}

function requestIdentity(req: WikitruthRequest): { ip: string; userAgent: string } {
  return {
    ip: String(req.ips?.[0] || req.ip || req.socket?.remoteAddress || 'unknown'),
    userAgent: String(req.get('user-agent') || 'unknown').slice(0, 500),
  };
}

function publicStatus(submission: Record<string, any>) {
  return {
    id: String(submission._id || ''),
    entryType: submission.entryType,
    title: submission.title,
    status: submission.status,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
    moderation: {
      reason: submission.moderation?.reason || '',
      publishedEntryType: submission.moderation?.publishedEntryType || '',
      publishedEntryId: submission.moderation?.publishedEntryId || null,
    },
  };
}

export = function attachAnonymousContributions(router: Router) {
  router.get('/config', function (_req, res) {
    const current = settings();
    res.json({
      success: true,
      enabled: current.enabled,
      entryTypes: ANONYMOUS_ENTRY_TYPES,
      limits: {
        perHour: current.perHour,
        perDay: current.perDay,
        ...current.limits,
      },
    });
  });

  router.post('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    const current = settings();
    if (!current.enabled) {
      res.status(503).json({ success: false, message: 'Anonymous contributions are not enabled.' });
      return;
    }
    if (req.user?._id || req.user?.id) {
      res.status(400).json({ success: false, message: 'Signed-in contributors should use the normal editor.' });
      return;
    }
    if (String(req.body?.website || '').trim()) {
      res.status(400).json({ success: false, message: 'Submission could not be accepted.' });
      return;
    }

    const formStartedAt = Number(req.body?.formStartedAt);
    const formAge = Date.now() - formStartedAt;
    if (!Number.isFinite(formStartedAt) || formAge < current.limits.minimumFormAgeMs || formAge > 86_400_000) {
      res.status(400).json({ success: false, message: 'Please review the form before submitting.' });
      return;
    }

    const parsed = parseAnonymousContribution((req.body || {}) as Record<string, unknown>, current.limits);
    if (!parsed.ok) {
      res.status(400).json({ success: false, message: parsed.message });
      return;
    }

    const identity = requestIdentity(req);
    const secret = app.config.cryptoKey;
    const submitterHash = hashAnonymousIdentity(secret, identity.ip, identity.userAgent);
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [hourCount, dayCount] = await Promise.all([
      db.AnonymousContribution.countDocuments({ submitterHash, createdAt: { $gte: hourAgo } }),
      db.AnonymousContribution.countDocuments({ submitterHash, createdAt: { $gte: dayAgo } }),
    ]);
    if (hourCount >= current.perHour || dayCount >= current.perDay) {
      res.status(429).json({ success: false, message: 'Anonymous submission limit reached. Please try again later.' });
      return;
    }

    const contentHash = contentFingerprint(secret, parsed.value);
    const duplicate = await db.AnonymousContribution.findOne({ contentHash, createdAt: { $gte: dayAgo } })
      .select('_id')
      .lean();
    if (duplicate) {
      res.status(409).json({ success: false, message: 'This contribution was already submitted recently.' });
      return;
    }

    const receipt = createReceipt();
    const risk = assessAnonymousRisk(parsed.value, current.limits);
    const submission = await db.AnonymousContribution.create({
      ...parsed.value,
      status: 'pending',
      submitterHash,
      receiptHash: hashReceipt(secret, receipt),
      contentHash,
      risk,
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).json({
      success: true,
      message: 'Contribution received for screening.',
      receipt: { id: String(submission._id), token: receipt },
      submission: publicStatus(submission),
    });
  });

  router.get('/status/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    const receipt = String(req.query?.receipt || '');
    const submission = await db.AnonymousContribution.findById(req.params.id).lean();
    if (!submission || !receipt) {
      res.status(404).json({ success: false, message: 'Submission not found.' });
      return;
    }
    const actualHash = hashReceipt(app.config.cryptoKey, receipt);
    if (!receiptMatches(String(submission.receiptHash || ''), actualHash)) {
      res.status(404).json({ success: false, message: 'Submission not found.' });
      return;
    }
    res.json({ success: true, submission: publicStatus(submission) });
  });

  router.get('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireModerator(req, res)) return;
    const requestedStatus = String(req.query?.status || 'pending');
    const status = ['pending', 'in_review', 'accepted', 'rejected', 'all'].includes(requestedStatus)
      ? requestedStatus
      : 'pending';
    const query = status === 'all' ? {} : { status };
    const submissions = await db.AnonymousContribution.find(query)
      .select('-submitterHash -receiptHash -contentHash -contactEmail')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ success: true, status, submissions });
  });

  router.post('/:id/published', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireModerator(req, res)) return;
    const entryType = String(req.body?.entryType || '').trim() as AnonymousEntryType;
    const entryId = String(req.body?.entryId || '').trim();
    if (!ANONYMOUS_ENTRY_TYPES.includes(entryType) || !entryId) {
      res.status(400).json({ success: false, message: 'Published entry type and ID are required.' });
      return;
    }
    const modelName = entryType.charAt(0).toUpperCase() + entryType.slice(1);
    const publishedEntry = await db[modelName]?.findById(entryId).select('_id').lean();
    if (!publishedEntry) {
      res.status(404).json({ success: false, message: 'Published entry was not found.' });
      return;
    }
    const submission = await db.AnonymousContribution.findById(req.params.id);
    if (!submission || submission.entryType !== entryType || submission.status !== 'accepted') {
      res.status(409).json({ success: false, message: 'Accepted submission does not match the published entry.' });
      return;
    }
    submission.moderation = {
      ...(submission.moderation?.toObject?.() || submission.moderation || {}),
      publishedEntryType: entryType,
      publishedEntryId: entryId,
    };
    submission.updatedAt = new Date();
    await submission.save();
    res.json({ success: true, submission: publicStatus(submission) });
  });

  router.get('/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireModerator(req, res)) return;
    const submission = await db.AnonymousContribution.findById(req.params.id)
      .select('-submitterHash -receiptHash -contentHash')
      .lean();
    if (!submission) {
      res.status(404).json({ success: false, message: 'Submission not found.' });
      return;
    }
    res.json({
      success: true,
      submission,
      adoptionUrl: anonymousAdoptionUrl(submission.entryType as AnonymousEntryType, String(submission._id)),
    });
  });

  router.patch('/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireModerator(req, res)) return;
    const nextStatus = String(req.body?.status || '').trim();
    if (!['in_review', 'accepted', 'rejected'].includes(nextStatus)) {
      res.status(400).json({ success: false, message: 'Choose in_review, accepted, or rejected.' });
      return;
    }
    const reason = String(req.body?.reason || '').trim();
    if ((nextStatus === 'accepted' || nextStatus === 'rejected') && reason.length < 10) {
      res.status(400).json({ success: false, message: 'A review reason of at least 10 characters is required.' });
      return;
    }
    const submission = await db.AnonymousContribution.findById(req.params.id);
    if (!submission) {
      res.status(404).json({ success: false, message: 'Submission not found.' });
      return;
    }
    submission.status = nextStatus;
    submission.moderation = {
      ...(submission.moderation?.toObject?.() || submission.moderation || {}),
      reviewerUserId: req.user?._id || req.user?.id,
      reviewerUsername: String(req.user?.username || ''),
      reason,
      reviewedAt: new Date(),
    };
    submission.updatedAt = new Date();
    await submission.save();
    res.json({
      success: true,
      submission: publicStatus(submission),
      adoptionUrl: nextStatus === 'accepted'
        ? anonymousAdoptionUrl(submission.entryType as AnonymousEntryType, String(submission._id))
        : null,
    });
  });
};
