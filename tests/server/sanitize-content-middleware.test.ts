import express from 'express';
import request from 'supertest';
import { sanitizeContentMiddleware } from '../../server/src/middlewares/sanitizeContent';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(sanitizeContentMiddleware);
  app.post('/echo', (req, res) => {
    res.json({ body: req.body });
  });
  return app;
}

describe('sanitizeContentMiddleware', () => {
  it('sanitizes top-level rich content fields', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/echo')
      .send({
        content: '<p>Hello</p><script>alert("xss")</script>',
        references: '<a href="javascript:alert(1)">bad</a>',
      })
      .expect(200);

    expect(response.body.body.content).toBe('<p>Hello</p>');
    expect(response.body.body.references).not.toContain('javascript:');
  });

  it('sanitizes nested fields and array rows used in moderation and discussions', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/echo')
      .send({
        payload: {
          reason: '<img src=x onerror=alert(1)>Needs cleanup',
          timeline: [
            { message: '<script>alert(1)</script>flagged' },
            { description: '<p>safe</p><iframe src="https://bad.local"></iframe>' },
          ],
        },
      })
      .expect(200);

    expect(response.body.body.payload.reason).not.toContain('onerror=');
    expect(response.body.body.payload.timeline[0].message).not.toContain('<script>');
    expect(response.body.body.payload.timeline[1].description).toBe('<p>safe</p>');
  });

  it('leaves non-html and non-target fields unchanged', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/echo')
      .send({
        title: '<b>Title should remain as-is</b>',
        count: 3,
      })
      .expect(200);

    expect(response.body.body.title).toBe('<b>Title should remain as-is</b>');
    expect(response.body.body.count).toBe(3);
  });
});
