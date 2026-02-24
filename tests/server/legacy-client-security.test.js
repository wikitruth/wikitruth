'use strict';

const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('legacy client security contracts', function () {
  it('renders show-more content as text-only to avoid XSS interpretation', function () {
    const legacyAppJs = read('public/js/app.js');

    expect(legacyAppJs).toContain('contentContainer.text(String(content));');
    expect(legacyAppJs).not.toContain('contentContainer.html($("<div/>").html(content).text());');
  });
});
