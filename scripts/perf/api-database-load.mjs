#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { createRequire } from 'node:module';
import mongoose from 'mongoose';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const config = require('../../server/src/config/config.js');
const baseUrl = process.env.WT_LOAD_BASE_URL || 'https://127.0.0.1:9443';
const durationMs = Math.max(1000, Number(process.env.WT_LOAD_DURATION_SECONDS || 10) * 1000);
const concurrency = Math.max(1, Math.min(100, Number(process.env.WT_LOAD_CONCURRENCY || 10)));
const databaseIterations = Math.max(1, Math.min(1000, Number(process.env.WT_LOAD_DB_ITERATIONS || 50)));
const requestsPerSecondPerWorker = Math.max(0.1, Math.min(4, Number(process.env.WT_LOAD_RPS_PER_WORKER || 3)));
const warmupRounds = Math.max(1, Math.min(10, Number(process.env.WT_LOAD_WARMUP_ROUNDS || 3)));
const runId = crypto.randomBytes(4).toString('hex');
const outputPath = process.env.WT_LOAD_OUTPUT || path.join('docs', 'performance', `API_DATABASE_LOAD_REPORT_${new Date().toISOString().slice(0, 10)}.json`);
const requestPaths = String(process.env.WT_LOAD_PATHS || '/api/v1/home,/api/v1/topics?limit=20,/api/v1/civic/overview').split(',').map((value) => value.trim()).filter(Boolean);
const databaseCollections = ['topics', 'arguments', 'artifacts', 'civicrecords'];

function percentile(values, percentage) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return Number(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percentage) - 1)].toFixed(2));
}

function summary(durations, failures = 0) {
  const total = durations.length + failures;
  return {
    requests: total, successes: durations.length, failures,
    errorRate: total ? Number((failures / total).toFixed(4)) : 0,
    p50Ms: percentile(durations, 0.5), p95Ms: percentile(durations, 0.95), p99Ms: percentile(durations, 0.99),
    maximumMs: durations.length ? Number(Math.max(...durations).toFixed(2)) : 0,
  };
}

function get(url, workerId) {
  return new Promise((resolve) => {
    const started = performance.now();
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.request(url, {
      method: 'GET', headers: { Accept: 'application/json', 'Accept-Version': '1', 'X-Client-Platform': 'load-test', 'X-Client-Version': `${runId}-worker-${workerId}` },
      timeout: 10_000, rejectUnauthorized: !['127.0.0.1', 'localhost'].includes(url.hostname),
    }, (response) => {
      response.resume();
      response.on('end', () => resolve({ ok: Number(response.statusCode) >= 200 && Number(response.statusCode) < 400, status: response.statusCode || 0, duration: performance.now() - started }));
    });
    request.on('timeout', () => request.destroy(new Error('timeout')));
    request.on('error', () => resolve({ ok: false, status: 0, duration: performance.now() - started }));
    request.end();
  });
}

async function apiLoad() {
  const stopAt = Date.now() + durationMs;
  const durations = [];
  const statuses = {};
  let failures = 0;
  let sequence = 0;
  const worker = async (workerId) => {
    while (Date.now() < stopAt) {
      const iterationStarted = Date.now();
      const route = requestPaths[sequence++ % requestPaths.length];
      const result = await get(new URL(route, baseUrl), workerId);
      statuses[result.status] = (statuses[result.status] || 0) + 1;
      if (result.ok) durations.push(result.duration); else failures += 1;
      const waitMs = Math.max(0, (1000 / requestsPerSecondPerWorker) - (Date.now() - iterationStarted));
      if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  };
  await Promise.all(Array.from({ length: concurrency }, (_value, index) => worker(index)));
  return { ...summary(durations, failures), statuses, durationSeconds: durationMs / 1000, concurrency, requestsPerSecondPerWorker, paths: requestPaths };
}

async function warmup() {
  const apiResults = [];
  for (let round = 0; round < warmupRounds; round += 1) {
    apiResults.push(...await Promise.all(requestPaths.map((route, index) => get(new URL(route, baseUrl), `warmup-${round}-${index}`))));
  }
  if (apiResults.some((result) => !result.ok)) throw new Error('API warm-up failed');
  const connection = await mongoose.createConnection(config.mongodb.uri, { serverSelectionTimeoutMS: 10_000, maxPoolSize: 10 }).asPromise();
  try {
    for (let round = 0; round < warmupRounds; round += 1) {
      await Promise.all(databaseCollections.map((collection) => connection.collection(collection)
        .find({ private: { $ne: true } }).sort({ editDate: -1 }).limit(1).toArray()));
    }
  } finally {
    await connection.close();
  }
  return { rounds: warmupRounds, apiRequests: apiResults.length, databaseReads: databaseCollections.length * warmupRounds };
}

async function databaseLoad() {
  const connection = await mongoose.createConnection(config.mongodb.uri, { serverSelectionTimeoutMS: 10_000, maxPoolSize: 20 }).asPromise();
  const durations = [];
  let failures = 0;
  try {
    let sequence = 0;
    const worker = async () => {
      while (sequence < databaseIterations) {
        const iteration = sequence++;
        const started = performance.now();
        try {
          await connection.collection(databaseCollections[iteration % databaseCollections.length]).find({ private: { $ne: true } }).sort({ editDate: -1 }).limit(20).toArray();
          durations.push(performance.now() - started);
        } catch (_error) {
          failures += 1;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(10, concurrency) }, worker));
  } finally {
    await connection.close();
  }
  return { ...summary(durations, failures), iterations: databaseIterations, concurrency: Math.min(10, concurrency) };
}

async function main() {
  const warmupResult = await warmup();
  const [api, database] = await Promise.all([apiLoad(), databaseLoad()]);
  const thresholds = {
    apiP95Ms: Number(process.env.WT_LOAD_API_P95_MS || 1500),
    databaseP95Ms: Number(process.env.WT_LOAD_DB_P95_MS || 500),
    maximumErrorRate: Number(process.env.WT_LOAD_MAX_ERROR_RATE || 0.01),
  };
  const checks = {
    apiP95: api.p95Ms <= thresholds.apiP95Ms,
    databaseP95: database.p95Ms <= thresholds.databaseP95Ms,
    apiErrors: api.errorRate <= thresholds.maximumErrorRate,
    databaseErrors: database.errorRate <= thresholds.maximumErrorRate,
  };
  const report = {
    generatedAt: new Date().toISOString(), mode: 'read-only-api-and-database', baseUrl,
    warmup: warmupResult, api, database, thresholds, checks, passed: Object.values(checks).every(Boolean),
  };
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`API/database load report: ${outputPath}`);
  console.log(JSON.stringify({ api: { requests: api.requests, p95Ms: api.p95Ms, errorRate: api.errorRate }, database: { requests: database.requests, p95Ms: database.p95Ms, errorRate: database.errorRate }, passed: report.passed }, null, 2));
  if (!report.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`API/database load test failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
