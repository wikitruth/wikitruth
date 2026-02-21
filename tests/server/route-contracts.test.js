'use strict';

const fs = require('fs');
const path = require('path');

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Server route contracts', function () {
  it('keeps legacy entry routes mounted', function () {
    const routesSource = readProjectFile('middlewares/routes.js');

    expect(routesSource).toContain("app.get('/home/'");
    expect(routesSource).toContain("app.get('/login/'");
  });

  it('keeps root and api home handlers wired', function () {
    const indexSource = readProjectFile('controllers/index.js');
    const apiIndexSource = readProjectFile('controllers/api/index.js');

    expect(indexSource).toContain("router.get('/', async function (req, res)");
    expect(apiIndexSource).toContain("router.use('/home', homeRouter)");
  });
});
