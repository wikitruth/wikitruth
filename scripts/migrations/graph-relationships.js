'use strict';

require('ts-node/register/transpile-only');
const mongoose = require('mongoose');

async function duplicateGroups(collection, keyFields, fallbackRelationship) {
  const id = keyFields.reduce((result, field) => ({ ...result, [field]: `$${field}` }), {
    relationship: { $ifNull: ['$relationship', fallbackRelationship] },
  });
  return collection.aggregate([
    { $group: { _id: id, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 20 },
  ]).toArray();
}

async function run({ apply = false } = {}) {
  const uri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || process.env.MONGODB_URI
    || 'mongodb://127.0.0.1:27017/wikitruth';
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DBNAME || undefined });
  const database = mongoose.connection.db;
  const topicLinks = database.collection('topiclinks');
  const argumentLinks = database.collection('argumentlinks');
  const objectLinks = database.collection('objectlinks');
  const missing = { $or: [{ relationship: { $exists: false } }, { relationship: null }, { relationship: '' }] };
  const [topicMissing, argumentMissing, objectMissing, topicDuplicates, argumentDuplicates] = await Promise.all([
    topicLinks.countDocuments(missing),
    argumentLinks.countDocuments(missing),
    objectLinks.countDocuments(missing),
    duplicateGroups(topicLinks, ['topicId', 'parentId'], 'child'),
    duplicateGroups(argumentLinks, ['argumentId', 'parentId', 'ownerId'], { $cond: ['$against', 'oppose', 'child'] }),
  ]);
  const report = {
    mode: apply ? 'apply' : 'dry-run',
    backfill: { topicLinks: topicMissing, argumentLinks: argumentMissing, objectLinks: objectMissing },
    duplicateGroups: { topicLinks: topicDuplicates.length, argumentLinks: argumentDuplicates.length },
  };
  if (!apply) {
    console.log(JSON.stringify(report, null, 2));
    await mongoose.disconnect();
    return report;
  }
  if (topicDuplicates.length || argumentDuplicates.length) {
    throw new Error('Duplicate graph link groups must be reviewed before unique relationship indexes can be applied');
  }
  await Promise.all([
    topicLinks.updateMany(missing, { $set: { relationship: 'child' } }),
    argumentLinks.updateMany({ ...missing, against: true }, { $set: { relationship: 'oppose' } }),
    argumentLinks.updateMany({ ...missing, against: { $ne: true } }, { $set: { relationship: 'child' } }),
    objectLinks.updateMany(missing, { $set: { relationship: 'related' } }),
  ]);
  await Promise.all([
    topicLinks.createIndex({ topicId: 1, parentId: 1, relationship: 1 }, { unique: true, name: 'topic_relationship_unique' }),
    argumentLinks.createIndex({ argumentId: 1, parentId: 1, ownerId: 1, relationship: 1 }, { unique: true, name: 'argument_relationship_unique' }),
    objectLinks.createIndex({ leftType: 1, leftId: 1, rightType: 1, rightId: 1, relationship: 1 }, { unique: true, name: 'object_relationship_unique' }),
  ]);
  report.applied = true;
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

module.exports = { duplicateGroups, run };
