import { formatDate, formatNumber } from './formatting';

describe('formatting', () => {
  it('formats date and number', () => {
    expect(formatDate('2026-01-01')).toMatch(/2026/);
    expect(formatNumber(12345)).toBe('12,345');
  });
});
