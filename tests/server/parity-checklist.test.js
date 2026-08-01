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
    expect(socialButtons).toContain('if (providers.length === 0)');
    expect(socialButtons).toContain('return null;');
    expect(authApiClient).toContain('providers: () => request<AuthProvidersResponse>');
    expect(authApiClient).toContain('config: () => request<AuthRuntimeConfig>');
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

  it('keeps legacy create and edit metadata wired through modern forms and APIs', function () {
    const topicForm = read('client/src/pages/TopicCreatePage.tsx');
    const argumentForm = read('client/src/pages/ArgumentCreatePage.tsx');
    const artifactForm = read('client/src/pages/ArtifactCreatePage.tsx');
    const topicsApi = read('server/src/controllers/api/topics.ts');
    const argumentsApi = read('server/src/controllers/api/arguments.ts');
    const argumentWrites = read('server/src/controllers/api/argumentWrites.ts');
    const artifactsApi = read('server/src/controllers/api/artifacts.ts');
    const opinionsApi = read('server/src/controllers/api/opinions.ts');

    expect(topicForm).toContain('contextTitle');
    expect(topicForm).toContain('referenceDate');
    expect(topicForm).toContain('TOPIC_TAG_OPTIONS');
    expect(argumentForm).toContain('supportsParent');
    expect(argumentForm).toContain('FACT_TYPE_OPTIONS');
    expect(argumentForm).toContain('updateArgument(editId');
    expect(artifactForm).toContain('inlineFile');
    expect(topicsApi).toContain('hasEthicalValue');
    expect(argumentsApi).toContain('createArgument(req, res)');
    expect(argumentWrites).toContain('parseNumericTags(body.tags)');
    expect(artifactsApi).toContain('storeUploadedArtifactFile');
    expect(opinionsApi).toContain("parentType === 'opinion'");
    expect(opinionsApi).toContain('ownerTypes[parentType]');
  });

  it('keeps deterministic group parity fixtures and promise-based legacy routes wired', function () {
    const compatibility = read('legacy/compatibility/server/bootstrap.ts');
    const legacyGroups = read('legacy/server/controllers/groups.ts');
    const screenshotRunner = read('scripts/qa/migration-parity-screenshots.mjs');
    const fixture = read('scripts/qa/parity-group-fixture.mjs');

    expect(compatibility).toContain('locals.group = model.group');
    expect(legacyGroups).toContain('await flowUtils.countEntries(model, groupFilter)');
    expect(legacyGroups).toContain("loadEntries('topics'");
    expect(screenshotRunner).toContain("name: 'group-entry'");
    expect(screenshotRunner).toContain("name: 'group-posts'");
    expect(screenshotRunner).toContain("name: 'group-members'");
    expect(screenshotRunner).toContain('response.status() >= 400');
    expect(fixture).toContain('cleanupParityGroupFixture');
    expect(fixture).toContain('migration-parity-group-v1');
  });
});
