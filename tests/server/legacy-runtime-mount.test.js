'use strict';

/*
 * Legacy runtime mount integrity smoke (L1-04 / L4-03).
 *
 * Boots `registerLegacyCompatibility` from `legacy/compatibility/server/bootstrap.ts`
 * against an Express app with a deeply-stubbed `globalThis.__wikitruth_app`
 * (db.models, config, utility) so every legacy controller in the runtime
 * mount list is loaded and attached without requiring a live MongoDB.
 *
 * What this catches that the structural test does not:
 *   - Top-level controller load errors that only surface during real `attach`.
 *   - Missing or renamed mount points in the bootstrap controller table.
 *   - Side-effects in `legacy/server/utils/flowUtils` and friends at load time.
 *
 * What this intentionally does NOT cover (left for the live PM2 sweep, L5-01):
 *   - Per-route handler execution against real DB queries.
 *   - Template rendering (no view engine wired here).
 */

const path = require('path');
const express = require('express');

require('ts-node/register/transpile-only');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function makeProxy() {
  const target = function () {};
  const handler = {
    get(_t, prop) {
      if (prop === 'then') return undefined; // not a thenable
      if (prop === Symbol.toPrimitive) return () => '';
      if (prop === 'toString') return () => '';
      return makeProxy();
    },
    apply() {
      return makeProxy();
    },
    construct() {
      return makeProxy();
    },
  };
  return new Proxy(target, handler);
}

function buildStubApp() {
  return {
    db: { models: makeProxy() },
    config: makeProxy(),
    utility: {
      workflow: () => ({
        on: () => {},
        emit: () => {},
        hasErrors: () => false,
        outcome: { errors: [], errfor: {} },
      }),
    },
  };
}

const EXPECTED_CONTROLLER_MOUNTS = [
  '/',
  '/about',
  '/search',
  '/explore',
  '/screening',
  '/convert',
  '/visualize',
  '/topics',
  '/arguments',
  '/questions',
  '/answers',
  '/issues',
  '/opinions',
  '/artifacts',
  '/groups',
  '/members',
  '/outline',
  '/verdict',
  '/admin',
  '/install',
  '/clipboard',
  '/async/app',
  '/async/entry',
  '/async/preferences',
  '/async/clipboard',
];

describe('Legacy compatibility runtime mount (L1-04 / L4-03)', function () {
  let runtime;
  let app;

  beforeAll(function () {
    process.chdir(PROJECT_ROOT);
    globalThis.__wikitruth_app = buildStubApp();

    // Force a clean require cache for the legacy mount module so the stub
    // is observed during the controller require chain.
    const bootstrapId = require.resolve(
      path.join(PROJECT_ROOT, 'legacy', 'compatibility', 'server', 'bootstrap'),
    );
    delete require.cache[bootstrapId];

    const registerLegacyCompatibility = require(bootstrapId);

    app = express();
    runtime = registerLegacyCompatibility(app, { enabled: true });
  });

  afterAll(function () {
    delete globalThis.__wikitruth_app;
  });

  it('reports mounted=true with the canonical /legacy mount path', function () {
    expect(runtime).toBeTruthy();
    expect(runtime.enabled).toBe(true);
    expect(runtime.mounted).toBe(true);
    expect(runtime.mountPath).toBe('/legacy');
    expect(typeof runtime.staticRoot).toBe('string');
    expect(typeof runtime.templatesRoot).toBe('string');
  });

  it('attaches the legacy router to the parent app at /legacy', function () {
    const stack = (app._router && app._router.stack) || [];
    const legacyMount = stack.find(function (layer) {
      return (
        layer &&
        layer.regexp &&
        typeof layer.regexp.test === 'function' &&
        layer.regexp.test('/legacy')
      );
    });
    expect(legacyMount).toBeTruthy();
    expect(legacyMount.handle).toBeTruthy();
  });

  it('attaches every controller declared in the bootstrap mount table', function () {
    const stack = (app._router && app._router.stack) || [];
    const legacyMount = stack.find(function (layer) {
      return layer && layer.handle && layer.handle.stack && layer.regexp && layer.regexp.test('/legacy');
    });
    expect(legacyMount).toBeTruthy();
    const legacyRouter = legacyMount.handle;

    // Each `attachController(legacyRouter, '<routePath>', '<controllerPath>')`
    // installs a sub-router for the given routePath. Inspect the regexp of
    // each sub-router layer to confirm coverage.
    const subMountRegexes = legacyRouter.stack
      .filter(function (layer) {
        return layer && layer.handle && layer.handle.stack && layer.regexp;
      })
      .map(function (layer) {
        return layer.regexp;
      });

    EXPECTED_CONTROLLER_MOUNTS.forEach(function (routePath) {
      // The root `/` mount registers as a regexp matching '/'.
      const probe = routePath === '/' ? '/' : routePath;
      const matched = subMountRegexes.some(function (re) {
        return re.test(probe);
      });
      expect({ routePath, matched }).toEqual({ routePath, matched: true });
    });
  });

  it('keeps legacy flowUtils.ensureEntryIdParam callable for legacy entry routes', function () {
    const flowUtilsModule = require(path.join(PROJECT_ROOT, 'legacy', 'server', 'utils', 'flowUtils'));
    const flowUtils = flowUtilsModule && flowUtilsModule.default ? flowUtilsModule.default : flowUtilsModule;

    expect(typeof flowUtils.ensureEntryIdParam).toBe('function');
  });

  it('keeps legacy utils default export callable for legacy controllers', function () {
    const utilsModule = require(path.join(PROJECT_ROOT, 'legacy', 'server', 'utils', 'utils'));
    const legacyUtils = utilsModule && utilsModule.default ? utilsModule.default : utilsModule;

    expect(typeof legacyUtils.urlify).toBe('function');
  });
});
