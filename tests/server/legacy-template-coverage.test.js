'use strict';

/*
 * Legacy template coverage smoke (L4-01 / L4-02).
 *
 * Statically scans every legacy controller under `legacy/server/controllers/**`
 * for `res.render(templates.X[.Y[.Z]], …)` references and asserts that each
 * referenced key resolves to a non-empty string in the legacy templates
 * registry (`legacy/server/models/templates.ts` -> `server/src/models/templates.ts`).
 *
 * This catches typo regressions and key-path drift that would otherwise produce
 * a runtime "undefined view" crash inside a mounted /legacy/* request.
 *
 * Out of scope: literal template paths (e.g. `res.render('dust/test/index', …)`)
 * and template paths assembled from variables. These are listed separately for
 * visibility but not asserted, since they intentionally bypass the registry.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const CONTROLLERS_ROOT = path.join(PROJECT_ROOT, 'legacy', 'server', 'controllers');

require('ts-node/register/transpile-only');

const templatesRegistry = require(path.join(PROJECT_ROOT, 'legacy', 'server', 'models', 'templates'));

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      yield full;
    }
  }
}

function collectReferences() {
  const referenced = new Set();
  const literals = new Set();
  const dynamic = new Set();
  const renderRe = /res\.render\(\s*([^,)]+)/g;

  for (const file of walk(CONTROLLERS_ROOT)) {
    const src = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = renderRe.exec(src)) !== null) {
      const expr = match[1].trim();
      if (expr.startsWith("'") || expr.startsWith('"')) {
        literals.add(expr.slice(1, -1));
      } else if (expr.startsWith('templates.')) {
        referenced.add(expr.slice('templates.'.length));
      } else {
        dynamic.add(expr);
      }
    }
  }
  return { referenced, literals, dynamic };
}

function resolveKey(registry, dottedPath) {
  const parts = dottedPath.split('.');
  let cursor = registry;
  for (const part of parts) {
    if (cursor === null || typeof cursor !== 'object' || !(part in cursor)) {
      return undefined;
    }
    cursor = cursor[part];
  }
  return cursor;
}

describe('Legacy template registry coverage (L4-01 / L4-02)', function () {
  const { referenced, literals, dynamic } = collectReferences();

  it('exposes a non-empty templates registry with the legacy schema', function () {
    expect(templatesRegistry).toBeTruthy();
    expect(typeof templatesRegistry).toBe('object');
    expect(typeof templatesRegistry.index).toBe('string');
    expect(typeof templatesRegistry.fastSwitch).toBe('string');
    expect(typeof templatesRegistry.wiki).toBe('object');
    expect(typeof templatesRegistry.members).toBe('object');
    expect(typeof templatesRegistry.groups).toBe('object');
    expect(typeof templatesRegistry.admin).toBe('object');
  });

  it('finds at least the expected number of templates.X references', function () {
    // Sanity floor — current controller set yields > 50 references.
    expect(referenced.size).toBeGreaterThan(40);
  });

  it('resolves every referenced templates key to a non-empty string', function () {
    const missing = [];
    const empty = [];
    for (const key of referenced) {
      const resolved = resolveKey(templatesRegistry, key);
      if (resolved === undefined) {
        missing.push(key);
      } else if (typeof resolved !== 'string' || resolved.length === 0) {
        empty.push({ key, resolved });
      }
    }
    expect({ missing, empty }).toEqual({ missing: [], empty: [] });
  });

  it('documents intentional non-registry render paths (informational)', function () {
    // Listed for visibility — these are not asserted because they intentionally
    // bypass the registry (test-only views, template-string composition).
    const literalsList = Array.from(literals).sort();
    const dynamicList = Array.from(dynamic).sort();
    expect(Array.isArray(literalsList)).toBe(true);
    expect(Array.isArray(dynamicList)).toBe(true);
  });
});
