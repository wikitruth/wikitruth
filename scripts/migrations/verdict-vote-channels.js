'use strict';

require('ts-node/register/transpile-only');
const mongoose = require('mongoose');

const POLICY_VERSION = '2026-07-v2';

function mapLegacyStatus(status) {
  const value = Number(status);
  if ([1, 10, 11, 12, 13].includes(value)) return 'supported';
  if ([2, 21, 22, 23, 24].includes(value)) return 'refuted';
  if (value === 3) return 'mixed';
  return 'insufficient_evidence';
}

function isLegacyUniqueIndex(index) {
  const key = index && index.key ? index.key : {};
  return index.unique === true
    && key.objectType === 1
    && key.objectId === 1
    && key.voterUserId === 1
    && !Object.prototype.hasOwnProperty.call(key, 'channel');
}

async function run({ apply = false } = {}) {
  const uri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || process.env.MONGODB_URI
    || 'mongodb://127.0.0.1:27017/wikitruth';
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DBNAME || undefined });
  const collection = mongoose.connection.db.collection('verdictvotes');
  const missingChannelQuery = {
    $or: [{ channel: { $exists: false } }, { channel: null }, { channel: '' }],
  };
  const indexes = await collection.indexes().catch(() => []);
  const legacyIndexes = indexes.filter(isLegacyUniqueIndex).map((index) => index.name);
  const legacyVotes = await collection.find(missingChannelQuery, {
    projection: { _id: 1, verdictStatus: 1, status: 1 },
  }).toArray();
  const report = {
    mode: apply ? 'apply' : 'dry-run',
    votesToBackfill: legacyVotes.length,
    legacyIndexesToDrop: legacyIndexes,
    policyVersion: POLICY_VERSION,
  };
  if (!apply) {
    console.log(JSON.stringify(report, null, 2));
    await mongoose.disconnect();
    return report;
  }

  if (legacyVotes.length) {
    await collection.bulkWrite(legacyVotes.map((vote) => ({
      updateOne: {
        filter: { _id: vote._id },
        update: {
          $set: {
            channel: 'factual',
            channelStatus: mapLegacyStatus(vote.verdictStatus ?? vote.status),
            confidence: 50,
            conflictDeclared: false,
            policyVersion: POLICY_VERSION,
          },
        },
      },
    })), { ordered: false });
  }
  for (const indexName of legacyIndexes) await collection.dropIndex(indexName);
  await collection.createIndex(
    { objectType: 1, objectId: 1, channel: 1, voterUserId: 1 },
    { unique: true, name: 'verdict_vote_channel_voter_unique' },
  );
  await collection.createIndex({ voterUserId: 1, outcomeStatus: 1, outcomeDate: -1 });
  report.votesBackfilled = legacyVotes.length;
  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
  return report;
}

if (require.main === module) {
  run({ apply: process.argv.includes('--apply') }).catch(async (error) => {
    console.error(error);
    await mongoose.disconnect().catch(() => undefined);
    process.exitCode = 1;
  });
}

module.exports = { isLegacyUniqueIndex, mapLegacyStatus, run };
