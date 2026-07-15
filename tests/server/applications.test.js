'use strict';

require('ts-node/register/transpile-only');

describe('civic application links', function () {
  const originalOverrides = process.env.CIVIC_TENANT_HOME_URL_OVERRIDES;

  afterEach(function () {
    if (originalOverrides === undefined) delete process.env.CIVIC_TENANT_HOME_URL_OVERRIDES;
    else process.env.CIVIC_TENANT_HOME_URL_OVERRIDES = originalOverrides;
    jest.resetModules();
  });

  function application() {
    const { FIXPH_TENANT } = require('../../server/src/config/civicTenants');
    return require('../../server/src/models/applications').applicationFromCivicTenant(FIXPH_TENANT);
  }

  it('keeps the configured production domain by default', function () {
    delete process.env.CIVIC_TENANT_HOME_URL_OVERRIDES;
    expect(application().homeUrl).toBe('https://fixthephilippines.org');
    expect(application()).toEqual(expect.objectContaining({
      exploreTopicId: '57aa74e0b663fb1072c7766d',
      jumbotron: {
        title: "Let's Fix The Philippines",
        description: 'A system to promote transparency and accountability, help citizens identify, raise and fix issues in the Philippine society and government.',
      },
    }));
  });

  it('supports a same-origin local tenant home', function () {
    process.env.CIVIC_TENANT_HOME_URL_OVERRIDES = 'another=/civic,fixtheph=/civic';
    expect(application()).toEqual(expect.objectContaining({
      homeUrl: '/civic',
      aboutUrl: '/civic',
      exploreUrl: '/civic',
    }));
  });

  it('ignores unsafe or protocol-relative overrides', function () {
    process.env.CIVIC_TENANT_HOME_URL_OVERRIDES = 'fixtheph=javascript:alert(1)';
    expect(application().homeUrl).toBe('https://fixthephilippines.org');
    process.env.CIVIC_TENANT_HOME_URL_OVERRIDES = 'fixtheph=//example.test/civic';
    expect(application().homeUrl).toBe('https://fixthephilippines.org');
  });

  it('merges new site defaults into older persisted tenant records and strips private fields', function () {
    const { applicationFromCivicTenant } = require('../../server/src/models/applications');
    const result = applicationFromCivicTenant({
      _id: 'private-database-id',
      tenantId: 'fixtheph',
      title: 'Fix The Philippines',
      navTitle: 'FixPH',
      domains: ['fixthephilippines.org'],
      branding: {},
      sections: [],
      createUserId: 'private-user-id',
    });

    expect(result.exploreTopicId).toBe('57aa74e0b663fb1072c7766d');
    expect(result.civicTenant).not.toHaveProperty('_id');
    expect(result.civicTenant).not.toHaveProperty('createUserId');
    expect(result.civicTenant.site.homeTitle).toBe("Let's Fix The Philippines");
  });
});
