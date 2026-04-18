'use strict';

const fs = require('fs');
const path = require('path');
const serveStatic = require('serve-static');
const { resolveCompatibilityPath } = require('./pathResolver');

function resolveCompatibilityConfig(options) {
  const config = options || {};
  const enabled = config.enabled !== false;
  const staticRoot = path.resolve(config.staticRoot || resolveCompatibilityPath('static'));
  const templatesRoot = path.resolve(config.templatesRoot || resolveCompatibilityPath('templates'));
  return {
    enabled,
    staticRoot,
    templatesRoot,
  };
}

function mountLegacyCompatibility(app, options) {
  const config = resolveCompatibilityConfig(options);
  if (!config.enabled) {
    console.log('[compat] Legacy compatibility disabled (modern-only mode).');
    return { ...config, mounted: false };
  }

  if (!fs.existsSync(config.staticRoot)) {
    console.warn('[compat] Static root not found: ' + config.staticRoot);
    return { ...config, mounted: false };
  }

  // Preserve legacy URL contracts (/css, /js, /layouts, /views, /components, etc.)
  app.use(serveStatic(config.staticRoot));
  console.log('[compat] Mounted static root: ' + config.staticRoot);
  return { ...config, mounted: true };
}

module.exports = {
  mountLegacyCompatibility,
};
