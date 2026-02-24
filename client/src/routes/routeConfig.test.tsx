import { appRoutes } from './routeConfig';

describe('routeConfig', () => {
  it('contains key routes', () => {
    const paths = appRoutes.map((route) => route.path);
    expect(paths).toContain('/');
    expect(paths).toContain('/login');
    expect(paths).toContain('/topics');
    expect(paths).toContain('/questions/create');
    expect(paths).toContain('/answers/create');
    expect(paths).toContain('/admin');
    expect(paths).toContain('*');
  });
});
