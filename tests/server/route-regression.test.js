'use strict';

const fs = require('fs');
const path = require('path');

function source(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Route regression coverage for legacy + React shell', function () {
  it('keeps required legacy page endpoints wired', function () {
    const legacyRoutes = source('middlewares/routes.ts');
    const legacyRootController = source('controllers/index.js');

    expect(legacyRootController).toContain("router.get('/', async function (req, res)"); // /
    expect(legacyRoutes).toContain("app.get('/home/'"); // /home/
    expect(legacyRoutes).toContain("app.get('/login/'"); // /login/
  });

  it('keeps required React shell endpoints wired', function () {
    const appController = source('controllers/app.js');

    expect(appController).toContain("router.get('/', function (req, res)"); // /app
    expect(appController).toContain("router.get('/*', function (req, res)"); // /app/*
  });

  it('keeps required API endpoint mounted', function () {
    const apiIndex = source('controllers/api/index.js');

    expect(apiIndex).toContain("router.use('/home', homeRouter)"); // /api/home
  });
});
