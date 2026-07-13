'use strict';

require('ts-node/register/transpile-only');
const mongoose = require('mongoose');
const { FIXPH_TENANT } = require('../../server/src/config/civicTenants');
const constants = require('../../server/src/models/constants');

function buildLegacyLinkOperations(records) {
  const operations = [];
  records.forEach((record) => {
    if (!record.createUserId) return;
    const targets = [
      ...(record.artifactIds || []).map((objectId) => ({ objectId, objectName: 'artifact', relationship: 'evidence' })),
      ...(record.issueIds || []).map((objectId) => ({ objectId, objectName: 'issue', relationship: 'review_issue' })),
    ];
    targets.forEach((target) => {
      const objectType = Number(constants.OBJECT_TYPES[target.objectName]);
      operations.push({
        updateOne: {
          filter: {
            tenantId: 'fixtheph', civicRecordId: record._id, relationship: target.relationship,
            objectType, objectId: target.objectId,
          },
          update: {
            $setOnInsert: {
              objectName: target.objectName, createUserId: record.createUserId,
              createUsername: '', createDate: record.createDate || new Date(),
            },
          },
          upsert: true,
        },
      });
    });
  });
  return operations;
}

async function run({ apply = false } = {}) {
  const uri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wikitruth';
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DBNAME || undefined });
  const database = mongoose.connection.db;
  const civicRecords = database.collection('civicrecords');
  const civicTenants = database.collection('civictenants');
  const civicEntryLinks = database.collection('civicentrylinks');
  const missingTenantQuery = { $or: [{ tenantId: { $exists: false } }, { tenantId: null }, { tenantId: '' }] };
  const legacyRecords = await civicRecords.find({
    $or: [{ artifactIds: { $exists: true, $ne: [] } }, { issueIds: { $exists: true, $ne: [] } }],
  }, { projection: { _id: 1, artifactIds: 1, issueIds: 1, createUserId: 1, createDate: 1 } }).toArray();
  const linkOperations = buildLegacyLinkOperations(legacyRecords);
  const missingTenantCount = await civicRecords.countDocuments(missingTenantQuery);

  const report = {
    mode: apply ? 'apply' : 'dry-run',
    tenant: FIXPH_TENANT.tenantId,
    civicRecordsToBackfill: missingTenantCount,
    legacyLinksToUpsert: linkOperations.length,
  };
  if (!apply) {
    console.log(JSON.stringify(report, null, 2));
    await mongoose.disconnect();
    return report;
  }

  await civicTenants.updateOne(
    { tenantId: FIXPH_TENANT.tenantId },
    { $setOnInsert: { ...FIXPH_TENANT, createUserId: null, editUserId: null, createDate: new Date(), editDate: new Date() } },
    { upsert: true },
  );
  const backfill = await civicRecords.updateMany(missingTenantQuery, {
    $set: { tenantId: 'fixtheph', countryCode: 'PH', 'location.countryCode': 'PH' },
  });
  if (linkOperations.length) await civicEntryLinks.bulkWrite(linkOperations, { ordered: false });
  await Promise.all([
    civicRecords.createIndex({ tenantId: 1, kind: 1, status: 1, stage: 1, editDate: -1 }),
    civicEntryLinks.createIndex({ tenantId: 1, civicRecordId: 1, relationship: 1, objectType: 1, objectId: 1 }, { unique: true }),
  ]);
  report.civicRecordsBackfilled = backfill.modifiedCount;
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

module.exports = { buildLegacyLinkOperations, run };
