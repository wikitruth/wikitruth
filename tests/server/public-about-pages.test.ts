import express from 'express';
import request from 'supertest';

const findPage = jest.fn();

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      Page: {
        findOne: (...args: unknown[]) => findPage(...args),
      },
    },
  },
}));

const registerPageRoutes = require('../../server/src/controllers/api/pages');

function queryResult(value: Record<string, unknown> | null) {
  return {
    select: () => ({
      lean: async () => value,
    }),
  };
}

function createApp() {
  const app = express();
  const router = express.Router();
  registerPageRoutes(router);
  app.use('/api/pages', router);
  return app;
}

describe('public About page hierarchy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a child page from the About hierarchy', async () => {
    findPage
      .mockReturnValueOnce(queryResult({
        _id: '5627de73954a2be1d40a4c56',
        title: 'About',
        friendlyUrl: 'about',
      }))
      .mockReturnValueOnce(queryResult({
        _id: '5627e6427a251f94d69c6812',
        title: 'What is Wikitruth?',
        content: '<p>About the project</p>',
        friendlyUrl: 'what-is-wikitruth',
        parentId: '5627de73954a2be1d40a4c56',
      }));

    const response = await request(createApp())
      .get('/api/pages/about/what-is-wikitruth')
      .expect(200);

    expect(response.body.page.title).toBe('What is Wikitruth?');
    expect(response.body.parent.title).toBe('About');
  });

  it('does not expose a profile page outside the About hierarchy', async () => {
    findPage
      .mockReturnValueOnce(queryResult({
        _id: '5627de73954a2be1d40a4c56',
        title: 'About',
        friendlyUrl: 'about',
      }))
      .mockReturnValueOnce(queryResult({
        _id: 'profile-page-1',
        title: 'Private profile notes',
        friendlyUrl: 'notes',
        parentId: 'another-root',
      }));

    await request(createApp()).get('/api/pages/about/notes').expect(404);
  });
});
