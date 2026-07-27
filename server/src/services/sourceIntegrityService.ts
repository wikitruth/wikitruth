import { createHash } from 'crypto';
import { promises as dns } from 'dns';
import net from 'net';

const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const REQUEST_TIMEOUT_MS = 12_000;

type AddressResolver = (hostname: string) => Promise<string[]>;
type FetchLike = typeof fetch;

export interface SourceIntegrityResult {
  status: 'healthy' | 'changed' | 'broken' | 'blocked';
  checkedAt: Date;
  nextCheckAt: Date;
  httpStatus: number | null;
  finalUrl: string;
  redirectCount: number;
  contentHash: string;
  expectedHash: string;
  hashMatches: boolean | null;
  contentType: string;
  contentLength: number | null;
  error: string;
}

function privateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const first = parts[0]!;
  const second = parts[1]!;
  return first === 10
    || first === 127
    || first === 0
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 192 && second === 0)
    || (first === 192 && second === 88)
    || (first === 198 && second >= 18 && second <= 19)
    || (first === 198 && second === 51)
    || (first === 203 && second === 0)
    || (first === 100 && second >= 64 && second <= 127)
    || first >= 224;
}

function privateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  return normalized === '::1' || normalized === '::' || normalized.startsWith('fc')
    || normalized.startsWith('fd') || normalized.startsWith('fe8')
    || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')
    || normalized.startsWith('ff') || normalized.startsWith('2001:db8');
}

export function isPublicIpAddress(address: string): boolean {
  const version = net.isIP(address);
  if (version === 4) return !privateIpv4(address);
  if (version === 6) return !privateIpv6(address);
  return false;
}

async function defaultResolver(hostname: string): Promise<string[]> {
  const results = await dns.lookup(hostname, { all: true, verbatim: true });
  return results.map((result) => result.address);
}

export async function assertSafeSourceUrl(rawUrl: string, resolver: AddressResolver = defaultResolver): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (_error) {
    throw new Error('Source URL is invalid');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only HTTP and HTTPS source URLs are supported');
  if (parsed.username || parsed.password) throw new Error('Source URLs cannot contain credentials');
  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('Local or internal source hosts are blocked');
  }
  const addresses = net.isIP(hostname) ? [hostname] : await resolver(hostname);
  if (!addresses.length || addresses.some((address) => !isPublicIpAddress(address))) {
    throw new Error('Source host resolves to a private or reserved address');
  }
  return parsed;
}

async function readBoundedBody(response: Response): Promise<Buffer> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_SOURCE_BYTES) {
    throw new Error(`Source exceeds the ${MAX_SOURCE_BYTES} byte verification limit`);
  }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    total += result.value.byteLength;
    if (total > MAX_SOURCE_BYTES) {
      await reader.cancel();
      throw new Error(`Source exceeds the ${MAX_SOURCE_BYTES} byte verification limit`);
    }
    chunks.push(Buffer.from(result.value));
  }
  return Buffer.concat(chunks);
}

function normalizedExpectedHash(value: unknown): string {
  return String(value || '').trim().toLowerCase().replace(/^sha256:/, '');
}

export async function inspectRemoteSource(options: {
  sourceUrl: string;
  expectedHash?: string;
  fetchImpl?: FetchLike;
  resolver?: AddressResolver;
}): Promise<SourceIntegrityResult> {
  const checkedAt = new Date();
  const fetchImpl = options.fetchImpl || fetch;
  let current: URL;
  try {
    current = await assertSafeSourceUrl(options.sourceUrl, options.resolver);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Source URL is blocked';
    return {
      status: 'blocked', checkedAt,
      nextCheckAt: new Date(checkedAt.getTime() + 7 * 24 * 60 * 60 * 1000),
      httpStatus: null, finalUrl: options.sourceUrl, redirectCount: 0, contentHash: '',
      expectedHash: options.expectedHash || '', hashMatches: null, contentType: '', contentLength: null,
      error: message.slice(0, 500),
    };
  }
  let redirectCount = 0;
  try {
    while (true) {
      const response = await fetchImpl(current, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: { 'user-agent': 'Wikitruth-Source-Integrity/1.0', accept: '*/*' },
      });
      if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
        if (redirectCount >= MAX_REDIRECTS) throw new Error('Source exceeded the redirect limit');
        current = await assertSafeSourceUrl(new URL(response.headers.get('location')!, current).toString(), options.resolver);
        redirectCount += 1;
        continue;
      }
      if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
      const body = await readBoundedBody(response);
      const contentHash = createHash('sha256').update(body).digest('hex');
      const expectedHash = normalizedExpectedHash(options.expectedHash);
      const hashMatches = expectedHash ? contentHash === expectedHash : null;
      const status = hashMatches === false ? 'changed' : 'healthy';
      return {
        status,
        checkedAt,
        nextCheckAt: new Date(checkedAt.getTime() + (status === 'healthy' ? 30 : 7) * 24 * 60 * 60 * 1000),
        httpStatus: response.status,
        finalUrl: current.toString(),
        redirectCount,
        contentHash: `sha256:${contentHash}`,
        expectedHash: expectedHash ? `sha256:${expectedHash}` : '',
        hashMatches,
        contentType: String(response.headers.get('content-type') || ''),
        contentLength: body.length,
        error: '',
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Source verification failed';
    const blocked = /blocked|private|reserved|credentials|HTTP and HTTPS/i.test(message);
    return {
      status: blocked ? 'blocked' : 'broken',
      checkedAt,
      nextCheckAt: new Date(checkedAt.getTime() + 7 * 24 * 60 * 60 * 1000),
      httpStatus: null,
      finalUrl: current.toString(),
      redirectCount,
      contentHash: '',
      expectedHash: options.expectedHash || '',
      hashMatches: null,
      contentType: '',
      contentLength: null,
      error: message.slice(0, 500),
    };
  }
}
