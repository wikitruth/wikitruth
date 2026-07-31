import {
  buildSignInPath,
  getAuthFlowContent,
  isSafeInternalReturnUrl,
  parseAuthIntent,
  safeReturnUrl,
} from './authFlow';

describe('authFlow', () => {
  it('keeps only internal return URLs', () => {
    expect(safeReturnUrl('/notifications?view=unread')).toBe('/notifications?view=unread');
    expect(isSafeInternalReturnUrl('/topics/create')).toBe(true);
    expect(isSafeInternalReturnUrl('//evil.example/path')).toBe(false);
    expect(isSafeInternalReturnUrl('/\\evil.example/path')).toBe(false);
    expect(isSafeInternalReturnUrl('/safe\nunsafe')).toBe(false);
    expect(safeReturnUrl('https://evil.example/path')).toBe('/');
  });

  it('builds a contextual sign-in route without exposing an external destination', () => {
    expect(buildSignInPath('/issues/create?topic=entry-1', 'report')).toBe(
      '/login?returnUrl=%2Fissues%2Fcreate%3Ftopic%3Dentry-1&intent=report',
    );
    expect(buildSignInPath('https://evil.example/path', 'protected')).toBe(
      '/login?returnUrl=%2F&intent=protected',
    );
  });

  it('accepts only known intent codes and describes protected destinations', () => {
    expect(parseAuthIntent('reply')).toBe('reply');
    expect(parseAuthIntent('unknown')).toBeNull();
    expect(getAuthFlowContent('protected', '/notifications').title).toBe(
      'Sign in to view your notifications',
    );
    expect(getAuthFlowContent('contribute', '/topics/create').continuation).toMatch(/contribution form/i);
  });
});
