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
    ].forEach((contract) => expect(apiIndex).toContain(contract));
  });

  it('keeps /api/v1 compatibility routed through the same handlers', function () {
    const apiV1 = read('controllers/api/v1.ts');

    expect(apiV1).toContain("require('./index')(router)");
  });

  it('exposes auth API handlers for session flows', function () {
    const authApi = read('controllers/api/auth.ts');

    expect(authApi).toContain("router.get('/me'");
    expect(authApi).toContain("router.post('/login'");
    expect(authApi).toContain("router.post('/logout'");
  });

  it('exposes admin API handlers required by client admin services', function () {
    const adminApi = read('controllers/api/admin.ts');

    [
      "router.get('/'",
      "router.get('/users'",
      "router.get('/accounts'",
      "router.get('/administrators'",
      "router.get('/groups'",
      "router.get('/categories'",
      "router.get('/statuses'",
    ].forEach((contract) => expect(adminApi).toContain(contract));
  });

  it('exposes monitoring endpoint for client runtime error tracking', function () {
    const monitoringApi = read('controllers/api/monitoring.ts');

    expect(monitoringApi).toContain("router.post('/errors'");
    expect(monitoringApi).toContain("logger.error('client.runtime.error'");
  });
});
