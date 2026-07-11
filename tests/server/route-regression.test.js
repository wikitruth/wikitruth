'use strict';

const fs = require('fs');
const path = require('path');
const { readBackendSource } = require('./helpers/readBackendSource');

function source(relativePath) {
  return readBackendSource(relativePath);
}

describe('Route regression coverage for legacy + React shell', function () {
  it('keeps required legacy page endpoints redirected into modern shell', function () {
    const legacyRoutes = source('server/src/middlewares/routes.ts');

    expect(legacyRoutes).toContain('mapLegacyPathToModern');
    expect(legacyRoutes).toContain('modernShellPatterns');
    expect(legacyRoutes).toContain("'/home'"); // /home
    expect(legacyRoutes).toContain("'/login'"); // /login
    expect(legacyRoutes).toContain('/app');
  });

  it('keeps required React shell endpoints wired', function () {
    const appController = source('server/src/controllers/app.ts');

    expect(appController).toContain("router.get('/', function (req: WikitruthRequest, res: WikitruthResponse)"); // /app
    expect(appController).toContain("router.get('/*', function (req: WikitruthRequest, res: WikitruthResponse)"); // /app/*
  });

  it('serves modern contribution and comment aliases through the React shell', function () {
    const routesSource = source('server/src/middlewares/routes.ts');
    const shellPatterns = routesSource.slice(
      routesSource.indexOf('const modernShellPatterns'),
      routesSource.indexOf('const legacyRoutePatterns'),
    );
    const legacyPatterns = routesSource.slice(
      routesSource.indexOf('const legacyRoutePatterns'),
      routesSource.indexOf('legacyRoutePatterns.forEach'),
    );

    expect(shellPatterns).toContain("'/contribute'");
    expect(shellPatterns).toContain("'/comments'");
    expect(shellPatterns).toContain("'/comments/*'");
    expect(legacyPatterns).not.toContain("'/comments'");
    expect(legacyPatterns).not.toContain("'/comments/*'");
  });

  it('keeps required API endpoint mounted', function () {
    const apiIndex = source('server/src/controllers/api/index.ts');

    expect(apiIndex).toContain("router.use('/home', homeRouter)"); // /api/home
  });

  it('removes legacy shims from modern controller paths', function () {
    [
      'server/src/controllers/index.ts',
      'server/src/controllers/search.ts',
      'server/src/controllers/async/clipboard.ts',
    ].forEach((relativePath) => {
      expect(fs.existsSync(path.join(process.cwd(), relativePath))).toBe(false);
    });
  });
});
