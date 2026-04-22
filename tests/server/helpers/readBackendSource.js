'use strict';

const fs = require('fs');
const path = require('path');

function resolveShimTarget(filePath, source) {
  const shimMatch = source.match(/module\.exports\s*=\s*require\((['"])(.+?)\1\)/);
  if (!shimMatch) {
    return null;
  }
  const importPath = shimMatch[2];
  if (!importPath.startsWith('.')) {
    return null;
  }
  const resolved = path.resolve(path.dirname(filePath), importPath);
  const withTs = resolved + '.ts';
  const withJs = resolved + '.js';
  if (fs.existsSync(resolved)) {
    return resolved;
  }
  if (fs.existsSync(withTs)) {
    return withTs;
  }
  if (fs.existsSync(withJs)) {
    return withJs;
  }
  return null;
}

function readBackendSource(relativePath) {
  const visited = new Set();
  let currentPath = path.join(process.cwd(), relativePath);
  // Bounded loop to satisfy lint while still supporting arbitrary shim chains.
  const MAX_HOPS = 32;
  for (let hop = 0; hop < MAX_HOPS; hop += 1) {
    if (visited.has(currentPath)) {
      throw new Error(`Shim resolution cycle detected while reading ${relativePath}`);
    }
    visited.add(currentPath);

    const source = fs.readFileSync(currentPath, 'utf8');
    const nextPath = resolveShimTarget(currentPath, source);
    if (!nextPath) {
      return source;
    }

    currentPath = nextPath;
  }
  throw new Error(`Shim resolution exceeded ${MAX_HOPS} hops while reading ${relativePath}`);
}

module.exports = {
  readBackendSource,
};

