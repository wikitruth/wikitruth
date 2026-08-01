import { expect, test, type Page, type Route } from '@playwright/test';

const FIXED_NOW = new Date('2026-07-30T04:00:00.000Z');
let unexpectedApiCalls: string[] = [];

const topic = {
  _id: 'topic-1',
  objectName: 'topic',
  objectType: 1,
  title: 'Climate Policy',
  friendlyUrl: 'climate-policy',
  description: 'Evidence-based approaches to reducing emissions while protecting communities.',
  content: '<p>Climate policy combines public evidence, measurable outcomes, and transparent review.</p>',
  contentPreview: 'Evidence-based approaches to reducing emissions while protecting communities.',
  screening: { status: 1 },
  verdict: { status: 1 },
  editDate: '2026-07-28T04:00:00.000Z',
  userEdited: { id: 'user-1', name: 'researcher' },
  childrenCount: {
    topics: { accepted: 2 },
    arguments: { accepted: 1 },
    questions: { accepted: 1 },
    artifacts: { accepted: 1 },
    issues: { accepted: 0 },
    opinions: { accepted: 2 },
  },
};

const argument = {
  _id: 'argument-1',
  objectName: 'argument',
  objectType: 2,
  ownerId: 'topic-1',
  parentTopic: topic,
  title: 'Clean-energy standards reduce long-term emissions',
  friendlyUrl: 'clean-energy-standards',
  contentPreview: 'Comparative policy evidence shows sustained reductions under enforced standards.',
  screening: { status: 1 },
  verdict: { status: 1 },
  editDate: '2026-07-27T04:00:00.000Z',
  userEdited: { id: 'user-2', name: 'policy-reviewer' },
  childrenCount: { opinions: { accepted: 4 } },
};

const question = {
  _id: 'question-1',
  objectName: 'question',
  objectType: 3,
  ownerId: 'topic-1',
  parentTopic: topic,
  title: 'Which transition policies protect low-income households?',
  friendlyUrl: 'equitable-transition-policies',
  contentPreview: 'Compare rebates, public investment, and targeted transition assistance.',
  screening: { status: 1 },
  editDate: '2026-07-26T04:00:00.000Z',
  userEdited: { id: 'user-3', name: 'community-editor' },
  childrenCount: { answers: { accepted: 3 } },
};

const applicationContext = {
  success: true,
  application: null,
  applications: [],
  appCategories: [],
};

