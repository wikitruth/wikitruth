'use strict';

const path = require('path');

const COMPATIBILITY_ROOT = path.join(process.cwd(), 'legacy', 'compatibility');

function resolveCompatibilityPath(relativePath) {
  const normalized = String(relativePath || '').replace(/^\/+/, '');
  return path.join(COMPATIBILITY_ROOT, normalized);
}

module.exports = {
  COMPATIBILITY_ROOT,
  resolveCompatibilityPath,
};
