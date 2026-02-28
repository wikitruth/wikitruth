'use strict';

const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('API endpoint smoke coverage', function () {
  it('mounts all migration API routers', function () {
    const apiIndex = read('controllers/api/index.ts');

    [
      'router.use(mobileContracts.mobileApiContractMiddleware)',
      "router.use('/home', homeRouter)",
      "router.use('/topics', topicsRouter)",
      "router.use('/arguments', argumentsRouter)",
      "router.use('/questions', questionsRouter)",
      "router.use('/answers', answersRouter)",
      "router.use('/issues', issuesRouter)",
      "router.use('/opinions', opinionsRouter)",
      "router.use('/artifacts', artifactsRouter)",
      "router.use('/groups', groupsRouter)",
      "router.use('/members', membersRouter)",
      "router.use('/auth', authRouter)",
      "router.use('/admin', adminRouter)",
      "router.use('/monitoring', monitoringRouter)",
      "router.use('/realtime', realtimeRouter)",
    ].forEach((contract) => expect(apiIndex).toContain(contract));
  });

  it('keeps /api/v1 compatibility routed through the same handlers', function () {
    const apiV1 = read('controllers/api/v1.ts');

    expect(apiV1).toContain("const mountApi = require('./index')");
    expect(apiV1).toContain('mountApi(router)');
  });

  it('exposes auth API handlers for session flows', function () {
    const authApi = read('controllers/api/auth.ts');

    expect(authApi).toContain("router.get('/me'");
    expect(authApi).toContain("router.get('/providers'");
    expect(authApi).toContain("router.post('/signup'");
    expect(authApi).toContain("router.post('/login'");
    expect(authApi).toContain("router.post('/logout'");
    expect(authApi).toContain("router.post('/forgot-password'");
    expect(authApi).toContain("router.post('/reset-password'");
    expect(authApi).toContain("router.get('/verification-status'");
    expect(authApi).toContain("router.post('/verification-resend'");
    expect(authApi).toContain("router.post('/verification-confirm'");
    expect(authApi).toContain("router.post('/token'");
    expect(authApi).toContain("router.post('/token/refresh'");
    expect(authApi).toContain("router.post('/token/revoke'");
  });

  it('exposes admin API handlers required by client admin services', function () {
    const adminApi = read('controllers/api/admin.ts');

    [
      "router.get('/'",
      "router.get('/users'",
      "router.post('/users'",
      "router.put('/users/:id'",
      "router.delete('/users/:id'",
      "router.put('/users/:id/password'",
      "router.put('/users/:id/role-admin'",
      "router.delete('/users/:id/role-admin'",
      "router.put('/users/:id/role-account'",
      "router.delete('/users/:id/role-account'",
      "router.put('/users/:id/roles'",
      "router.get('/accounts'",
      "router.put('/accounts/:id/user'",
      "router.delete('/accounts/:id/user'",
      "router.post('/accounts/:id/notes'",
      "router.post('/accounts/:id/status'",
      "router.get('/administrators'",
      "router.put('/administrators/:id/permissions'",
      "router.put('/administrators/:id/groups'",
      "router.put('/administrators/:id/user'",
      "router.delete('/administrators/:id/user'",
      "router.get('/groups'",
      "router.post('/groups'",
      "router.put('/groups/:id'",
      "router.delete('/groups/:id'",
      "router.get('/categories'",
      "router.post('/categories'",
      "router.put('/categories/:id'",
      "router.delete('/categories/:id'",
      "router.get('/statuses'",
      "router.post('/statuses'",
      "router.put('/statuses/:id'",
      "router.delete('/statuses/:id'",
      "router.get('/db-backup'",
      "router.post('/db-backup'",
    ].forEach((contract) => expect(adminApi).toContain(contract));
  });

  it('exposes profile and custom-page member APIs required by modern client', function () {
    const membersApi = read('controllers/api/members.ts');

    expect(membersApi).toContain("router.get('/me'");
    expect(membersApi).toContain("router.put('/me/preferences'");
    expect(membersApi).toContain("router.get('/:username/diary'");
    expect(membersApi).toContain("router.get('/:username/topics'");
    expect(membersApi).toContain("router.get('/:username/following'");
    expect(membersApi).toContain("router.get('/:username/pages'");
    expect(membersApi).toContain("router.post('/:username/pages'");
    expect(membersApi).toContain("router.get('/:username/pages/:id'");
    expect(membersApi).toContain("router.put('/:username/pages/:id'");
  });

  it('exposes monitoring endpoint for client runtime error tracking', function () {
    const monitoringApi = read('controllers/api/monitoring.ts');

    expect(monitoringApi).toContain("router.post('/errors'");
    expect(monitoringApi).toContain("logger.error('client.runtime.error'");
  });

  it('exposes realtime SSE endpoint for React clients', function () {
    const realtimeApi = read('controllers/api/realtime.ts');

    expect(realtimeApi).toContain("router.get('/events'");
    expect(realtimeApi).toContain("res.setHeader('Content-Type', 'text/event-stream')");
  });

  it('exposes content mutation handlers required by modern create/edit forms', function () {
    const topicsApi = read('controllers/api/topics.ts');
    const argumentsApi = read('controllers/api/arguments.ts');
    const questionsApi = read('controllers/api/questions.ts');
    const answersApi = read('controllers/api/answers.ts');
    const issuesApi = read('controllers/api/issues.ts');
    const opinionsApi = read('controllers/api/opinions.ts');
    const artifactsApi = read('controllers/api/artifacts.ts');
    const groupsApi = read('controllers/api/groups.ts');

    expect(topicsApi).toContain("router.post('/',");
    expect(topicsApi).toContain('POST_topic_create');
    expect(argumentsApi).toContain("router.post('/',");
    expect(argumentsApi).toContain('POST_argument_create');
    expect(questionsApi).toContain("router.post('/',");
    expect(questionsApi).toContain("router.put('/entry/:id'");
    expect(answersApi).toContain("router.post('/',");
    expect(answersApi).toContain("router.put('/entry/:id'");
    expect(issuesApi).toContain("router.post('/',");
    expect(issuesApi).toContain("router.put('/entry/:id'");
    expect(opinionsApi).toContain("router.post('/',");
    expect(opinionsApi).toContain("router.put('/entry/:id'");
    expect(artifactsApi).toContain("router.post('/',");
    expect(artifactsApi).toContain("router.put('/entry/:id'");
    expect(groupsApi).toContain("router.post('/',");
    expect(groupsApi).toContain("router.put('/entry/:id'");
    expect(groupsApi).toContain("router.get('/entry/:id/posts'");
    expect(groupsApi).toContain("router.post('/entry/:id/members'");
    expect(groupsApi).toContain("router.delete('/entry/:id/members/:userId'");
  });

  it('keeps modern search parity buckets for core content types', function () {
    const searchApi = read('controllers/api/search.ts');

    expect(searchApi).toContain('answers:');
    expect(searchApi).toContain('artifacts:');
    expect(searchApi).toContain('issues:');
    expect(searchApi).toContain('opinions:');
  });
});
