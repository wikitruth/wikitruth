'use strict';

const { readBackendSource } = require('./helpers/readBackendSource');

function read(relativePath) {
  return readBackendSource(relativePath);
}

describe('Legacy-modern adapter contracts', function () {
  it('keeps legacy compatibility mounted under configured legacy prefix', function () {
    const appSource = read('server/src/app.ts');

    expect(appSource).toContain('legacyCompatibilityConfig');
    expect(appSource).toContain("mountPath: legacyCompatibilityConfig.mountPath || '/legacy'");
    expect(appSource).toContain('registerLegacyCompatibility(app');
  });

  it('keeps legacy bootstrap routes available for account/admin fallbacks', function () {
    const legacyBootstrap = read('legacy/compatibility/server/bootstrap.ts');

    expect(legacyBootstrap).toContain("legacyRouter.get('/:username/settings'");
    expect(legacyBootstrap).toContain("legacyRouter.get('/admin'");
    expect(legacyBootstrap).toContain("legacyRouter.route('/login')");
  });

  it('keeps /api/v1 adapter delegating to modern api mount', function () {
    const v1AdapterSource = read('server/src/controllers/api/v1.ts');

    expect(v1AdapterSource).toContain("import mountApiMod from './index'");
    expect(v1AdapterSource).toContain('mountApi(router)');
  });

  it('keeps modern route middleware handling legacy redirect bridge', function () {
    const routesSource = read('server/src/middlewares/routes.ts');

    expect(routesSource).toContain('legacyRoutePatterns');
    expect(routesSource).toContain('modernShellPatterns');
    expect(routesSource).toContain('normalizePath');
  });
});
