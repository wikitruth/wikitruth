'use strict';

const childProcess = require('child_process');
const path = require('path');

const root = process.cwd();
const sdkRoot = path.join(root, 'sdks/typescript');

describe('agent SDK contracts', () => {
  beforeAll(() => {
    childProcess.execFileSync('npx', ['tsc', '-p', 'tsconfig.json'], { cwd: sdkRoot, stdio: 'pipe' });
  });

  it('retries idempotent jobs without changing governance headers', async () => {
    const { WikitruthAgentClient } = require(path.join(sdkRoot, 'dist/index.js'));
    const calls = [];
    const fetcher = jest.fn(async (url, options) => {
      calls.push({ url, options });
      if (calls.length === 1) return new Response(JSON.stringify({ error: { message: 'busy' } }), { status: 503 });
      return new Response(JSON.stringify({ success: true, job: { id: 'job-1', agentRunId: 'run-1', status: 'queued' } }), { status: 202, headers: { 'Content-Type': 'application/json' } });
    });
    const client = new WikitruthAgentClient('https://example.test/api/v1', 'wt_agent_test.secret', 1, fetcher);
    const response = await client.createJob([], { runId: 'run-1', model: 'local', sourceManifest: [{ url: 'https://example.test/source' }] }, 'job-key-0001');
    expect(response.job.status).toBe('queued');
    expect(calls).toHaveLength(2);
    expect(calls[0].options.headers['Idempotency-Key']).toBe('job-key-0001');
    expect(calls[1].options.headers['Idempotency-Key']).toBe('job-key-0001');
    expect(calls[0].options.headers['X-Agent-Run-Id']).toBe('run-1');
    expect(calls[0].options.headers['X-Agent-Source-Manifest']).toContain('source');
  });

  it('provides a cursor iterator and a dependency-free Python client', async () => {
    const { WikitruthAgentClient } = require(path.join(sdkRoot, 'dist/index.js'));
    const fetcher = jest.fn(async (url) => {
      const secondPage = String(url).includes('cursor=cursor-2');
      return new Response(JSON.stringify(secondPage
        ? { items: [{ id: 'two' }], nextCursor: null }
        : { items: [{ id: 'one' }], nextCursor: 'cursor-2' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    const client = new WikitruthAgentClient('https://example.test/api/v1', 'wt_agent_test.secret', 0, fetcher);
    const ids = [];
    for await (const job of client.iterateJobs()) ids.push(job.id);
    expect(ids).toEqual(['one', 'two']);
    expect(() => childProcess.execFileSync('python3', ['-m', 'unittest', 'discover', '-s', 'tests'], {
      cwd: path.join(root, 'sdks/python'), stdio: 'pipe',
    })).not.toThrow();
  });
});
