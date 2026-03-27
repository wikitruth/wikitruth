import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/home**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        topics: [],
        arguments: [],
        questions: [],
        issues: [],
        opinions: [],
        artifacts: [],
        answers: [],
      }),
    });
  });

  await page.route('**/api/auth/me**', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, user: null }),
    });
  });

  await page.route('**/api/auth/providers**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        providers: {
          google: true,
          github: true,
          facebook: true,
          twitter: true,
          apple: true,
          microsoft: true,
        },
      }),
    });
  });
});

test('loads about page', async ({ page }) => {
  await page.goto('/app/about');
  await expect(page.getByRole('heading', { name: /about wikitruth/i })).toBeVisible();
});

test('loads contact page', async ({ page }) => {
  await page.goto('/app/contact');
  await expect(page.getByRole('heading', { name: /contact/i })).toBeVisible();
});

test('login user journey redirects to home on success', async ({ page }) => {
  await page.route('**/api/auth/me**', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false }),
    });
  });

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, user: { _id: '1', username: 'demo' } }),
    });
  });

  await page.goto('/app/login');
  await page.getByLabel(/username or email/i).fill('demo');
  await page.getByLabel(/^password/i).fill('secret12');
  await page.getByRole('button', { name: /^sign in$/i }).click({ force: true });

  await expect(page).toHaveURL(/\/app\/?$/);
});

test('social auth buttons are wired to backend provider routes', async ({ page }) => {
  await page.route('**/api/auth/me**', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false }),
    });
  });

  await page.goto('/app/login');

  const socialButtons = page.locator('.wt-social-login');
  await expect(socialButtons.getByRole('link', { name: 'Google', exact: true })).toHaveAttribute('href', /\/login\/google/);
  await expect(socialButtons.getByRole('link', { name: 'GitHub', exact: true })).toHaveAttribute('href', /\/login\/github/);
  await expect(socialButtons.getByRole('link', { name: 'Facebook', exact: true })).toHaveAttribute('href', /\/login\/facebook/);
});

test('group membership flow toggles join and leave actions', async ({ page }) => {
  let isMember = false;

  await page.route('**/api/auth/me**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, user: { _id: 'u1', username: 'demo' } }),
    });
  });

  await page.route('**/api/groups/entry/1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        group: {
          _id: '1',
          title: 'Moderators',
          friendlyUrl: 'moderators',
          privacyType: 10,
          createUserId: 'owner-1',
          members: isMember ? [{ userId: 'u1', roleType: 10 }] : [],
        },
      }),
    });
  });

  await page.route('**/api/groups/entry/1/members**', async (route) => {
    if (route.request().method() === 'POST') {
      isMember = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/app/groups/moderators/1');
  await expect(page.getByRole('button', { name: /join group/i })).toBeVisible();

  await page.getByRole('button', { name: /join group/i }).click({ force: true });
  await page.goto('/app/groups/moderators/1');
  await expect(page.getByRole('button', { name: /leave group/i })).toBeVisible();
});

test('profile tabs render topics, following, and pages', async ({ page }) => {
  await page.route('**/api/auth/me**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, user: { _id: 'u1', username: 'demo' } }),
    });
  });

  await page.route('**/api/members/demo/topics**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        topics: [{ _id: 't1', title: 'Demo Topic', friendlyUrl: 'demo-topic' }],
      }),
    });
  });

  await page.route('**/api/members/demo/following', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        following: {
          people: [{ _id: 'u2', username: 'alice' }],
          topics: [{ _id: 't2', title: 'Linked Topic', friendlyUrl: 'linked-topic' }],
          groups: [{ _id: 'g1', title: 'Contributors', friendlyUrl: 'contributors' }],
        },
      }),
    });
  });

  await page.route('**/api/members/demo/pages/p1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        member: { _id: 'u1', username: 'demo' },
        page: { _id: 'p1', title: 'My Page', content: '<p>Hello page</p>' },
      }),
    });
  });

  await page.goto('/app/members/demo/topics');
  await expect(page.getByText(/demo topic/i)).toBeVisible();

  await page.goto('/app/members/demo/following');
  await expect(page.getByText(/alice/i)).toBeVisible();

  await page.goto('/app/members/demo/pages/p1');
  await expect(page.getByRole('heading', { name: /my page/i })).toBeVisible();
});

test('search page renders all parity result buckets', async ({ page }) => {
  await page.route('**/api/search**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        topics: [{ _id: 't1', title: 'Topic One', friendlyUrl: 'topic-one' }],
        arguments: [{ _id: 'a1', title: 'Argument One', friendlyUrl: 'argument-one' }],
        questions: [{ _id: 'q1', title: 'Question One', friendlyUrl: 'question-one' }],
        answers: [{ _id: 'an1', title: 'Answer One' }],
        issues: [{ _id: 'i1', title: 'Issue One', friendlyUrl: 'issue-one' }],
        opinions: [{ _id: 'o1', title: 'Opinion One', friendlyUrl: 'opinion-one' }],
        artifacts: [{ _id: 'ar1', title: 'Artifact One', friendlyUrl: 'artifact-one' }],
      }),
    });
  });

  await page.goto('/app/search?q=truth');
  await expect(page.getByText(/topics \(1\)/i)).toBeVisible();
  await expect(page.getByText(/arguments \(1\)/i)).toBeVisible();
  await expect(page.getByText(/questions \(1\)/i)).toBeVisible();
  await expect(page.getByText(/answers \(1\)/i)).toBeVisible();
  await expect(page.getByText(/issues \(1\)/i)).toBeVisible();
  await expect(page.getByText(/opinions \(1\)/i)).toBeVisible();
  await expect(page.getByText(/artifacts \(1\)/i)).toBeVisible();
});

test('visualize page loads metrics and topic connections', async ({ page }) => {
  await page.route('**/api/home', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        topics: [{ _id: 't1', title: 'Climate Policy', friendlyUrl: 'climate-policy' }],
        arguments: [{ _id: 'a1', title: 'Carbon pricing', friendlyUrl: 'carbon-pricing', ownerId: 't1' }],
        questions: [],
        issues: [],
        opinions: [],
        artifacts: [],
        answers: [],
      }),
    });
  });

  await page.goto('/app/visualize');
  await expect(page.getByText(/knowledge graph explorer/i)).toBeVisible();

  await page.getByRole('button', { name: /climate policy/i }).click({ force: true });
  await expect(page.getByText(/carbon pricing/i)).toBeVisible();
});
