const mockEvents: Array<Record<string, unknown>> = [];

const mockEntryEvent = {
  findOne: jest.fn(() => ({
    sort: () => ({
      lean: async () => mockEvents
        .filter((event) => event.scope === 'privileged' && event.chainSequence)
        .sort((left, right) => Number(right.chainSequence) - Number(left.chainSequence))[0] || null,
    }),
  })),
  create: jest.fn(async (event: Record<string, unknown>) => {
    mockEvents.push({ _id: `event-${mockEvents.length + 1}`, ...event });
  }),
  countDocuments: jest.fn(async () => 0),
  find: jest.fn(() => ({
    sort: () => ({
      lean: async () => mockEvents
        .filter((event) => event.scope === 'privileged' && event.chainSequence)
        .sort((left, right) => Number(left.chainSequence) - Number(right.chainSequence)),
    }),
  })),
};

jest.mock('../../server/src/app', () => ({
  db: { models: { EntryEvent: mockEntryEvent } },
}));

import {
  logEntryEvent,
  verifyPrivilegedEventChain,
} from '../../server/src/services/entryEventsService';

describe('privileged entry-event integrity chain', () => {
  beforeEach(() => {
    mockEvents.length = 0;
    jest.clearAllMocks();
  });

  it('chains privileged events and verifies their stored content', async () => {
    await logEntryEvent({
      scope: 'privileged',
      eventType: 'admin.first',
      objectType: 1,
      objectId: '64b000000000000000000001',
      message: 'First event',
    });
    await logEntryEvent({
      scope: 'privileged',
      eventType: 'admin.second',
      objectType: 1,
      objectId: '64b000000000000000000002',
      message: 'Second event',
    });

    expect(mockEvents[0]).toEqual(expect.objectContaining({
      chainSequence: 1,
      previousHash: '',
      hashVersion: 1,
      eventHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
    expect(mockEvents[1]).toEqual(expect.objectContaining({
      chainSequence: 2,
      previousHash: mockEvents[0].eventHash,
    }));
    await expect(verifyPrivilegedEventChain()).resolves.toEqual(expect.objectContaining({
      valid: true,
      verifiedEvents: 2,
      headSequence: 2,
    }));
  });

  it('detects tampering without rewriting the stored event', async () => {
    await logEntryEvent({
      scope: 'privileged',
      eventType: 'admin.first',
      objectType: 1,
      objectId: '64b000000000000000000001',
      message: 'Original event',
    });
    mockEvents[0].message = 'Tampered event';

    await expect(verifyPrivilegedEventChain()).resolves.toEqual(expect.objectContaining({
      valid: false,
      brokenAtSequence: 1,
      reason: expect.stringMatching(/hash does not match/i),
    }));
  });
});