const homeData = {
  success: true,
  topics: [topic],
  arguments: [argument],
  questions: [question],
  answers: [],
  artifacts: [],
  issues: [],
  opinions: [],
  topicsMore: true,
  argumentsMore: true,
  questionsMore: true,
  appCategories: [
    {
      _id: 'culture-society',
      title: 'Culture & Society',
      contextTitle: 'Culture & Society',
      friendlyUrl: 'culture-society',
      subtopics: [
        { _id: 'activism', title: 'Activism', friendlyUrl: 'activism' },
        { _id: 'education', title: 'Education', friendlyUrl: 'education' },
        { _id: 'media', title: 'Media Literacy', friendlyUrl: 'media-literacy' },
      ],
      childrenCount: { topics: { accepted: 13 } },
    },
    {
      _id: 'health-medicine',
      title: 'Health & Medicine',
      contextTitle: 'Health & Medicine',
      friendlyUrl: 'health-medicine',
      subtopics: [
        { _id: 'public-health', title: 'Public Health', friendlyUrl: 'public-health' },
        { _id: 'nutrition', title: 'Nutrition', friendlyUrl: 'nutrition' },
      ],
      childrenCount: { topics: { accepted: 21 } },
    },
    {
      _id: 'science',
      title: 'Science',
      contextTitle: 'Science',
      friendlyUrl: 'science',
      subtopics: [{ _id: 'climate-policy', title: 'Climate Policy', friendlyUrl: 'climate-policy' }],
      childrenCount: { topics: { accepted: 8 } },
    },
  ],
};

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installStableRoutes(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    unexpectedApiCalls.push(new URL(route.request().url()).pathname);
    await fulfillJson(route, { success: false, message: 'Unexpected visual-fixture request' }, 500);
  });
  await page.route('**/api/application-context**', (route) => fulfillJson(route, applicationContext));
  await page.route('**/api/auth/me**', (route) => fulfillJson(route, { success: true, user: null, activeRole: 'reader' }));
  await page.route('**/api/auth/providers**', (route) => fulfillJson(route, {
    success: true,
    providers: { google: true, github: true, facebook: false, twitter: false, apple: true, microsoft: true },
  }));
  await page.route('**/api/auth/config**', (route) => fulfillJson(route, {
    success: true,
    providers: { google: true, github: true, facebook: false, twitter: false, apple: true, microsoft: true },
    fastSwitchAvailable: false,
    emailCode: {
      enabled: true,
      codeLength: 6,
      expiresInSeconds: 600,
      resendDelaySeconds: 60,
      canonicalOrigin: new URL(route.request().url()).origin,
      isCanonicalOrigin: true,
    },
    passkeys: {
      enabled: true,
      rpName: 'Wikitruth Local',
      canonicalOrigin: new URL(route.request().url()).origin,
      isCanonicalOrigin: true,
      passwordlessEnabled: true,
      adminStepUpRequired: false,
      stepUpMaxAgeSeconds: 900,
    },
  }));
  await page.route('**/api/auth/passkeys/config**', (route) => fulfillJson(route, {
    success: true,
    passkeys: {
      enabled: true,
      rpName: 'Wikitruth Local',
      canonicalOrigin: new URL(route.request().url()).origin,
      isCanonicalOrigin: true,
      passwordlessEnabled: true,
      adminStepUpRequired: false,
      stepUpMaxAgeSeconds: 900,
    },
  }));
  await page.route('**/api/auth/passkeys/authentication/options**', (route) => fulfillJson(
    route,
    { success: false, message: 'No discoverable credential in the visual fixture' },
    400,
  ));
  await page.route('**/api/notifications/summary**', (route) => fulfillJson(route, {
    success: true,
    unreadCount: 0,
  }));
  await page.route('**/api/home**', (route) => fulfillJson(route, homeData));
  await page.route('**/api/topics/entry/topic-1**', (route) => fulfillJson(route, {
    success: true,
    topic,
    entry: topic,
    parentTopic: { _id: 'science', title: 'Science', friendlyUrl: 'science' },
    topics: [
      { ...topic, _id: 'topic-2', title: 'Renewable Energy', friendlyUrl: 'renewable-energy' },
      { ...topic, _id: 'topic-3', title: 'Climate Adaptation', friendlyUrl: 'climate-adaptation' },
    ],
    arguments: [argument],
    questions: [question],
    artifacts: [],
    issues: [],
    opinions: [],
    keyTopics: [],
    keyArguments: [],
    topicLinks: [],
    topicSiblings: [],
    categories: [],
    tagLabels: [{ _id: 'evidence', title: 'evidence' }],
    mainTopic: false,
    hasValue: false,
  }));
  await page.route('**/api/reactions**', (route) => fulfillJson(route, {
    success: true,
    counts: { exposure: { expose: 42, bury: 3 }, vote: { upvote: 28, downvote: 2 }, value: { good: 0, bad: 0 } },
    myReactions: { exposure: null, vote: null, value: null },
  }));
  await page.route('**/api/translations/topic/topic-1**', (route) => fulfillJson(route, {
    success: true,
    currentRevision: { id: 'revision-1', number: 1 },
    translations: [],
  }));
  await page.route('**/api/epistemic/topic/topic-1/truth-summary**', (route) => fulfillJson(route, {
    success: true,
    summary: {
      entry: { id: 'topic-1', objectName: 'topic', objectType: 1, title: 'Climate Policy', revisionId: 'revision-1' },
      channels: [{
        channel: 'factual', status: 'supported', reasoning: 'The current evidence supports this summary.', framework: '',
        decisionMode: 'consensus', administratorOverride: false, overrideReason: '', policyVersion: '1.0',
        sensitivity: 'standard', eligibleVotes: 5, leadingVotes: 4, averageConfidence: 88,
        distinctAffiliations: 4, dissent: { totalVotes: 1, statuses: [], rationales: [], evidenceRefs: [] },
        decidedAt: '2026-07-20T04:00:00.000Z', revalidateAt: '2027-07-20T04:00:00.000Z', revalidationDue: false,
      }],
      evidenceMap: [],
      unresolvedIssues: [],
      generatedAt: '2026-07-30T04:00:00.000Z',
    },
  }));
}

async function expectStableScreenshot(page: Page, path: string, heading: RegExp, name: string): Promise<void> {
  await page.goto(path);
  await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
  await expect(page.locator('.wt-loading-spinner')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img').evaluateAll((images) => Promise.all(images.map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    });
  })));
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
}

test.beforeEach(async ({ page }) => {
  unexpectedApiCalls = [];
  await page.clock.setFixedTime(FIXED_NOW);
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await installStableRoutes(page);
});

test.afterEach(() => {
  expect(unexpectedApiCalls, 'Every API request in a visual baseline must use deterministic fixture data').toEqual([]);
});

test('home', async ({ page }) => {
  await expectStableScreenshot(page, '/app', /the wikitruth project/i, 'home');
});

test('explore', async ({ page }) => {
  await expectStableScreenshot(page, '/app/explore', /^explore/i, 'explore');
});

test('topic entry', async ({ page }) => {
  await expectStableScreenshot(page, '/app/topics/entry/climate-policy/topic-1', /^climate policy$/i, 'topic-entry');
});

test('sign in', async ({ page }) => {
  await expectStableScreenshot(page, '/app/login', /^sign in$/i, 'sign-in');
});

test('admin users', async ({ page }) => {
  await page.route('**/api/auth/me**', (route) => fulfillJson(route, {
    success: true,
    activeRole: 'admin',
    user: {
      _id: 'admin-user-1',
      id: 'admin-user-1',
      username: 'visual-admin',
      email: 'admin@example.test',
      roles: { admin: 'admin-record-1', screener: true, reviewer: true },
      onboarding: { contributor: { completed: true }, reviewer: { completed: true } },
    },
  }));
  await page.route('**/api/admin/users**', (route) => fulfillJson(route, {
    success: true,
    items: [
      { _id: 'user-1', username: 'ada', email: 'ada@example.test', roles: { reviewer: true }, isActive: 'yes' },
      { _id: 'user-2', username: 'grace', email: 'grace@example.test', roles: { screener: true }, isActive: 'yes' },
    ],
    total: 27,
    page: 1,
    limit: 25,
    pages: 2,
    query: '',
  }));

  await expectStableScreenshot(page, '/app/admin/users', /^users$/i, 'admin-users');
});
