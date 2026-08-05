'use strict';

const PILOT_ID = 'eeeeeeeeeeeeeeee00000901';
const ENTRY_ID = 'eeeeeeeeeeeeeeee00000902';
const FACILITATOR_ID = 'eeeeeeeeeeeeeeee00000903';
const SUPPORTER_ID = 'eeeeeeeeeeeeeeee00000904';
const CHALLENGER_ID = 'eeeeeeeeeeeeeeee00000905';

let pilotRows = [];
let participantRows = [];
let contributionRows = [];
let participantSequence = 10;
let contributionSequence = 30;

function cloneForLean(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map((row) => ({ ...row }));
  return { ...value };
}

function query(getValue) {
  const chain = {
    select: () => chain,
    sort: () => chain,
    lean: async () => cloneForLean(getValue()),
    then: (resolve, reject) => Promise.resolve(getValue()).then(resolve, reject),
  };
  return chain;
}

function withSave(row) {
  row.save = async () => row;
  return row;
}

function matches(row, conditions) {
  return Object.entries(conditions).every(([key, value]) => String(row[key]) === String(value));
}

const mockModels = {
  StructuredDebatePilot: {
    create: jest.fn(async (fields) => {
      if (pilotRows.some((row) => row.activeEntryKey && row.activeEntryKey === fields.activeEntryKey)) {
        const error = new Error('duplicate'); error.code = 11000; throw error;
      }
      const row = withSave({ _id: PILOT_ID, ...fields });
      pilotRows.push(row);
      return row;
    }),
    findById: jest.fn((id) => query(() => pilotRows.find((row) => String(row._id) === String(id)) || null)),
    findOne: jest.fn((conditions) => query(() => pilotRows.find((row) => matches(row, conditions)) || null)),
  },
  StructuredDebateParticipant: {
    create: jest.fn(async (fields) => {
      if (participantRows.some((row) => String(row.pilotId) === String(fields.pilotId) && String(row.userId) === String(fields.userId))) {
        const error = new Error('duplicate'); error.code = 11000; throw error;
      }
      participantSequence += 1;
      const row = withSave({ _id: `eeeeeeeeeeeeeeee00000${participantSequence}`, ...fields });
      participantRows.push(row);
      return row;
    }),
    findOne: jest.fn((conditions) => query(() => participantRows.find((row) => matches(row, conditions)) || null)),
    find: jest.fn((conditions) => query(() => participantRows.filter((row) => matches(row, conditions)))),
    countDocuments: jest.fn(async (conditions) => participantRows.filter((row) => matches(row, conditions)).length),
  },
  StructuredDebateContribution: {
    create: jest.fn(async (fields) => {
      if (contributionRows.some((row) => String(row.pilotId) === String(fields.pilotId)
        && String(row.participantId) === String(fields.participantId)
        && row.phaseKey === fields.phaseKey)) {
        const error = new Error('duplicate'); error.code = 11000; throw error;
      }
      contributionSequence += 1;
      const row = { _id: `eeeeeeeeeeeeeeee00000${contributionSequence}`, ...fields };
      contributionRows.push(row);
      return row;
    }),
    find: jest.fn((conditions) => query(() => contributionRows.filter((row) => matches(row, conditions)))),
    countDocuments: jest.fn(async (conditions) => contributionRows.filter((row) => matches(row, conditions)).length),
  },
};

const entryModel = {
  findById: jest.fn(() => query(() => ({
    _id: ENTRY_ID,
    title: 'Should this public claim be accepted?',
    friendlyUrl: 'public-claim',
    private: false,
  }))),
};

['Topic', 'Argument', 'Question', 'Answer', 'Issue', 'Opinion', 'Artifact']
  .forEach((name) => { mockModels[name] = entryModel; });

jest.mock('../../server/src/app', () => ({ db: { models: mockModels } }));

function user(id, username, roles = {}) {
  return { _id: id, id, username, email: `${username}@private.example`, roles };
}

const facilitator = user(FACILITATOR_ID, 'facilitator', { reviewer: true });
const supporter = user(SUPPORTER_ID, 'supporter');
const challenger = user(CHALLENGER_ID, 'challenger');

