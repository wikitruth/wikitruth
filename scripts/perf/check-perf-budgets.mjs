#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';

const rootDir = process.cwd();
const baseUrl = process.env.PERF_BASE_URL || 'http://127.0.0.1:8000';
const configPath =
  process.env.PERF_BUDGET_CONFIG ||
  path.join(rootDir, 'docs/qa/perf-budgets-2026-04-24.json');

function percentile(values, percentileValue) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return sorted[index] || 0;
}

async function runLoad({ url, connections, durationSeconds }) {
  const durationMs = Math.max(1, durationSeconds * 1000);
  const startedAt = performance.now();
  const deadline = startedAt + durationMs;
  const latencies = [];
  let completed = 0;

  async function worker() {
    while (performance.now() < deadline) {
      const requestStartedAt = performance.now();
      const response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(Math.max(5_000, durationMs)),
      });
      await response.arrayBuffer();
      if (response.status >= 500) {
        throw new Error(`Load request failed with HTTP ${response.status}: ${url}`);
      }
      latencies.push(performance.now() - requestStartedAt);
      completed += 1;
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, connections) }, () => worker()));
  const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 0.001);
  return {
    p95: percentile(latencies, 95),
    averageRequestsPerSecond: completed / elapsedSeconds,
  };
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main() {
  const configRaw = await fs.readFile(configPath, 'utf8');
  const config = JSON.parse(configRaw);
  const defaults = config.defaults || {};
  const endpoints = Array.isArray(config.endpoints) ? config.endpoints : [];

  if (!endpoints.length) {
    throw new Error(`No endpoints found in perf budget config: ${configPath}`);
  }

  const results = [];
  let failed = false;

  for (const endpoint of endpoints) {
    const name = String(endpoint.name || endpoint.path || 'unnamed');
    const requestPath = String(endpoint.path || '').trim();
    if (!requestPath) {
      throw new Error(`Endpoint '${name}' is missing "path".`);
    }

    const url = new URL(requestPath, baseUrl).toString();
    const connections = toNumber(endpoint.connections, toNumber(defaults.connections, 10));
    const duration = toNumber(endpoint.durationSeconds, toNumber(defaults.durationSeconds, 5));
    const p95MsMax = toNumber(endpoint.p95MsMax, 0);
    const avgReqPerSecMin = toNumber(endpoint.avgReqPerSecMin, 0);

    const result = await runLoad({
      url,
      connections,
      durationSeconds: duration,
    });

    const p95 = toNumber(result.p95, 0);
    const avgReqPerSec = toNumber(result.averageRequestsPerSecond, 0);

    const p95Pass = p95MsMax <= 0 ? true : p95 <= p95MsMax;
    const rpsPass = avgReqPerSecMin <= 0 ? true : avgReqPerSec >= avgReqPerSecMin;

    if (!p95Pass || !rpsPass) {
      failed = true;
    }

    results.push({
      name,
      url,
      p95,
      p95MsMax,
      avgReqPerSec,
      avgReqPerSecMin,
      pass: p95Pass && rpsPass,
    });
  }

  console.log(`Perf budget check (base=${baseUrl})`);
  for (const row of results) {
    const status = row.pass ? 'PASS' : 'FAIL';
    console.log(
      [
        `[${status}]`,
        row.name,
        `p95=${row.p95.toFixed(1)}ms (max ${row.p95MsMax || 'n/a'})`,
        `avgRPS=${row.avgReqPerSec.toFixed(1)} (min ${row.avgReqPerSecMin || 'n/a'})`,
      ].join(' | ')
    );
  }

  if (failed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`Perf budget check failed: ${error?.message || error}`);
  process.exit(1);
});
