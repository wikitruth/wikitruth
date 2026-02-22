import paths from './paths';

describe('paths', () => {
  it('contains core route paths', () => {
    expect(paths.home).toBe('/');
    expect(paths.topics).toBe('/topics');
  });
});