describe('opt-in structured-debate service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pilotRows = [];
    participantRows = [];
    contributionRows = [];
    participantSequence = 10;
    contributionSequence = 30;
  });

  async function createPilot() {
    const service = require('../../server/src/services/structuredDebateService');
    return service.createStructuredDebate({
      entryObjectName: 'topic',
      entryId: ENTRY_ID,
      proposition: 'Should this public claim be accepted after evidence review?',
      user: facilitator,
    });
  }

  async function join(service, actor, stance, overrides = {}) {
    return service.joinStructuredDebate({
      pilotId: PILOT_ID,
      stance,
      consentAccepted: true,
      publicAttributionAccepted: true,
      consentVersion: 'structured-debate-pilot-consent-v1',
      user: actor,
      ...overrides,
    });
  }

  it('requires explicit versioned consent and exposes a privacy-bounded public projection', async () => {
    const service = require('../../server/src/services/structuredDebateService');
    await createPilot();

    await expect(join(service, supporter, 'supports', { publicAttributionAccepted: false }))
      .rejects.toMatchObject({ status: 400, code: 'DEBATE_CONSENT_REQUIRED' });

    const debate = await join(service, supporter, 'supports');
    expect(debate.viewer).toEqual(expect.objectContaining({
      canContribute: true,
      participant: expect.objectContaining({ stance: 'supports', status: 'active' }),
    }));
    expect(debate.format).toEqual(expect.objectContaining({
      version: 'structured-debate-pilot-v1',
      verdictImpact: 'none',
      contributionLimitPerParticipantPerPhase: 1,
    }));
    expect(debate.reviewerSummary).toBeNull();
    expect(debate.verdictStatus).toBeNull();

    const serialized = JSON.stringify(debate);
    expect(serialized).not.toMatch(/@private\.example|facilitatorUserIds|createUserId|actorUserId|"userId"/);
    expect(serialized).toContain('publicUsername');
  });

  it('enforces stance turns, evidence, phase limits, withdrawal, and terminal history', async () => {
    const service = require('../../server/src/services/structuredDebateService');
    await createPilot();
    await join(service, supporter, 'supports');
    await join(service, challenger, 'challenges');

    await expect(service.submitStructuredDebateContribution({
      pilotId: PILOT_ID,
      contributionType: 'argument',
      content: 'This is a sufficiently detailed opening contribution without a source link.',
      evidenceLinks: [],
      user: supporter,
    })).rejects.toMatchObject({ code: 'DEBATE_EVIDENCE_REQUIRED' });

    await service.submitStructuredDebateContribution({
      pilotId: PILOT_ID,
      contributionType: 'argument',
      content: 'This is a sufficiently detailed opening contribution supported by public evidence.',
      evidenceLinks: [{ url: 'https://example.org/support', label: 'Supporting source' }],
      user: supporter,
    });
    await expect(service.submitStructuredDebateContribution({
      pilotId: PILOT_ID,
      contributionType: 'evidence',
      content: 'A second supporting contribution should wait for the challenging stance turn.',
      evidenceLinks: [{ url: 'https://example.org/second' }],
      user: supporter,
    })).rejects.toMatchObject({ code: 'DEBATE_WAIT_FOR_TURN' });

    await service.submitStructuredDebateContribution({
      pilotId: PILOT_ID,
      contributionType: 'response',
      content: 'This challenging response addresses the prior contribution with contrary evidence.',
      evidenceLinks: [{ url: 'https://example.org/challenge' }],
      user: challenger,
    });
    await expect(service.submitStructuredDebateContribution({
      pilotId: PILOT_ID,
      contributionType: 'clarification',
      content: 'The supporter cannot submit twice during the same structured debate phase.',
      evidenceLinks: [{ url: 'https://example.org/duplicate' }],
      user: supporter,
    })).rejects.toMatchObject({ code: 'DEBATE_CONTRIBUTION_LIMIT' });

    const withdrawn = await service.withdrawStructuredDebate({ pilotId: PILOT_ID, user: challenger });
    expect(withdrawn.participants.find((row) => row.publicUsername === 'challenger').status).toBe('withdrawn');
    expect(withdrawn.audit.map((row) => row.eventType)).toContain('participant_withdrew');

    const closed = await service.transitionStructuredDebate({ pilotId: PILOT_ID, action: 'close', user: facilitator });
    expect(closed.status).toBe('closed');
    expect(closed.contributions).toHaveLength(2);
    await expect(service.submitStructuredDebateContribution({
      pilotId: PILOT_ID,
      contributionType: 'closing',
      content: 'No contribution can be added after the facilitator closes the pilot.',
      evidenceLinks: [{ url: 'https://example.org/closed' }],
      user: supporter,
    })).rejects.toMatchObject({ code: 'DEBATE_NOT_OPEN' });
  });

  it('limits facilitator transitions and preserves ordinary entry discussion paths', async () => {
    const service = require('../../server/src/services/structuredDebateService');
    const created = await createPilot();
    expect(created.entry.discussionPath).toBe(`/topics/entry/public-claim/${ENTRY_ID}/discussion`);

    await expect(service.transitionStructuredDebate({ pilotId: PILOT_ID, action: 'pause', user: supporter }))
      .rejects.toMatchObject({ status: 403, code: 'DEBATE_FACILITATOR_REQUIRED' });

    const paused = await service.transitionStructuredDebate({ pilotId: PILOT_ID, action: 'pause', user: facilitator });
    expect(paused.status).toBe('paused');
    const resumed = await service.transitionStructuredDebate({ pilotId: PILOT_ID, action: 'resume', user: facilitator });
    expect(resumed.status).toBe('open');
    const advanced = await service.transitionStructuredDebate({ pilotId: PILOT_ID, action: 'advance', user: facilitator });
    expect(advanced.currentPhaseKey).toBe('response');
    expect(advanced.audit.map((row) => row.eventType)).toEqual(expect.arrayContaining([
      'pilot_created', 'pilot_paused', 'pilot_resumed', 'phase_advanced',
    ]));
  });
});
