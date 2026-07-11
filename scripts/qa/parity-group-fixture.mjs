#!/usr/bin/env node
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';

const require = createRequire(import.meta.url);
const config = require('../../config/config');
const FIXTURE_MARKER = 'migration-parity-group-v1';
const FIXTURE_ID = new mongoose.Types.ObjectId('66f1a17e0000000000000006');

async function withGroupsCollection(operation) {
  const connection = await mongoose.createConnection(config.mongodb.uri).asPromise();
  try {
    return await operation(connection.collection('groups'));
  } finally {
    await connection.close();
  }
}

export async function ensureParityGroupFixture() {
  return withGroupsCollection(async (groups) => {
    const existing = await groups.findOne({ _id: FIXTURE_ID });
    if (existing && existing?.extras?.qaFixture !== FIXTURE_MARKER) {
      throw new Error(`Reserved parity group id is already in use: ${FIXTURE_ID}`);
    }

    const now = new Date();
    await groups.updateOne(
      { _id: FIXTURE_ID },
      {
        $set: {
          title: 'Wikitruth Migration Parity Group',
          description: 'Temporary public fixture for legacy and modern group route verification.',
          friendlyUrl: 'wikitruth-migration-parity-group',
          privacyType: 10,
          editDate: now,
          members: [],
          extras: { qaFixture: FIXTURE_MARKER },
        },
        $setOnInsert: {
          createDate: now,
        },
      },
      { upsert: true },
    );

    return {
      id: String(FIXTURE_ID),
      friendlyUrl: 'wikitruth-migration-parity-group',
      title: 'Wikitruth Migration Parity Group',
      marker: FIXTURE_MARKER,
    };
  });
}

export async function cleanupParityGroupFixture() {
  return withGroupsCollection(async (groups) => {
    const result = await groups.deleteOne({ _id: FIXTURE_ID, 'extras.qaFixture': FIXTURE_MARKER });
    return result.deletedCount === 1;
  });
}

async function runCli() {
  const command = String(process.argv[2] || 'create').trim().toLowerCase();
  if (command === 'create') {
    console.log(JSON.stringify(await ensureParityGroupFixture(), null, 2));
    return;
  }
  if (command === 'cleanup') {
    console.log(JSON.stringify({ deleted: await cleanupParityGroupFixture() }, null, 2));
    return;
  }
  throw new Error('Usage: node scripts/qa/parity-group-fixture.mjs [create|cleanup]');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(`Parity group fixture failed: ${String(error)}`);
    process.exit(1);
  });
}
