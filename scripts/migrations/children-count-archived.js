'use strict';

const mongoose = require('mongoose');

const ARCHIVED_STATUS = 3;

const ENTITY_DESCRIPTORS = [
  { collection: 'topics', kind: 'topic' },
  { collection: 'topiclinks', kind: 'topicLink' },
  { collection: 'arguments', kind: 'argument' },
  { collection: 'argumentlinks', kind: 'argumentLink' },
  { collection: 'artifacts', kind: 'artifact' },
  { collection: 'questions', kind: 'question' },
  { collection: 'answers', kind: 'answer' },
  { collection: 'issues', kind: 'issue' },
  { collection: 'opinions', kind: 'opinion' },
];

function source(collection, query) {
  return { collection, query: { ...query, 'screening.status': ARCHIVED_STATUS } };
}

function buildArchivedCountPlan(kind, entry) {
  const id = entry._id;
  const ownerId = entry.ownerId;
  const ownerChildren = (collection) => [source(collection, { ownerId: id })];

  switch (kind) {
    case 'topic':
      return {
        topics: [source('topics', { parentId: id }), source('topiclinks', { parentId: id })],
        arguments: [source('arguments', { ownerId: id, parentId: null }), source('argumentlinks', { ownerId: id, parentId: null })],
        artifacts: [source('artifacts', { ownerId: id, parentId: null })],
        questions: ownerChildren('questions'),
        issues: ownerChildren('issues'),
        opinions: ownerChildren('opinions'),
      };
    case 'topicLink':
    case 'argumentLink':
    case 'answer':
      return {
        issues: ownerChildren('issues'),
        opinions: ownerChildren('opinions'),
      };
    case 'argument':
      return {
        arguments: [source('arguments', { ownerId, parentId: id }), source('argumentlinks', { ownerId, parentId: id })],
        questions: ownerChildren('questions'),
        issues: ownerChildren('issues'),
        opinions: ownerChildren('opinions'),
      };
    case 'artifact':
      return {
        artifacts: [source('artifacts', { ownerId, parentId: id })],
        arguments: [source('arguments', { ownerId: id, parentId: null }), source('argumentlinks', { ownerId: id, parentId: null })],
        questions: ownerChildren('questions'),
        issues: ownerChildren('issues'),
        opinions: ownerChildren('opinions'),
      };
    case 'question':
      return {
        answers: [source('answers', { questionId: id })],
        issues: ownerChildren('issues'),
        opinions: ownerChildren('opinions'),
      };
    case 'issue':
      return { opinions: ownerChildren('opinions') };
    case 'opinion':
      return {
        issues: ownerChildren('issues'),
        opinions: ownerChildren('opinions'),
      };
    default:
      return {};
  }
}

async function calculateArchivedCounts(database, kind, entry) {
  const plan = buildArchivedCountPlan(kind, entry);
  const counts = {};
  for (const [bucket, sources] of Object.entries(plan)) {
    const values = await Promise.all(sources.map(({ collection, query }) => (
      database.collection(collection).countDocuments(query)
    )));
    counts[bucket] = values.reduce((total, value) => total + Number(value || 0), 0);
  }
  return counts;
}

function readArchivedCount(entry, bucket) {
  return Number(entry.childrenCount?.[bucket]?.archived || 0);
}

async function flushOperations(collection, operations) {
  if (operations.length === 0) return 0;
  const result = await collection.bulkWrite(operations, { ordered: false });
  operations.length = 0;
  return Number(result.modifiedCount || 0);
}

async function run({ apply = false } = {}) {
  const uri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || process.env.MONGODB_URI
    || 'mongodb://127.0.0.1:27017/wikitruth';
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DBNAME || undefined });
  const database = mongoose.connection.db;
  const report = { mode: apply ? 'apply' : 'dry-run', scanned: 0, changed: 0, modified: 0, collections: {} };

  for (const descriptor of ENTITY_DESCRIPTORS) {
    const collection = database.collection(descriptor.collection);
    const entries = await collection.find({}, {
      projection: { _id: 1, ownerId: 1, childrenCount: 1 },
    }).toArray();
    const operations = [];
    let collectionChanged = 0;
    let collectionModified = 0;

    for (const entry of entries) {
      const counts = await calculateArchivedCounts(database, descriptor.kind, entry);
      const changedBuckets = Object.entries(counts).filter(([bucket, count]) => (
        readArchivedCount(entry, bucket) !== count
        || typeof entry.childrenCount?.[bucket]?.archived === 'undefined'
      ));
      if (changedBuckets.length === 0) continue;

      collectionChanged += 1;
      const update = {};
      changedBuckets.forEach(([bucket, count]) => {
        update[`childrenCount.${bucket}.archived`] = count;
      });
      if (apply) {
        operations.push({ updateOne: { filter: { _id: entry._id }, update: { $set: update } } });
        if (operations.length >= 500) {
          collectionModified += await flushOperations(collection, operations);
        }
      }
    }

    if (apply) collectionModified += await flushOperations(collection, operations);
    report.scanned += entries.length;
    report.changed += collectionChanged;
    report.modified += collectionModified;
    report.collections[descriptor.collection] = {
      scanned: entries.length,
      changed: collectionChanged,
      modified: collectionModified,
    };
  }

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

module.exports = { buildArchivedCountPlan, calculateArchivedCounts, run };
