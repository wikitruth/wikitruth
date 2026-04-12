'use strict';

const { readBackendSource } = require('./helpers/readBackendSource');

function read(relativePath) {
  return readBackendSource(relativePath);
}

describe('CSP config smoke coverage', function () {
  it('defines core CSP directives and reporting endpoint', function () {
    const appSource = read('server/src/app.ts');

    expect(appSource).toContain('contentSecurityPolicy');
    expect(appSource).toContain('scriptSrc');
    expect(appSource).toContain('styleSrc');
    expect(appSource).toContain('imgSrc');
    expect(appSource).toContain('connectSrc');
    expect(appSource).toContain('reportUri');
    expect(appSource).toContain('/api/monitoring/csp');
  });
});
