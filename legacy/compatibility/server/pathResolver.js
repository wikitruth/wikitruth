'use strict';

const path = require('path');

const LEGACY_ROOT = path.join(process.cwd(), 'legacy');

function resolveCompatibilityPath(relativePath) {
  const normalized = String(relativePath || '').replace(/^\/+/, '');
  return path.join(LEGACY_ROOT, normalized);
}

module.exports = {
  LEGACY_ROOT,
  resolveCompatibilityPath,
};
