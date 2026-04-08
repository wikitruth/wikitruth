'use strict';

const { readBackendSource } = require('./helpers/readBackendSource');

function readProjectFile(relativePath) {
  return readBackendSource(relativePath);
}

describe('Server route contracts', function () {
  it('keeps legacy entry routes mounted', function () {
    const routesSource = readProjectFile('server/src/middlewares/routes.ts');

    expect(routesSource).toContain("app.get('/home/'");
    expect(routesSource).toContain("app.get('/login/'");
  });

  it('keeps root and api home handlers wired', function () {
    const indexSource = readProjectFile('server/src/controllers/index.ts');
    const apiIndexSource = readProjectFile('server/src/controllers/api/index.ts');
    const appControllerSource = readProjectFile('server/src/controllers/app.ts');

    expect(indexSource).toContain("router.get('/', async function (req, res)");
    expect(apiIndexSource).toContain("router.use('/home', homeRouter)");
    expect(appControllerSource).toContain("router.get('/*'");
  });

  it('enables helmet with an explicit policy configuration', function () {
    const appSource = readProjectFile('app.js');

    expect(appSource).toContain("helmet = require('helmet')");
    expect(appSource).toContain('app.use(helmet({');
    expect(appSource).toContain('contentSecurityPolicy: helmetConfig.contentSecurityPolicy ? undefined : false');
  });

  it('reads session and csrf middleware policy from config', function () {
    const appSource = readProjectFile('app.js');

    expect(appSource).toContain('const sessionConfig = config.session || {}');
    expect(appSource).toContain('const csrfConfig = config.csrf || {}');
    expect(appSource).toContain('const csrfProtection = csrf({');
    expect(appSource).toContain('return csrfProtection(req, res, next);');
  });
});
