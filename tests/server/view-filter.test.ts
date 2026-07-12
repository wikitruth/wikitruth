import { applyViewModeFilter } from '../../server/src/controllers/api/viewFilter';

describe('applyViewModeFilter', () => {
  it('keeps default screening status when no explicit view is set', () => {
    const query: Record<string, unknown> = {};
    const mode = applyViewModeFilter({ query: {} }, query, 1);
    expect(mode).toBe('default');
    expect(query['screening.status']).toBe(1);
  });

  it('sets wiki mode to approved content', () => {
    const query: Record<string, unknown> = {};
    const mode = applyViewModeFilter({ query: { view: 'wiki' } }, query, 0);
    expect(mode).toBe('wiki');
    expect(query['screening.status']).toBe(1);
  });

  it('sets original mode to pending content', () => {
    const query: Record<string, unknown> = {};
    const mode = applyViewModeFilter({ query: { view: 'original' } }, query, 1);
    expect(mode).toBe('original');
    expect(query['screening.status']).toBe(0);
  });

  it('removes screening filter in all mode', () => {
    const query: Record<string, unknown> = { 'screening.status': 1 };
    const mode = applyViewModeFilter({ query: { view: 'all' } }, query, 1);
    expect(mode).toBe('all');
    expect(query).not.toHaveProperty('screening.status');
  });

  it('sets archived mode to retained historical content', () => {
    const query: Record<string, unknown> = {};
    const mode = applyViewModeFilter({ query: { view: 'archived' } }, query, 1);
    expect(mode).toBe('archived');
    expect(query['screening.status']).toBe(3);
  });
});
