import crypto from 'crypto';

import appModForDb from '../app';
import constants from '../models/constants';
import { logEntryEvent } from './entryEventsService';
import { createNotification } from './notificationsService';
import { anonymizeAccount, buildPrivacyExport, countPrivacyImpact } from './privacyDataService';

export type PrivacyRequestType = 'export' | 'anonymization';
export type PrivacyRequestStatus = 'submitted' | 'in_review' | 'approved' | 'ready' | 'processing' | 'completed' | 'rejected' | 'cancelled' | 'blocked' | 'failed';

type PrivacyDocument = Record<string, unknown> & {
  _id: unknown; reference: string; type: PrivacyRequestType; status: PrivacyRequestStatus;
  activeKey?: string | null;
  requesterUserId: unknown; subjectUserId: unknown; reason?: string;
  legalHold?: { active?: boolean; reason?: string; changedAt?: Date | null; changedByUserId?: unknown };
  review?: { reviewedAt?: Date | null; reviewedByUserId?: unknown; decisionNote?: string };
  approval?: { approvedAt?: Date | null; approvedByUserId?: unknown };
  preview?: { tokenHash?: string; expiresAt?: Date | null; generatedAt?: Date | null; counts?: Record<string, unknown>; blockers?: string[] };
  download?: { readyAt?: Date | null; readyExpiresAt?: Date | null; tokenHash?: string; tokenExpiresAt?: Date | null; downloadedAt?: Date | null };
  execution?: { startedAt?: Date | null; completedAt?: Date | null; executedByUserId?: unknown; pseudonym?: string; failureCode?: string };
  timeline?: Array<{ type: string; note: string; actorUserId: unknown; at: Date }>;
  editDate?: Date;
  save: () => Promise<unknown>;
};

type PrivacyQuery = {
  select: (value: string) => PrivacyQuery;
  sort: (value: Record<string, 1 | -1>) => PrivacyQuery;
  limit: (value: number) => PrivacyQuery;
  lean: () => Promise<Record<string, unknown>[]>;
  exec: () => Promise<PrivacyDocument | null>;
};

type PrivacyModels = {
  PrivacyRequest: {
    create: (value: Record<string, unknown>) => Promise<PrivacyDocument>;
    find: (query: Record<string, unknown>) => PrivacyQuery;
    findOne: (query: Record<string, unknown>) => PrivacyQuery;
    findById: (id: string) => PrivacyQuery;
    findOneAndUpdate: (query: Record<string, unknown>, update: Record<string, unknown>, options: Record<string, unknown>) => PrivacyQuery;
  };
  User: {
    find: (query: Record<string, unknown>) => { select: (value: string) => { lean: () => Promise<Record<string, unknown>[]> } };
    findById: (id: string) => { select: (value: string) => { lean: () => Promise<Record<string, unknown> | null> } };
  };
};

const db = (appModForDb as unknown as { db: { models: PrivacyModels } }).db.models;
const activeStatuses: PrivacyRequestStatus[] = ['submitted', 'in_review', 'approved', 'ready', 'processing', 'blocked', 'failed'];

