import {
  countForView,
  normalizeContentVisibilityPreference,
  preferenceToApiView,
  screeningMatchesView,
} from './contentVisibility';

describe('content visibility', () => {
  const bucket = { accepted: 2, pending: 3, rejected: 5, archived: 7 };

  it('defaults unknown preferences to accepted-only', () => {
    expect(normalizeContentVisibilityPreference('unknown')).toBe('accepted');
    expect(preferenceToApiView('accepted')).toBe('wiki');
  });

  it('calculates counts from the effective visibility mode', () => {
    expect(countForView(bucket, 'wiki')).toBe(2);
    expect(countForView(bucket, 'active')).toBe(5);
    expect(countForView(bucket, 'all')).toBe(17);
    expect(countForView(bucket, 'archived')).toBe(7);
  });

  it('matches screening states for accepted, active, and all views', () => {
    expect(screeningMatchesView(1, 'wiki')).toBe(true);
    expect(screeningMatchesView(0, 'wiki')).toBe(false);
    expect(screeningMatchesView(0, 'active')).toBe(true);
    expect(screeningMatchesView(2, 'active')).toBe(false);
    expect(screeningMatchesView(2, 'all')).toBe(true);
  });
});
