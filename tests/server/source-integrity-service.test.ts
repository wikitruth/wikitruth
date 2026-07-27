import { createHash } from 'crypto';
import {
  assertSafeSourceUrl,
  inspectRemoteSource,
  isPublicIpAddress,
} from '../../server/src/services/sourceIntegrityService';

describe('source integrity service', () => {
  it('rejects local, private, link-local, and reserved source addresses', async () => {
    expect(isPublicIpAddress('127.0.0.1')).toBe(false);
    expect(isPublicIpAddress('10.0.0.1')).toBe(false);
    expect(isPublicIpAddress('169.254.1.2')).toBe(false);
    expect(isPublicIpAddress('8.8.8.8')).toBe(true);
    await expect(assertSafeSourceUrl('http://localhost/source')).rejects.toThrow(/blocked/i);
    await expect(assertSafeSourceUrl('https://example.test/source', async () => ['192.168.1.4']))
      .rejects.toThrow(/private or reserved/i);
  });

  it('hashes a bounded public response without retaining its source body', async () => {
    const body = 'bounded evidence snapshot';
    const expectedHash = createHash('sha256').update(body).digest('hex');
    const result = await inspectRemoteSource({
      sourceUrl: 'https://evidence.example/record',
      expectedHash: `sha256:${expectedHash}`,
      resolver: async () => ['93.184.216.34'],
      fetchImpl: jest.fn(async () => new Response(body, {
        status: 200, headers: { 'content-type': 'text/plain', 'content-length': String(body.length) },
      })) as unknown as typeof fetch,
    });
    expect(result).toEqual(expect.objectContaining({
      status: 'healthy', hashMatches: true, contentHash: `sha256:${expectedHash}`, contentLength: body.length,
    }));
    expect(result).not.toHaveProperty('body');
  });

  it('blocks a redirect that resolves to a private network', async () => {
    const result = await inspectRemoteSource({
      sourceUrl: 'https://evidence.example/record',
      resolver: async (hostname) => hostname === 'internal.example' ? ['10.0.0.7'] : ['93.184.216.34'],
      fetchImpl: jest.fn(async () => new Response(null, {
        status: 302, headers: { location: 'http://internal.example/admin' },
      })) as unknown as typeof fetch,
    });
    expect(result).toEqual(expect.objectContaining({ status: 'blocked', hashMatches: null }));
  });
});
