import paths, { toModernAppSectionUrl } from './paths';

describe('paths', () => {
  it('contains core route paths', () => {
    expect(paths.home).toBe('/');
    expect(paths.topics).toBe('/topics');
  });

  it('converts legacy application topic links to modern entry routes', () => {
    expect(toModernAppSectionUrl('/topic/incidents-in-the-philippines')).toBe(
      '/topics/entry/incidents-in-the-philippines'
    );
    expect(toModernAppSectionUrl('/legacy/topic/dictionary')).toBe(
      '/topics/entry/dictionary'
    );
    expect(toModernAppSectionUrl('/contact')).toBe('/contact');
  });
});
