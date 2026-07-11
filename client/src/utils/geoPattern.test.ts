import { createGeoPatternDataUrl } from './geoPattern';

describe('createGeoPatternDataUrl', () => {
  it('creates a deterministic encoded SVG background', () => {
    const first = createGeoPatternDataUrl('Truth & Reality');
    const second = createGeoPatternDataUrl('Truth & Reality');

    expect(first).toBe(second);
    expect(first).toContain('data:image/svg+xml');
    expect(first).toContain('%3Csvg');
  });

  it('varies the background by seed', () => {
    expect(createGeoPatternDataUrl('Religion & Worldviews')).not.toBe(
      createGeoPatternDataUrl('Morality & Ethics')
    );
  });
});
