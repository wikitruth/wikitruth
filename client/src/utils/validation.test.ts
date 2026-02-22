import { isEmail, isRequired } from './validation';

describe('validation', () => {
  it('validates required values', () => {
    expect(isRequired('abc')).toBe(true);
    expect(isRequired('  ')).toBe(false);
  });

  it('validates emails', () => {
    expect(isEmail('user@example.com')).toBe(true);
    expect(isEmail('invalid-email')).toBe(false);
  });
});
