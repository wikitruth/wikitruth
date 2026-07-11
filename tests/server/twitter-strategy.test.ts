import TwitterStrategy from '../../server/src/auth/twitterStrategy';

describe('TwitterStrategy', () => {
  const strategy = new TwitterStrategy(
    { consumerKey: 'consumer-key', consumerSecret: 'consumer-secret' },
    jest.fn()
  );

  it('preserves structured Twitter API errors without XML parsing', () => {
    const error = strategy.parseErrorResponse(
      JSON.stringify({ errors: [{ message: 'Rate limit exceeded', code: 88 }] }),
      429
    ) as Error & { code?: number };

    expect(error).toMatchObject({
      name: 'TwitterAPIError',
      message: 'Rate limit exceeded',
      code: 88,
    });
  });

  it('treats non-JSON provider errors as bounded plain text', () => {
    const error = strategy.parseErrorResponse('<error>Temporarily unavailable</error>', 503);

    expect(error.message).toBe('Temporarily unavailable');
    expect(error.message).not.toContain('<error>');
  });
});
