'use strict';

const fs = require('fs');
const path = require('path');
const { readBackendSource } = require('./helpers/readBackendSource');

function readProjectFile(relativePath) {
  return readBackendSource(relativePath);
}

describe('Server route contracts', function () {
  it('keeps legacy URL redirects mounted toward modern routes', function () {
    const routesSource = readProjectFile('server/src/middlewares/routes.ts');

    expect(routesSource).toContain('legacyRoutePatterns');
    expect(routesSource).toContain("'/home'");
    expect(routesSource).toContain("'/login'");
    expect(routesSource).toContain('/app');
  });

  it('keeps modern app and api home handlers wired', function () {
    const apiIndexSource = readProjectFile('server/src/controllers/api/index.ts');
    const appControllerSource = readProjectFile('server/src/controllers/app.ts');

    expect(apiIndexSource).toContain("router.use('/home', homeRouter)");
    expect(appControllerSource).toContain("router.get('/*'");
  });

  it('removes legacy shim controllers from modern server tree', function () {
    const deletedShimFiles = [
      'server/src/controllers/index.ts',
      'server/src/controllers/topics.ts',
      'server/src/controllers/arguments.ts',
      'server/src/controllers/async/entry.ts',
    ];

    deletedShimFiles.forEach((relativePath) => {
      expect(fs.existsSync(path.join(process.cwd(), relativePath))).toBe(false);
    });
  });

  it('enables helmet with an explicit policy configuration', function () {
    const appSource = readProjectFile('app.js');

    expect(appSource).toContain("helmet = require('helmet')");
    expect(appSource).toContain('app.use(helmet({');
    expect(appSource).toContain('contentSecurityPolicy: helmetConfig.contentSecurityPolicy ?');
  });

  it('reads session and csrf middleware policy from config', function () {
    const appSource = readProjectFile('app.js');

    expect(appSource).toContain('const sessionConfig = config.session || {}');
    expect(appSource).toContain('const csrfConfig = config.csrf || {}');
    expect(appSource).toContain('const csrfProtection = csrf({');
    expect(appSource).toContain('return csrfProtection(req, res, next);');
  });
});
