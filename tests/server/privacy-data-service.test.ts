const selectCalls = new Map<string, string[]>();
const updateCalls: Array<{ model: string; query: Record<string, unknown>; update: Record<string, unknown> }> = [];
const deleteCalls: Array<{ model: string; query: Record<string, unknown> }> = [];
let userUpdate: Record<string, unknown> | null = null;

const records: Record<string, Record<string, unknown>[]> = {
  Topic: [{ _id: { toHexString: () => 'topic-id' }, createUserId: 'user-id', title: 'Topic', filePath: '/private/server/path', nested: { tokenHash: 'secret', safe: 'kept' } }],
  Notification: [{ _id: 'notification-id', payload: { completionTokenHash: 'secret', label: 'Account update' } }],
};
const user = {
  _id: { toHexString: () => 'user-id' }, username: 'ada', email: 'ada@example.test',
  password: 'should-not-export', preferences: { theme: 'dark', resetPasswordToken: 'secret' },
  github: { accessToken: 'provider-secret' },
};

function oneQuery(model: string, value: Record<string, unknown> | null) {
  const query = {
    select: jest.fn((fields: string) => {
      selectCalls.set(model, [...(selectCalls.get(model) || []), fields]); return query;
    }),
    lean: jest.fn(async () => value),
  };
  return query;
}

function manyQuery(model: string, values: Record<string, unknown>[]) {
  const query = {
    select: jest.fn((fields: string) => {
      selectCalls.set(model, [...(selectCalls.get(model) || []), fields]); return query;
    }),
    sort: jest.fn(() => query), limit: jest.fn(() => query), lean: jest.fn(async () => values),
  };
  return query;
}

function dataModel(name: string) {
  return {
    countDocuments: jest.fn(async () => records[name]?.length || 0),
    find: jest.fn(() => manyQuery(name, records[name] || [])),
    findById: jest.fn(() => oneQuery(name, name === 'User' ? user : null)),
    findByIdAndUpdate: jest.fn((_id: string, update: Record<string, unknown>) => {
      userUpdate = update; return oneQuery(name, { _id: 'user-id', username: 'anonymous-d799439011', isActive: 'no' });
    }),
    updateMany: jest.fn(async (query: Record<string, unknown>, update: Record<string, unknown>) => {
      updateCalls.push({ model: name, query, update }); return { modifiedCount: 1 };
    }),
    deleteMany: jest.fn(async (query: Record<string, unknown>) => {
      deleteCalls.push({ model: name, query }); return { deletedCount: 1 };
    }),
  };
}

const modelNames = [
  'User', 'Topic', 'Argument', 'Question', 'Answer', 'Issue', 'Opinion', 'Artifact', 'Page', 'EntryRevision',
  'WebSession', 'PasskeyCredential', 'ApiClient', 'Notification', 'Subscription', 'Reaction', 'TenantMembership',
  'RecoveryCodeSet', 'AuthCeremony', 'AuthHandoff', 'TrustedClient', 'EmailAuthChallenge', 'LoginAttempt',
  'ReaderSignal', 'NotificationOutbox', 'EmailOutbox', 'ReputationSnapshot', 'Group',
];
const models = Object.fromEntries(modelNames.map((name) => [name, dataModel(name)]));

jest.mock('../../server/src/app', () => ({ db: { models } }));

import { anonymizeAccount, buildPrivacyExport } from '../../server/src/services/privacyDataService';

beforeEach(() => {
  selectCalls.clear(); updateCalls.length = 0; deleteCalls.length = 0; userUpdate = null;
});

it('exports an allowlisted account projection and recursively removes credential and server-path fields', async () => {
  const payload = await buildPrivacyExport('user-id');
  const account = payload.account as Record<string, unknown>;
  const topic = (payload.contributions.topic as Record<string, unknown>[])[0];
  const notification = (payload.activity.notifications as Record<string, unknown>[])[0];

  expect(selectCalls.get('User')?.[0]).not.toMatch(/github|twitter|facebook|google|apple|microsoft|tumblr/);
  expect(account).not.toHaveProperty('password');
  expect(account.preferences).toEqual({ theme: 'dark' });
  expect(topic).toMatchObject({ _id: 'topic-id', nested: { safe: 'kept' } });
  expect(topic).not.toHaveProperty('filePath');
  expect(topic.nested).not.toHaveProperty('tokenHash');
  expect(notification.payload).toEqual({ label: 'Account update' });
});

it('revokes credentials, removes private account activity, and unsets the password during anonymization', async () => {
  const result = await anonymizeAccount('507f1f77bcf86cd799439011', 'operator-id');

  expect(result.pseudonym).toBe('anonymous-d799439011');
  expect(updateCalls.map((call) => call.model)).toEqual(expect.arrayContaining(['WebSession', 'PasskeyCredential', 'ApiClient', 'Group']));
  expect(deleteCalls.map((call) => call.model)).toEqual(expect.arrayContaining([
    'RecoveryCodeSet', 'EmailAuthChallenge', 'LoginAttempt', 'TrustedClient', 'Notification', 'TenantMembership',
  ]));
  expect(userUpdate).toMatchObject({
    $set: {
      username: 'anonymous-d799439011', passwordLoginDisabled: true, isActive: 'no',
      mobileTokens: [], twitter: {}, github: {}, facebook: {}, google: {}, apple: {}, microsoft: {}, tumblr: {},
    },
    $unset: { password: 1 },
  });
});
