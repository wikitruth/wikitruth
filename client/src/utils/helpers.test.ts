import { classNames, truncate } from './helpers';

describe('helpers', () => {
  it('builds class names', () => {
    expect(classNames('a', null, false, 'b')).toBe('a b');
  });

  it('truncates long text', () => {
    expect(truncate('abcdefghij', 6)).toBe('abc...');
    expect(truncate('abc', 6)).toBe('abc');
  });
});
