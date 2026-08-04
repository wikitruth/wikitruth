const requests = new Map<string, Record<string, unknown>>();
let sequence = 0;
let subject: Record<string, unknown> = {
  _id: '507f1f77bcf86cd799439011', username: 'ada', email: 'ada@example.test', roles: {}, isActive: 'yes',
};

function asDocument(value: Record<string, unknown>) {
  return Object.assign(value, {
    save: jest.fn(async () => {
      requests.set(String(value._id), value);
      return value;
    }),
  });
}

function oneQuery(value: Record<string, unknown> | null) {
  return {
    select: jest.fn(() => oneQuery(value)),
    sort: jest.fn(() => oneQuery(value)),
    limit: jest.fn(() => oneQuery(value)),
    lean: jest.fn(async () => value),
    exec: jest.fn(async () => value),
  };
}

const privacyModel = {
  create: jest.fn(async (value: Record<string, unknown>) => {
    const document = asDocument({ ...value, _id: `507f1f77bcf86cd7994390${++sequence}`.slice(0, 24) });
    requests.set(String(document._id), document);
    return document;
  }),
  findOne: jest.fn(() => oneQuery(null)),
  findById: jest.fn((id: string) => oneQuery(requests.get(id) || null)),
  findOneAndUpdate: jest.fn((query: Record<string, unknown>, update: Record<string, unknown>) => {
    const value = requests.get(String(query._id));
    if (!value || value.status !== query.status) return oneQuery(null);
    const expectedDownloadHash = query['download.tokenHash'];
    if (expectedDownloadHash && (value.download as { tokenHash?: unknown } | undefined)?.tokenHash !== expectedDownloadHash) return oneQuery(null);
    Object.assign(value, update.$set as Record<string, unknown>);
    const pushed = (update.$push as { timeline?: Record<string, unknown> } | undefined)?.timeline;
    if (pushed) value.timeline = [...(value.timeline as Record<string, unknown>[] || []), pushed];
    return oneQuery(value);
  }),
  find: jest.fn(() => ({
    sort: () => ({ limit: () => ({ lean: async () => Array.from(requests.values()) }) }),
  })),
};

const userModel = {
  findById: jest.fn(() => ({ select: () => ({ lean: async () => subject }) })),
  find: jest.fn(() => ({ select: () => ({ lean: async () => [subject] }) })),
};

jest.mock('../../server/src/app', () => ({
  db: { models: { PrivacyRequest: privacyModel, User: userModel } },
}));
jest.mock('../../server/src/services/entryEventsService', () => ({ logEntryEvent: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../server/src/services/notificationsService', () => ({ createNotification: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../server/src/services/privacyDataService', () => ({
  countPrivacyImpact: jest.fn().mockResolvedValue({ retainedContributions: 4, activeSessions: 1 }),
  buildPrivacyExport: jest.fn().mockResolvedValue({ format: 'Wikitruth privacy export', account: { username: 'ada' } }),
  anonymizeAccount: jest.fn().mockResolvedValue({ pseudonym: 'anonymous-99439011', revokedSessions: 1 }),
}));

import {
  consumePrivacyExport,
  createExportDownloadToken,
  createPrivacyRequest,
  executePrivacyRequest,
  previewAnonymization,
  reviewPrivacyRequest,
  setPrivacyLegalHold,
} from '../../server/src/services/privacyRequestService';

const actor = { actorUserId: '507f1f77bcf86cd799439099', actorUsername: 'operator' };

beforeEach(() => {
  requests.clear(); sequence = 0; jest.clearAllMocks();
  subject = { _id: '507f1f77bcf86cd799439011', username: 'ada', email: 'ada@example.test', roles: {}, isActive: 'yes' };
});

it('governs export approval, readiness, expiring authorization, and single download', async () => {
  const created = await createPrivacyRequest({ type: 'export', userId: String(subject._id), actorUsername: 'ada' });
  await reviewPrivacyRequest(created.id, { action: 'review', note: 'Identity checked', ...actor });
  await reviewPrivacyRequest(created.id, { action: 'approve', note: '', ...actor });
  const ready = await executePrivacyRequest(created.id, actor);
  expect(ready?.status).toBe('ready');

  const authorization = await createExportDownloadToken(created.id, String(subject._id));
  expect(authorization?.token).toBeTruthy();
  const result = await consumePrivacyExport(created.id, {
    userId: String(subject._id), actorUsername: 'ada', token: String(authorization?.token),
  });
  expect(result?.payload).toMatchObject({ format: 'Wikitruth privacy export' });
  expect(privacyModel.findOneAndUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'ready', 'download.tokenHash': expect.any(String) }),
    expect.objectContaining({ $set: expect.objectContaining({ status: 'processing' }) }),
    { new: true },
  );
  await expect(consumePrivacyExport(created.id, {
    userId: String(subject._id), actorUsername: 'ada', token: String(authorization?.token),
  })).rejects.toThrow(/invalid or expired/i);
});

it('blocks anonymization of an administrator even after approval', async () => {
  subject = { ...subject, roles: { admin: '507f1f77bcf86cd799439012' } };
  const created = await createPrivacyRequest({ type: 'anonymization', userId: String(subject._id), actorUsername: 'ada' });
  await reviewPrivacyRequest(created.id, { action: 'review', note: 'Review started', ...actor });
  const preview = await previewAnonymization(created.id, actor);
  expect(preview?.request.preview.blockers).toContain('Administrator identities must be unlinked before anonymization');
  await reviewPrivacyRequest(created.id, { action: 'approve', note: '', ...actor });
  await expect(executePrivacyRequest(created.id, {
    ...actor, previewToken: preview?.previewToken, confirmation: 'ANONYMIZE ada',
  })).rejects.toThrow(/administrator identities/i);
});

it('requires a legal hold to be cleared before review and approval', async () => {
  const created = await createPrivacyRequest({ type: 'anonymization', userId: String(subject._id), actorUsername: 'ada' });
  const held = await setPrivacyLegalHold(created.id, { active: true, reason: 'Active investigation', ...actor });
  expect(held?.status).toBe('blocked');
  await expect(reviewPrivacyRequest(created.id, { action: 'review', note: 'Checking', ...actor }))
    .rejects.toThrow(/clear the legal hold/i);
  const cleared = await setPrivacyLegalHold(created.id, { active: false, reason: 'Investigation complete', ...actor });
  expect(cleared?.status).toBe('in_review');
});
