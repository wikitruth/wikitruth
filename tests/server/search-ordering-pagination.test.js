'use strict';

const express = require('express');
const request = require('supertest');

const topicFind = jest.fn();
const argumentFind = jest.fn();
const questionFind = jest.fn();
const answerFind = jest.fn();
const artifactFind = jest.fn();
const issueFind = jest.fn();
const opinionFind = jest.fn();
const allFinds = [topicFind, argumentFind, questionFind, answerFind, artifactFind, issueFind, opinionFind];

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      Topic: { find: (...args) => topicFind(...args) },
      Argument: { find: (...args) => argumentFind(...args) },
      Question: { find: (...args) => questionFind(...args) },
      Answer: { find: (...args) => answerFind(...args) },
      Artifact: { find: (...args) => artifactFind(...args) },
      Issue: { find: (...args) => issueFind(...args) },
      Opinion: { find: (...args) => opinionFind(...args) },
    },
  },
}));

jest.mock('../../server/src/utils/flowUtils', () => ({
  setScreeningModel: (_req, model) => { model.screening = { status: 1 }; },
  setEditorsUsername: jest.fn(async () => undefined),
  setEntryParents: jest.fn(async () => undefined),
  appendEntryExtras: jest.fn(),
  setVerdictModel: jest.fn(),
  sortArguments: jest.fn(),
}));

function queryChain(records) {
  const chain = {
    sort: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    lean: jest.fn(async () => records),
  };
  return chain;
}

function createApp(user) {
  const app = express();
  app.use((req, _res, next) => {
    req.user = user;
    req.session = { preferences: {} };
    next();
  });
  const router = express.Router();
  require('../../server/src/controllers/api/search')(router);
  app.use('/api/search', router);
  return app;
}

describe('search ordering and cursor pagination contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    allFinds.forEach((find) => find.mockReturnValue(queryChain([])));
  });

  it('uses deterministic relevance, recency, and id ordering with a bounded cursor page', async () => {
    const chain = queryChain([
      { _id: 'b', title: 'Second match', editDate: '2026-07-10T00:00:00.000Z' },
      { _id: 'a', title: 'First match', editDate: '2026-07-09T00:00:00.000Z' },
    ]);
    topicFind.mockReturnValue(chain);

    const response = await request(createApp())
      .get('/api/search?q=public+budget&tab=topics&content=wiki&limit=2&cursor=2026-07-11T00:00:00.000Z')
      .expect(200);

    expect(response.body.topics).toHaveLength(2);
    expect(topicFind).toHaveBeenCalledWith(expect.objectContaining({
      'screening.status': 1,
      editDate: { $lt: new Date('2026-07-11T00:00:00.000Z') },
      $text: { $search: 'public budget' },
      $or: [{ private: false }],
    }), { score: { $meta: 'textScore' } });
    expect(chain.sort).toHaveBeenCalledWith({
      score: { $meta: 'textScore' },
      editDate: -1,
      _id: 1,
    });
    expect(chain.limit).toHaveBeenCalledWith(2);
    expect(argumentFind).not.toHaveBeenCalled();
  });

  it('keeps private journal results scoped to the signed-in owner', async () => {
    const chain = queryChain([]);
    opinionFind.mockReturnValue(chain);
    const user = { _id: '66f000000000000000000010' };

    await request(createApp(user))
      .get('/api/search?q=journal&tab=opinions&content=journal&limit=10')
      .expect(200);

    expect(opinionFind).toHaveBeenCalledWith(expect.objectContaining({
      $or: [{ private: true, createUserId: user._id }],
    }), { score: { $meta: 'textScore' } });
    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it('caps requested pages at one hundred records', async () => {
    const chain = queryChain([]);
    artifactFind.mockReturnValue(chain);

    await request(createApp())
      .get('/api/search?q=evidence&tab=artifacts&limit=10000')
      .expect(200);

    expect(chain.limit).toHaveBeenCalledWith(100);
  });
});
