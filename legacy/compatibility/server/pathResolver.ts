'use strict';

import path from 'path';

const LEGACY_ROOT = path.join(process.cwd(), 'legacy');

function resolveCompatibilityPath(relativePath: string): string {
  const normalized = String(relativePath || '').replace(/^\/+/, '');
  return path.join(LEGACY_ROOT, normalized);
}

export { LEGACY_ROOT, resolveCompatibilityPath };
