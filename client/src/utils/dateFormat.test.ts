import { formatDate, formatDateFull, formatRelativeTime } from './dateFormat';

describe('dateFormat helpers', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-13T12:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('formats absolute date with default pattern', () => {
    expect(formatDate('2026-04-12T00:00:00.000Z')).toBe('Apr 12, 2026');
  });

  it('formats relative date with suffix', () => {
    expect(formatRelativeTime('2026-04-13T11:00:00.000Z')).toContain('ago');
  });

  it('returns empty string for invalid dates', () => {
    expect(formatDate('invalid-date')).toBe('');
    expect(formatRelativeTime('invalid-date')).toBe('');
    expect(formatDateFull('invalid-date')).toBe('');
  });

  it('formats full date output with absolute and relative text', () => {
    const result = formatDateFull('2026-04-12T12:00:00.000Z');
    expect(result).toContain('Apr 12, 2026');
    expect(result).toContain('ago');
  });
});
