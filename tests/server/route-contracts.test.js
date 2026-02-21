'use strict';

const fs = require('fs');
const path = require('path');

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Server route contracts', function () {
  it('keeps legacy entry routes mounted', function () {
    const routesSource = readProjectFile('middlewares/routes.ts');

    expect(routesSource).toContain("app.get('/home/'");
    expect(routesSource).toContain("app.get('/login/'");
  });

  it('keeps root and api home handlers wired', function () {
    const indexSource = readProjectFile('controllers/index.js');
    const apiIndexSource = readProjectFile('controllers/api/index.js');
    const appControllerSource = readProjectFile('controllers/app.js');

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
    expect(appSource).toContain('app.use(csrf({');
  });
});
