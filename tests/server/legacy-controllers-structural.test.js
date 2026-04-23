'use strict';

/**
 * Legacy controller structural smoke (L1-04).
 *
 * The legacy controllers under `legacy/server/controllers/**` are historical
 * snapshots: they are not loaded by the modern Express boot path, but they
 * remain in the repository as the reference point for legacy code-health
 * tracking. This test prevents accidental syntax breakage from large
 * mechanical sweeps (such as the L2-02 `@ts-ignore` strip) by:
 *  1. Transpiling each file via the TypeScript compiler API (catches syntax
 *     errors).
 *  2. Evaluating the resulting JS with a stubbed `require()` and asserting
 *     that the module exports the `function (router) { ... }` factory shape
 *     consumed by `legacy/server/utils/setupEntryRouters.js`.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const LEGACY_CONTROLLER_DIR = path.join(
  process.cwd(),
  'legacy',
  'server',
  'controllers',
);

function listControllerFiles() {
  const direct = fs
    .readdirSync(LEGACY_CONTROLLER_DIR)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => path.join(LEGACY_CONTROLLER_DIR, name));

  const asyncDir = path.join(LEGACY_CONTROLLER_DIR, 'async');
  const asyncFiles = fs.existsSync(asyncDir)
    ? fs
        .readdirSync(asyncDir)
        .filter((name) => name.endsWith('.ts'))
        .map((name) => path.join(asyncDir, name))
    : [];

  return [...direct, ...asyncFiles];
}

function loadFactory(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      noEmitOnError: false,
    },
    fileName: filePath,
    reportDiagnostics: false,
  }).outputText;

  function makeProxy() {
    const target = function () {
      return makeProxy();
    };
    return new Proxy(target, {
      get: (_t, prop) => {
        if (prop === Symbol.toPrimitive) {
          return () => '';
        }
        return makeProxy();
      },
      apply: () => makeProxy(),
      construct: () => makeProxy(),
    });
  }

  const sandboxModule = { exports: {} };
  const sandbox = {
    module: sandboxModule,
    exports: sandboxModule.exports,
    require: () => makeProxy(),
    console,
    process,
    Buffer,
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
  };

  vm.createContext(sandbox);
  vm.runInContext(transpiled, sandbox, { filename: filePath });
  return sandboxModule.exports;
}

describe('legacy controller structural smoke (L1-04)', () => {
  const files = listControllerFiles();

  it('discovers at least one legacy controller', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  files.forEach((file) => {
    const rel = path.relative(process.cwd(), file);
    test(`${rel} parses and exports a router factory`, () => {
      const factory = loadFactory(file);
      expect(typeof factory).toBe('function');
      expect(factory.length).toBeGreaterThanOrEqual(0);
      expect(factory.length).toBeLessThanOrEqual(2);
    });
  });
});