function limited(value: unknown, max = 500): string {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function matchesHash(token: string, expected: string): boolean {
  if (!token || !expected) return false;
  const actual = Buffer.from(hashToken(token), 'hex');
  const stored = Buffer.from(expected, 'hex');
  return actual.length === stored.length && crypto.timingSafeEqual(actual, stored);
}

function event(document: PrivacyDocument, type: string, actorUserId: string, note = ''): void {
  document.timeline = [...(document.timeline || []), { type, note: limited(note, 240), actorUserId, at: new Date() }];
  document.editDate = new Date();
}

function identifier(value: unknown): string {
  return String(value || '');
}

async function audit(
  document: PrivacyDocument,
  eventType: string,
  actorUserId: string,
  actorUsername: string,
  payload: Record<string, unknown> = {},
) {
  await logEntryEvent({
    scope: 'privileged', eventType: `privacy.${eventType}`,
    objectType: constants.OBJECT_TYPES.user, objectName: 'privacy-request', objectId: identifier(document._id),
    actorUserId, actorUsername, message: `Privacy request ${eventType.replace(/_/g, ' ')}`,
    payload: { reference: document.reference, type: document.type, status: document.status, ...payload },
  });
}

async function notifySubject(document: PrivacyDocument, title: string, body: string): Promise<void> {
  await createNotification({
    userId: identifier(document.subjectUserId), type: 'privacy.request', title, body,
    link: '/account/privacy', payload: { requestId: identifier(document._id), reference: document.reference, status: document.status },
  });
}

async function loaded(requestId: string): Promise<PrivacyDocument | null> {
  return db.PrivacyRequest.findById(requestId).select('+preview.tokenHash +download.tokenHash').exec();
}

async function claimExecution(document: PrivacyDocument, actorUserId: string): Promise<PrivacyDocument> {
  const at = new Date();
  const claimed = await db.PrivacyRequest.findOneAndUpdate(
    { _id: document._id, status: 'approved' },
    {
      $set: {
        status: 'processing', editDate: at,
        execution: { startedAt: at, completedAt: null, executedByUserId: actorUserId, pseudonym: '', failureCode: '' },
      },
      $push: { timeline: { type: 'processing', note: '', actorUserId, at } },
    },
    { new: true },
  ).select('+preview.tokenHash +download.tokenHash').exec();
  if (!claimed) throw new Error('This request is already being processed or its status changed');
  return claimed;
}

export function serializePrivacyRequest(document: Record<string, unknown>) {
  const source = document as PrivacyDocument;
  const preview = source.preview || {};
  const download = source.download || {};
  return {
    id: identifier(source._id), reference: source.reference, type: source.type, status: source.status,
    requesterUserId: identifier(source.requesterUserId), subjectUserId: identifier(source.subjectUserId), reason: source.reason || '',
    legalHold: {
      active: Boolean(source.legalHold?.active), reason: source.legalHold?.reason || '',
      changedAt: source.legalHold?.changedAt || null,
    },
    review: source.review || {}, approval: source.approval || {},
    preview: { generatedAt: preview.generatedAt || null, expiresAt: preview.expiresAt || null, counts: preview.counts || {}, blockers: preview.blockers || [] },
    download: {
      readyAt: download.readyAt || null, readyExpiresAt: download.readyExpiresAt || null,
      tokenExpiresAt: download.tokenExpiresAt || null, downloadedAt: download.downloadedAt || null,
    },
    execution: source.execution || {}, timeline: source.timeline || [],
    createDate: source.createDate || null, editDate: source.editDate || null,
  };
}

export async function createPrivacyRequest(input: {
  type: PrivacyRequestType; userId: string; reason?: unknown; actorUsername?: string;
}) {
  if (!['export', 'anonymization'].includes(input.type)) throw new Error('Unsupported privacy request type');
  const existing = await db.PrivacyRequest.findOne({
    subjectUserId: input.userId, type: input.type, status: { $in: activeStatuses },
  }).select('_id reference status').exec();
  if (existing) throw new Error(`An active ${input.type} request already exists (${existing.reference})`);
  const now = new Date();
  const reference = `PR-${now.getUTCFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  let document: PrivacyDocument;
  try {
    document = await db.PrivacyRequest.create({
      reference, activeKey: `${input.userId}:${input.type}`, type: input.type, status: 'submitted', requesterUserId: input.userId, subjectUserId: input.userId,
      reason: limited(input.reason), timeline: [{ type: 'submitted', note: '', actorUserId: input.userId, at: now }],
      createDate: now, editDate: now,
    });
  } catch (error) {
    if (error && typeof error === 'object' && Number((error as { code?: unknown }).code) === 11000) {
      throw new Error(`An active ${input.type} request already exists`);
    }
    throw error;
  }
  await audit(document, 'submitted', input.userId, input.actorUsername || '');
  return serializePrivacyRequest(document);
}

export async function listPrivacyRequests(options: { subjectUserId?: string; limit?: number } = {}) {
  const query = options.subjectUserId ? { subjectUserId: options.subjectUserId } : {};
  const records = await db.PrivacyRequest.find(query).sort({ createDate: -1 }).limit(Math.min(200, Math.max(1, options.limit || 100))).lean();
  const subjectIds = Array.from(new Set(records.map((record) => identifier(record.subjectUserId)).filter(Boolean)));
  const users = subjectIds.length
    ? await db.User.find({ _id: { $in: subjectIds } }).select('_id username email isActive roles').lean() : [];
  const userMap = new Map(users.map((user) => [identifier(user._id), user]));
  return records.map((record) => ({ ...serializePrivacyRequest(record), subject: userMap.get(identifier(record.subjectUserId)) || null }));
}

export async function cancelPrivacyRequest(requestId: string, userId: string, actorUsername = '') {
  const document = await loaded(requestId);
  if (!document || identifier(document.subjectUserId) !== userId) return null;
  if (!['submitted', 'in_review'].includes(document.status)) throw new Error('This request can no longer be cancelled');
  document.status = 'cancelled'; document.activeKey = null; event(document, 'cancelled', userId); await document.save();
  await audit(document, 'cancelled', userId, actorUsername);
  return serializePrivacyRequest(document);
}

export async function reviewPrivacyRequest(
  requestId: string,
  input: { action: 'review' | 'approve' | 'reject'; note: string; actorUserId: string; actorUsername: string },
) {
  const document = await loaded(requestId);
  if (!document) return null;
  if (['review', 'reject'].includes(input.action) && limited(input.note).length < 3) {
    throw new Error('A review note of at least 3 characters is required');
  }
  if (input.action === 'review') {
    if (!['submitted', 'blocked', 'failed'].includes(document.status)) throw new Error('Only submitted, unblocked, or failed requests can enter review');
    if (document.legalHold?.active) throw new Error('Clear the legal hold before returning this request to review');
    document.status = 'in_review';
  } else if (input.action === 'approve') {
    if (document.status !== 'in_review') throw new Error('The request must be in review before approval');
    if (document.legalHold?.active) throw new Error('A request under legal hold cannot be approved');
    document.status = 'approved';
    document.approval = { approvedAt: new Date(), approvedByUserId: input.actorUserId };
  } else {
    if (!['submitted', 'in_review', 'approved', 'blocked'].includes(document.status)) throw new Error('This request can no longer be rejected');
    document.status = 'rejected';
    document.activeKey = null;
  }
  document.review = { reviewedAt: new Date(), reviewedByUserId: input.actorUserId, decisionNote: limited(input.note) };
  event(document, input.action, input.actorUserId, input.note); await document.save();
  await audit(document, input.action, input.actorUserId, input.actorUsername, { note: limited(input.note, 240) });
  await notifySubject(document, `Privacy request ${document.status.replace('_', ' ')}`, `Request ${document.reference} is now ${document.status.replace('_', ' ')}.`);
  return serializePrivacyRequest(document);
}

export async function setPrivacyLegalHold(
  requestId: string,
  input: { active: boolean; reason: string; actorUserId: string; actorUsername: string },
) {
  const document = await loaded(requestId);
  if (!document) return null;
  if (['completed', 'cancelled', 'rejected'].includes(document.status)) throw new Error('A final request cannot be placed on legal hold');
  if (limited(input.reason).length < 3) throw new Error(`A reason is required to ${input.active ? 'apply' : 'clear'} a legal hold`);
  document.legalHold = { active: input.active, reason: input.active ? limited(input.reason) : '', changedAt: new Date(), changedByUserId: input.actorUserId };
  if (input.active) document.status = 'blocked';
  else if (document.status === 'blocked') document.status = 'in_review';
  event(document, input.active ? 'legal_hold_applied' : 'legal_hold_cleared', input.actorUserId, input.reason);
  await document.save();
  await audit(document, input.active ? 'legal_hold_applied' : 'legal_hold_cleared', input.actorUserId, input.actorUsername, { reason: limited(input.reason, 240) });
  return serializePrivacyRequest(document);
}

async function previewBlockers(document: PrivacyDocument, subject: Record<string, unknown> | null): Promise<string[]> {
  const roles = subject?.roles && typeof subject.roles === 'object' ? subject.roles as Record<string, unknown> : {};
  return [
    ...(document.legalHold?.active ? ['Legal hold is active'] : []),
    ...(String(subject?.username || '').toLowerCase() === 'root' ? ['Root administrator identity is protected'] : []),
    ...(roles.admin ? ['Administrator identities must be unlinked before anonymization'] : []),
    ...(!subject ? ['Subject account no longer exists'] : []),
  ];
}

export async function previewAnonymization(
  requestId: string,
  input: { actorUserId: string; actorUsername: string },
) {
  const document = await loaded(requestId);
  if (!document) return null;
  if (document.type !== 'anonymization') throw new Error('Only anonymization requests have an execution preview');
  if (!['in_review', 'approved'].includes(document.status)) throw new Error('The request must be in review or approved before preview');
  const subject = await db.User.findById(identifier(document.subjectUserId)).select('_id username email roles').lean();
  const [counts, blockers] = await Promise.all([countPrivacyImpact(identifier(document.subjectUserId)), previewBlockers(document, subject)]);
  const token = crypto.randomBytes(32).toString('base64url');
  document.preview = { tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 10 * 60 * 1000), generatedAt: new Date(), counts, blockers };
  event(document, 'previewed', input.actorUserId); await document.save();
  await audit(document, 'previewed', input.actorUserId, input.actorUsername, { counts, blockerCount: blockers.length });
  return { request: serializePrivacyRequest(document), previewToken: token, confirmationPhrase: `ANONYMIZE ${String(subject?.username || '')}` };
}

export async function executePrivacyRequest(
  requestId: string,
  input: { actorUserId: string; actorUsername: string; previewToken?: string; confirmation?: string },
) {
  const document = await loaded(requestId);
  if (!document) return null;
  if (document.status !== 'approved') throw new Error('Only approved privacy requests can be executed');
  if (document.legalHold?.active) throw new Error('A request under legal hold cannot be executed');
  if (document.type === 'export') {
    const claimed = await claimExecution(document, input.actorUserId);
    claimed.status = 'ready';
    claimed.download = { readyAt: new Date(), readyExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), tokenHash: '', tokenExpiresAt: null, downloadedAt: null };
    claimed.execution = { ...claimed.execution, completedAt: new Date() };
    event(claimed, 'export_ready', input.actorUserId); await claimed.save();
    await audit(claimed, 'export_ready', input.actorUserId, input.actorUsername);
    await notifySubject(claimed, 'Your Wikitruth export is ready', `Request ${claimed.reference} is ready for an authenticated download for 30 days.`);
    return serializePrivacyRequest(claimed);
  }
  const subject = await db.User.findById(identifier(document.subjectUserId)).select('_id username roles').lean();
  const blockers = await previewBlockers(document, subject);
  if (blockers.length) throw new Error(blockers.join('. '));
  if (!document.preview?.tokenHash || !document.preview.expiresAt || new Date(document.preview.expiresAt).getTime() <= Date.now()
    || !matchesHash(input.previewToken || '', document.preview.tokenHash)) throw new Error('The anonymization preview has expired; generate a new preview');
  const confirmationPhrase = `ANONYMIZE ${String(subject?.username || '')}`;
  if (input.confirmation !== confirmationPhrase) throw new Error(`Type the exact confirmation phrase: ${confirmationPhrase}`);
  const claimed = await claimExecution(document, input.actorUserId);
  let result: Awaited<ReturnType<typeof anonymizeAccount>>;
  try {
    result = await anonymizeAccount(identifier(document.subjectUserId), input.actorUserId);
  } catch (error) {
    claimed.status = 'failed';
    claimed.execution = { ...claimed.execution, completedAt: new Date(), failureCode: error instanceof Error ? error.name : 'unknown' };
    event(claimed, 'failed', input.actorUserId); await claimed.save();
    await audit(claimed, 'anonymization_failed', input.actorUserId, input.actorUsername, { failureCode: claimed.execution?.failureCode });
    throw error;
  }
  claimed.status = 'completed';
  claimed.activeKey = null;
  claimed.execution = { ...claimed.execution, completedAt: new Date(), pseudonym: result.pseudonym, failureCode: '' };
  claimed.preview = { tokenHash: '', expiresAt: null, generatedAt: claimed.preview?.generatedAt, counts: claimed.preview?.counts, blockers: [] };
  event(claimed, 'completed', input.actorUserId); await claimed.save();
  await audit(claimed, 'anonymization_completed', input.actorUserId, input.actorUsername, result);
  return serializePrivacyRequest(claimed);
}

export async function createExportDownloadToken(requestId: string, userId: string) {
  const document = await loaded(requestId);
  if (!document || identifier(document.subjectUserId) !== userId) return null;
  if (document.type !== 'export' || document.status !== 'ready' || !document.download?.readyExpiresAt
    || new Date(document.download.readyExpiresAt).getTime() <= Date.now()) throw new Error('This export is not ready or has expired');
  const token = crypto.randomBytes(32).toString('base64url');
  document.download.tokenHash = hashToken(token); document.download.tokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  event(document, 'download_authorized', userId); await document.save();
  return { token, expiresAt: document.download.tokenExpiresAt };
}

export async function consumePrivacyExport(
  requestId: string,
  input: { userId: string; actorUsername: string; token: string },
) {
  const document = await loaded(requestId);
  if (!document || identifier(document.subjectUserId) !== input.userId) return null;
  if (document.type !== 'export' || document.status !== 'ready' || !document.download?.tokenHash
    || !document.download.tokenExpiresAt || new Date(document.download.tokenExpiresAt).getTime() <= Date.now()
    || !matchesHash(input.token, document.download.tokenHash)) throw new Error('The export authorization is invalid or expired');
  const claimed = await db.PrivacyRequest.findOneAndUpdate(
    { _id: document._id, status: 'ready', 'download.tokenHash': document.download.tokenHash },
    {
      $set: {
        status: 'processing', editDate: new Date(),
        download: { ...document.download, tokenHash: '', tokenExpiresAt: null },
      },
      $push: { timeline: { type: 'download_processing', note: '', actorUserId: input.userId, at: new Date() } },
    },
    { new: true },
  ).select('+download.tokenHash').exec();
  if (!claimed) throw new Error('The export authorization was already consumed');
  let payload: Awaited<ReturnType<typeof buildPrivacyExport>>;
  try {
    payload = await buildPrivacyExport(input.userId);
  } catch (error) {
    claimed.status = 'failed';
    claimed.execution = { ...claimed.execution, completedAt: new Date(), failureCode: error instanceof Error ? error.name : 'unknown' };
    event(claimed, 'export_generation_failed', input.userId); await claimed.save();
    await audit(claimed, 'export_generation_failed', input.userId, input.actorUsername, { failureCode: claimed.execution?.failureCode });
    throw error;
  }
  claimed.status = 'completed'; claimed.activeKey = null;
  claimed.download = { ...claimed.download, downloadedAt: new Date(), tokenHash: '', tokenExpiresAt: null };
  event(claimed, 'downloaded', input.userId); await claimed.save();
  await audit(claimed, 'export_downloaded', input.userId, input.actorUsername);
  return { filename: `wikitruth-${claimed.reference.toLowerCase()}.json`, payload };
}
