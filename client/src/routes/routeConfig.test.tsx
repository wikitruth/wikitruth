import { appRoutes } from './routeConfig';

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
