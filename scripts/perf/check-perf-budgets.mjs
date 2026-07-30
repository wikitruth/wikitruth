#!/usr/bin/env node

import fs from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';

const rootDir = process.cwd();
const baseUrl = process.env.PERF_BASE_URL || 'https://127.0.0.1:9443';
const configPath =
  process.env.PERF_BUDGET_CONFIG ||
  path.join(rootDir, 'docs/qa/perf-budgets-2026-04-24.json');

function percentile(values, percentileValue) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return sorted[index] || 0;
}

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });
const localHttpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });

function requestOnce(url, timeoutMs) {
  const target = new URL(url);
  const isHttps = target.protocol === 'https:';
  const isLoopback = ['127.0.0.1', '::1', 'localhost'].includes(target.hostname);
  const transport = isHttps ? https : http;
  const agent = isHttps ? (isLoopback ? localHttpsAgent : httpsAgent) : httpAgent;

  return new Promise((resolve, reject) => {
    const request = transport.get(target, { agent }, (response) => {
      response.on('error', reject);
      response.resume();
      response.on('end', () => resolve(response.statusCode || 0));
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error(`Load request timed out: ${url}`)));
    request.on('error', reject);
  });
}

async function runLoad({ url, connections, durationSeconds, maxRequests }) {
  const durationMs = Math.max(1, durationSeconds * 1000);
  const startedAt = performance.now();
  const deadline = startedAt + durationMs;
  const latencies = [];
  let started = 0;
  let completed = 0;

  async function worker() {
    while (performance.now() < deadline) {
      if (started >= maxRequests) {
        return;
      }
      started += 1;
      const requestStartedAt = performance.now();
      const status = await requestOnce(url, Math.max(5_000, durationMs));
      if (status < 200 || status >= 300) {
        throw new Error(`Load request failed with HTTP ${status}: ${url}`);
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
    completed,
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
    const maxRequests = Math.max(1, toNumber(endpoint.maxRequests, toNumber(defaults.maxRequests, 50)));
    const p95MsMax = toNumber(endpoint.p95MsMax, 0);
    const avgReqPerSecMin = toNumber(endpoint.avgReqPerSecMin, 0);

    const result = await runLoad({
      url,
      connections,
      durationSeconds: duration,
      maxRequests,
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
      samples: result.completed,
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
        `samples=${row.samples}`,
        `p95=${row.p95.toFixed(1)}ms (max ${row.p95MsMax || 'n/a'})`,
        `burstRPS=${row.avgReqPerSec.toFixed(1)} (min ${row.avgReqPerSecMin || 'n/a'})`,
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
