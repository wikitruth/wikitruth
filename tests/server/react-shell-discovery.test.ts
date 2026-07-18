import { resolveReactShellMetadata } from '../../server/src/services/reactShellMetadataService';
import { renderRobots, renderSitemap } from '../../server/src/services/sitemapService';

function queryResult(value: unknown) {
  const chain = {
    select: jest.fn(() => chain),
    sort: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    lean: jest.fn(async () => value),
  };
  return chain;
}

function request(pathname: string, models: Record<string, unknown> = {}, host = 'knowledge.example.test') {
  return {
    path: pathname,
    protocol: 'https',
    get: (name: string) => name.toLowerCase() === 'host' ? host : '',
    app: { db: { models } },
  } as never;
}

describe('server-rendered discovery contracts', () => {
  it('loads public entry metadata into the initial shell contract', async () => {
    const Topic = { findOne: jest.fn(() => queryResult({
      _id: '66f000000000000000000001', friendlyUrl: 'public-accountability',
      title: 'Public accountability', description: '<p>Evidence-backed civic knowledge.</p>',
    })) };
    const metadata = await resolveReactShellMetadata(
      request('/topics/entry/public-accountability/66f000000000000000000001', { Topic }),
      null,
    );
    expect(metadata).toEqual(expect.objectContaining({
      title: 'Public accountability', description: 'Evidence-backed civic knowledge.',
      canonicalPath: '/topics/entry/public-accountability/66f000000000000000000001', ogType: 'article',
    }));
    expect(Topic.findOne).toHaveBeenCalledWith(expect.objectContaining({ private: { $ne: true } }));
  });

  it('keeps private and missing records out of server metadata', async () => {
    const CivicRecord = { findOne: jest.fn(() => queryResult(null)) };
    const metadata = await resolveReactShellMetadata(
      request('/civic/records/66f000000000000000000002', { CivicRecord }),
      { title: 'Fix Example', navTitle: 'FixXZ', civicTenant: { tenantId: 'fix-example' } } as never,
    );
    expect(metadata).toBeNull();
    expect(CivicRecord.findOne).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'fix-example', private: { $ne: true } }));
  });

  it('generates host-aware root, entry, and tenant sitemap URLs without /app', async () => {
    const Topic = { find: jest.fn(() => queryResult([{ _id: '66f000000000000000000003', friendlyUrl: 'evidence', editDate: '2026-07-18T00:00:00Z' }])) };
    const CivicRecord = { find: jest.fn(() => queryResult([{ _id: '66f000000000000000000004' }])) };
    const application = {
      civicTenant: { tenantId: 'fix-example', sections: [{ slug: 'projects', enabled: true }] },
    } as never;
    const sitemap = await renderSitemap(request('/', { Topic, CivicRecord }, 'fix.example.test'), application);
    expect(sitemap).toContain('<loc>https://fix.example.test/</loc>');
    expect(sitemap).toContain('<loc>https://fix.example.test/topics/entry/evidence/66f000000000000000000003</loc>');
    expect(sitemap).toContain('<loc>https://fix.example.test/civic/projects</loc>');
    expect(sitemap).toContain('<loc>https://fix.example.test/civic/records/66f000000000000000000004</loc>');
    expect(sitemap).not.toContain('/app/');
    expect(renderRobots(request('/', {}, 'fix.example.test'))).toContain('Sitemap: https://fix.example.test/sitemap.xml');
  });
});
