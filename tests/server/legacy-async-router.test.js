'use strict';

const path = require('path');

require('ts-node/register/transpile-only');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const { wrapLegacyRequestHandler } = require(path.join(
  PROJECT_ROOT,
  'legacy',
  'compatibility',
  'server',
  'asyncRouter',
));

describe('Legacy async controller isolation', function () {
  it('forwards rejected controller promises to Express', async function () {
    const failure = new Error('legacy async failure');
    const next = jest.fn();
    const handler = wrapLegacyRequestHandler(async function () {
      throw failure;
    });

    handler({}, {}, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalledWith(failure);
  });

  it('forwards synchronous controller failures to Express', function () {
    const failure = new Error('legacy sync failure');
    const next = jest.fn();
    const handler = wrapLegacyRequestHandler(function () {
      throw failure;
    });

    handler({}, {}, next);

    expect(next).toHaveBeenCalledWith(failure);
  });
});
