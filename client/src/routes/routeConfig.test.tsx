import { appRoutes } from './routeConfig';
import * as fs from 'fs';
import * as path from 'path';

describe('routeConfig', () => {
  it('contains key routes', () => {
    const paths = appRoutes.map((route) => route.path);
    expect(paths).toContain('/');
    expect(paths).toContain('/login');
    expect(paths).toContain('/topics');
    expect(paths).toContain('/questions/create');
    expect(paths).toContain('/answers/create');
    expect(paths).toContain('/members/:username/topics');
    expect(paths).toContain('/members/:username/following');
    expect(paths).toContain('/admin');
    expect(paths).toContain('*');
  });

  it('keeps parity-critical modern routes wired', () => {
    const paths = appRoutes.map((route) => route.path);
    expect(paths).toContain('/members/:username/journal');
    expect(paths).toContain('/members/profile/journal');
    expect(paths).toContain('/members/:username/diary');
    expect(paths).toContain('/members/profile/diary');
    expect(paths).toContain('/contact');
    expect(paths).toContain('/fast-switch');
    expect(paths).toContain('/members/:username/contributions');
    expect(paths).toContain('/members/profile/contributions');
    expect(paths).toContain('/account/settings');
    expect(paths).toContain('/search');
    expect(paths).toContain('/screening');
    expect(paths).toContain('/convert');
    expect(paths).toContain('/admin/verdicts');
    expect(paths).toContain('/admin/verdicts/:id');
    expect(paths).toContain('/comments');
    expect(paths).toContain('/comments/create');
    expect(paths).toContain('/comments/entry/:friendlyUrl/:id');
    expect(paths).toContain('/comment/:friendlyUrl/:id');
  });

  it('maps journal routes to the dedicated journal page', () => {
    const file = fs.readFileSync(path.resolve(__dirname, 'routeConfig.tsx'), 'utf8');
    expect(file).toContain("const ProfileJournal = lazy(() => import('../pages/Members/Profile/ProfileJournal'));");
    expect(file).not.toContain("const ProfileJournal = lazy(() => import('../pages/Members/Profile/ProfileTopics'));");
  });

  it('includes tab-driven entry subroutes so navigation does not 404', () => {
    const paths = appRoutes.map((route) => route.path);
    expect(paths).toContain('/topics/entry/:friendlyUrl/:id/discussion');
    expect(paths).toContain('/arguments/entry/:friendlyUrl/:id/discussion');
    expect(paths).toContain('/questions/entry/:friendlyUrl/:id/answers');
    expect(paths).toContain('/questions/entry/:friendlyUrl/:id/discussion');
    expect(paths).toContain('/issues/entry/:friendlyUrl/:id/discussion');
    expect(paths).toContain('/opinions/entry/:friendlyUrl/:id/discussion');
  });
});
