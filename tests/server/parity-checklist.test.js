'use strict';

const { readBackendSource } = require('./helpers/readBackendSource');

function read(relativePath) {
  return readBackendSource(relativePath);
}

describe('Parity checklist guardrails', function () {
  it('keeps auth API and modern social provider surface wired', function () {
    const authApi = read('server/src/controllers/api/auth.ts');
    const socialButtons = read('client/src/components/Auth/SocialLoginButtons.tsx');
    const authApiClient = read('client/src/services/api/auth.ts');

    expect(authApi).toContain("router.get('/providers'");
    expect(authApi).toContain("router.post('/login'");
    expect(authApi).toContain("router.post('/signup'");
    expect(authApi).toContain("router.post('/logout'");
    expect(socialButtons).toContain('enabledProviders');
    expect(socialButtons).toContain('Social sign-in is currently unavailable.');
    expect(authApiClient).toContain('providers: () => request<AuthProvidersResponse>');
  });

  it('keeps journal parity routes and API handlers in place', function () {
    const routeConfig = read('client/src/routes/routeConfig.tsx');
    const profileShell = read('client/src/components/Members/ProfileShell.tsx');
    const membersApi = read('server/src/controllers/api/members.ts');

    expect(routeConfig).toContain("path: '/members/:username/journal'");
    expect(routeConfig).toContain("path: '/members/profile/journal'");
    expect(routeConfig).toContain("path: '/members/:username/diary'");
    expect(routeConfig).toContain("path: '/members/profile/diary'");
    expect(profileShell).toContain("activeTab === 'journal'");
    expect(membersApi).toContain("router.get('/:username/journal'");
    expect(membersApi).toContain("router.get('/:username/diary'");
  });

  it('keeps modern moderation entry actions on api-backed flows', function () {
    const entryActions = read('client/src/components/Entry/EntryActionsMenu.tsx');
    const moderationApi = read('server/src/controllers/api/moderation.ts');

    expect(entryActions).toContain("navigate(`/screening?");
    expect(entryActions).toContain("navigate(`/convert?");
    expect(entryActions).toContain('moderationApi.takeOwnership');
    expect(entryActions).toContain('moderationApi.deleteEntry');

    expect(moderationApi).toContain("router.put('/screening'");
    expect(moderationApi).toContain("router.put('/verdict'");
    expect(moderationApi).toContain("router.post('/take-ownership'");
    expect(moderationApi).toContain("router.post('/delete'");
  });

  it('keeps modern admin mutation coverage for parity-critical operations', function () {
    const adminApi = read('server/src/controllers/api/admin.ts');
    const adminClient = read('client/src/services/api/admin.ts');

    [
      "router.post('/users'",
      "router.put('/users/:id/password'",
      "router.put('/users/:id/role-admin'",
      "router.put('/users/:id/role-account'",
      "router.put('/accounts/:id/user'",
      "router.post('/accounts/:id/notes'",
      "router.post('/accounts/:id/status'",
      "router.put('/administrators/:id/permissions'",
      "router.put('/administrators/:id/groups'",
    ].forEach((contract) => expect(adminApi).toContain(contract));

    expect(adminClient).toContain('createUser: async');
    expect(adminClient).toContain('resetUserPassword: async');
    expect(adminClient).toContain('linkAccountUser: async');
    expect(adminClient).toContain('updateAdministratorPermissions: async');
  });

  it('keeps search ordering and sidebar context aligned with legacy behavior', function () {
    const searchApi = read('server/src/controllers/api/search.ts');
    const homeApi = read('server/src/controllers/api/home.ts');
    const sidebar = read('client/src/components/Layout/ContextSidebar.tsx');

    expect(searchApi).toContain("$text: { $search: keyword }");
    expect(searchApi).toContain("score: { $meta: 'textScore' }");
    expect(searchApi).toContain('flowUtils.sortArguments(argumentResults)');
    expect(homeApi).toContain('flowUtils.getDiaryCategories(req)');
    expect(homeApi).toContain('flowUtils.getUserGroups(req)');
    expect(sidebar).toContain("title: 'My Journal'");
    expect(sidebar).toContain("title: 'Groups'");
    expect(sidebar).toContain('topicContext.parentSiblings');
  });
});
