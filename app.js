'use strict';

const existingApp = globalThis.__wikitruth_app;
if (existingApp) {
  module.exports = existingApp;
  return;
}

require('ts-node/register/transpile-only');
module.exports = require('./server/src/app');
