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
  });

  it('supports a same-origin local tenant home', function () {
    process.env.CIVIC_TENANT_HOME_URL_OVERRIDES = 'another=/civic,fixtheph=/civic';
    expect(application().homeUrl).toBe('/civic');
  });

  it('ignores unsafe or protocol-relative overrides', function () {
    process.env.CIVIC_TENANT_HOME_URL_OVERRIDES = 'fixtheph=javascript:alert(1)';
    expect(application().homeUrl).toBe('https://fixthephilippines.org');
    process.env.CIVIC_TENANT_HOME_URL_OVERRIDES = 'fixtheph=//example.test/civic';
    expect(application().homeUrl).toBe('https://fixthephilippines.org');
  });
});
