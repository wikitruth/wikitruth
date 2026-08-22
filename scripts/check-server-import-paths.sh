#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Checking server/src imports for legacy root-path regressions..."

node <<'NODE'
const fs = require('fs');
const path = require('path');

const sourceRoot = path.resolve('server/src');
const files = [];

function collect(directory) {
  fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(absolutePath);
    else if (entry.isFile() && entry.name.endsWith('.ts')) files.push(absolutePath);
  });
}

collect(sourceRoot);
const importPattern = /(?:from\s+|require\(\s*|import\(\s*)['"]([^'"]+)['"]/g;
const violations = [];

files.forEach((file) => {
  const source = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = importPattern.exec(source))) {
    const specifier = match[1];
    if (!specifier.startsWith('.')) continue;
    const target = path.resolve(path.dirname(file), specifier);
    if (target === sourceRoot || target.startsWith(`${sourceRoot}${path.sep}`)) continue;
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    violations.push(`${path.relative(process.cwd(), file)}:${line}: ${specifier}`);
  }
});

if (violations.length) {
  console.error('Found imports that escape server/src canonical boundaries:');
  violations.forEach((violation) => console.error(violation));
  process.exit(1);
}
NODE

echo "No legacy root-path imports detected in server/src."
