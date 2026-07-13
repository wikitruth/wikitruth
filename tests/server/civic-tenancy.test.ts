const tenantFindOne = jest.fn();
const membershipFindOne = jest.fn();
const linkFind = jest.fn();
const topicFindById = jest.fn();
const artifactFindById = jest.fn();
const issueFindById = jest.fn();

function leanResult<T>(value: T) {
  return { lean: jest.fn(async () => value) };
}

function listResult<T>(value: T) {
  const chain = {
    sort: jest.fn(() => chain),
    lean: jest.fn(async () => value),
  };
  return chain;
}

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      CivicTenant: { findOne: (...args: unknown[]) => tenantFindOne(...args) },
      TenantMembership: { findOne: (...args: unknown[]) => membershipFindOne(...args) },
      CivicEntryLink: { find: (...args: unknown[]) => linkFind(...args) },
      Topic: { findById: (...args: unknown[]) => topicFindById(...args) },
      Artifact: { findById: (...args: unknown[]) => artifactFindById(...args) },
      Issue: { findById: (...args: unknown[]) => issueFindById(...args) },
    },
  },
}));

import {
  CivicTenantResolutionError,
  resolveCivicTenant,
} from '../../server/src/services/civicTenantService';
import { civicTenantRoles } from '../../server/src/services/civicAuthorizationService';
import {
  listCivicEntryLinks,
  validateLinkedEntry,
} from '../../server/src/services/civicEntryLinkService';

function request(options: Record<string, unknown> = {}) {
  const headers = (options.headers || {}) as Record<string, string>;
  return {
    params: options.params || {},
    hostname: options.hostname || 'localhost',
    get: (name: string) => headers[name.toLowerCase()] || headers[name] || '',
    user: options.user,
  } as never;
}

describe('civic tenant resolution and knowledge reuse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tenantFindOne.mockReturnValue(leanResult(null));
    membershipFindOne.mockReturnValue(leanResult(null));
    linkFind.mockReturnValue(listResult([]));
    topicFindById.mockReturnValue(leanResult(null));
    artifactFindById.mockReturnValue(leanResult(null));
    issueFindById.mockReturnValue(leanResult(null));
    delete process.env.CIVIC_FIXED_TENANT_ID;
    delete process.env.CIVIC_DEFAULT_TENANT_ID;
  });

  it('uses the built-in FixPH tenant as the local compatibility default', async () => {
    const tenant = await resolveCivicTenant(request());
    expect(tenant.tenantId).toBe('fixtheph');
    expect(tenant.localization.currency).toBe('PHP');
    expect(tenant.geography.levels.map((level) => level.key)).toContain('barangay');
  });

  it('rejects a path tenant that conflicts with the configured host', async () => {
    await expect(resolveCivicTenant(request({
      params: { tenantId: 'fix-example' },
      headers: { host: 'fixthephilippines.org' },
    }))).rejects.toEqual(expect.objectContaining<CivicTenantResolutionError>({ statusCode: 409 }));
  });

  it('resolves a persisted second-country tenant by explicit route', async () => {
    tenantFindOne
      .mockReturnValueOnce(leanResult(null))
      .mockReturnValueOnce(leanResult({
        tenantId: 'fix-example', status: 'active', countryCode: 'XZ', title: 'Fix Example', navTitle: 'FixXZ', slogan: '',
        domains: ['fix.example'], branding: {}, localization: { defaultLocale: 'en-XZ', supportedLocales: ['en-XZ'], timezone: 'UTC', currency: 'XZD' },
        geography: { levels: [{ key: 'district', label: 'District' }], addressFields: ['district'] }, sections: [], featureFlags: {},
        moderationPolicyVersion: '1', electionSystem: '', deploymentMode: 'shared',
      }));
    const tenant = await resolveCivicTenant(request({ params: { tenantId: 'fix-example' } }));
    expect(tenant).toEqual(expect.objectContaining({ tenantId: 'fix-example', countryCode: 'XZ' }));
    expect(tenant.extensionSchemas).toEqual({});
    expect(tenant.moderationPolicyVersion).toBe('1');
    expect(tenant.deploymentMode).toBe('shared');
  });

  it('preserves existing FixPH global roles until memberships are backfilled', async () => {
    const roles = await civicTenantRoles(request({
      user: { _id: '66f000000000000000000001', canPlayRoleOf: (role: string) => role === 'contributor' },
    }), 'fixtheph');
    expect([...roles]).toEqual(['contributor']);
  });

  it('maps civic relationships to the matching Wikitruth model', async () => {
    topicFindById.mockReturnValue(leanResult({
      _id: '66f000000000000000000101',
      title: 'Public procurement',
      friendlyUrl: 'public-procurement',
      private: false,
    }));
    const result = await validateLinkedEntry({ relationship: 'subject', objectId: '66f000000000000000000101' });
    expect(result).toEqual(expect.objectContaining({ objectName: 'topic', objectType: 1 }));
  });

  it('exposes legacy Artifact and Issue references as compatibility knowledge links', async () => {
    artifactFindById.mockReturnValue(leanResult({
      _id: '66f000000000000000000201', title: 'Signed contract', friendlyUrl: 'signed-contract', private: false,
    }));
    issueFindById.mockReturnValue(leanResult({
      _id: '66f000000000000000000202', title: 'Source disputed', friendlyUrl: 'source-disputed', private: false,
    }));
    const links = await listCivicEntryLinks({
      tenantId: 'fixtheph',
      record: {
        _id: '66f000000000000000000001',
        artifactIds: ['66f000000000000000000201'],
        issueIds: ['66f000000000000000000202'],
      },
    });
    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({ relationship: 'evidence', objectName: 'artifact', legacy: true }),
      expect.objectContaining({ relationship: 'review_issue', objectName: 'issue', legacy: true }),
    ]));
  });
});
