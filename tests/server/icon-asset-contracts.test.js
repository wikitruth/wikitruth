'use strict';

const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Modern icon asset contracts', function () {
  it('emits Bootstrap and Font Awesome through the client build', function () {
    const packageJson = JSON.parse(read('package.json'));
    const buildScript = read('scripts/build-icon-assets.mjs');

    expect(packageJson.scripts['build:client']).toContain('&& node scripts/build-icon-assets.mjs');
    expect(packageJson.scripts['build:client:dev']).toContain('&& node scripts/build-icon-assets.mjs');
    expect(packageJson.scripts['build:client:stats']).toContain('&& node scripts/build-icon-assets.mjs');
    expect(packageJson.scripts['dev:client']).toContain('node scripts/build-icon-assets.mjs &&');
    expect(packageJson.devDependencies.bootstrap).toBe('3.4.1');
    expect(packageJson.devDependencies['bootstrap-pincode-input']).toBe('1.7.0');
    expect(packageJson.devDependencies['font-awesome']).toBe('4.7.0');
    expect(buildScript).toContain("modernizeLegacyImports");
    expect(buildScript).toContain("'css/app.min.css'");
    expect(buildScript).toContain("'css/core.min.css'");
    expect(buildScript).toContain(
      "'bootstrap/dist/fonts/glyphicons-halflings-regular.woff2'",
    );
    expect(buildScript).toContain(
      "'font-awesome/fonts/fontawesome-webfont.woff2'",
    );
  });

  it('loads only versioned build assets from the modern app shell', function () {
    const shell = read('public/react-app.html');

    expect(shell).not.toContain('href="/css/app.min.css"');
    expect(shell).not.toContain('href="/layouts/core.min.css"');
    expect(shell).toContain('/dist/css/app.min.css?v=icon-assets-20260801-1');
    expect(shell).toContain('/dist/css/core.min.css?v=icon-assets-20260801-1');
    expect(shell).toContain('/dist/bundle.js?v=icon-assets-20260801-1');
  });

  it('pre-caches only icon assets emitted in an immutable release', function () {
    const serviceWorker = read('public/service-worker.js');

    expect(serviceWorker).toContain("wikitruth-app-shell-v4");
    expect(serviceWorker).toContain('/dist/css/app.min.css?v=icon-assets-20260801-1');
    expect(serviceWorker).toContain('/dist/css/core.min.css?v=icon-assets-20260801-1');
    expect(serviceWorker).toContain('/dist/fonts/glyphicons-halflings-regular.woff2');
    expect(serviceWorker).toContain('/dist/fonts/fontawesome-webfont.woff2?v=4.7.0');
    expect(serviceWorker).toContain('/img/favicons/manifest.json');
    expect(serviceWorker).not.toContain('/manifest.webmanifest');
    expect(serviceWorker).not.toContain("'/css/app.min.css'");
    expect(serviceWorker).not.toContain("'/layouts/core.min.css'");
  });
});
