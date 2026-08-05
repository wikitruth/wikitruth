#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import mongoose from 'mongoose';

const require = createRequire(import.meta.url);
const config = require('../../server/src/config/config.js');
const PACK_PATH = path.resolve('content/flagships/2026-08-first-real-world-pilots.json');
const CONFIRMATION = 'publish-pending-flagship-pilots';
const TYPE = { topic: 1, argument: 2, artifact: 6, issue: 10, civicRecord: 40 };
const apply = process.argv.includes('--apply');

function option(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) || '';
}

function deterministicId(key) {
  return new mongoose.Types.ObjectId(crypto.createHash('sha256').update(`wikitruth:flagship:${key}`).digest('hex').slice(0, 24));
}

function contentHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function screening(userId, now) {
  return { status: 0, history: [{ userId, date: now, status: 0 }] };
}

function actorFields(userId, now) {
  return { createUserId: userId, editUserId: userId, createDate: now, editDate: now };
}

function marker(pack, key) {
  return { key, packVersion: pack.version, publicationMode: pack.publicationMode };
}

function entryBase(pack, entry, userId, now) {
  return {
    _id: deterministicId(entry.key),
    title: entry.title,
    friendlyUrl: entry.friendlyUrl,
    content: entry.content,
    contentPreview: entry.content.slice(0, 240),
    screening: screening(userId, now),
    private: false,
    ...actorFields(userId, now),
    extras: { flagshipPilot: marker(pack, entry.key), contentHash: contentHash(entry) },
  };
}

function civicBase(pack, fixph, record, userId, now) {
  return {
    _id: deterministicId(record.key),
    tenantId: fixph.tenantId,
    countryCode: fixph.countryCode,
    kind: record.kind,
    title: record.title,
    friendlyUrl: record.friendlyUrl,
    summary: record.summary,
    description: record.description,
    status: 'pending',
    stage: 'screening',
    severity: record.severity,
    private: false,
    history: [{
      action: 'submitted', summary: 'Real-world flagship record submitted for independent review.',
      reason: 'Seeded from a versioned public-source pack without a verdict or reviewer outcome.',
      date: now, actorUserId: userId,
    }],
    ...actorFields(userId, now),
    extensions: {
      flagshipPilot: marker(pack, record.key),
      contentHash: contentHash(record),
      reviewCalibration: fixph.reviewCalibration,
    },
  };
}

function revisionDocument({ pack, key, objectType, objectId, document, userId, now }) {
  const revisionId = deterministicId(`${key}:revision:1`);
  const snapshot = JSON.parse(JSON.stringify(document));
  return {
    revision: {
      _id: revisionId, objectType, objectId, revisionNumber: 1, parentRevisionId: null,
      source: 'create', summary: 'Real-world flagship entry submitted for review',
      snapshot, snapshotHash: contentHash(snapshot),
      changedFields: Object.keys(snapshot).filter((field) => field !== '_id').sort(),
      createDate: now, createUserId: userId, createUsername: '',
      agentProvider: 'codex', agentPurpose: 'real-world flagship content publication',
      sourceManifest: [{ pack: path.relative(process.cwd(), PACK_PATH), version: pack.version }],
    },
    counter: { _id: deterministicId(`${key}:revision-counter`), key: `${objectType}:${objectId}`, sequence: 1 },
  };
}

async function main() {
  const pack = JSON.parse(await fs.readFile(PACK_PATH, 'utf8'));
  if (pack.publicationMode !== 'pending-review' || pack.reviewPolicy?.neverSeedVerdicts !== true) {
    throw new Error('Flagship pack must remain pending-review and prohibit seeded verdicts');
  }
  if (apply && option('confirm') !== CONFIRMATION) {
    throw new Error(`Apply mode requires --confirm=${CONFIRMATION}`);
  }

  const connection = await mongoose.createConnection(config.mongodb.uri, { serverSelectionTimeoutMS: 10_000 }).asPromise();
  const actualDatabase = connection.name;
  const expectedDatabase = option('expected-database');
  const creatorUsername = String(process.env.WT_FLAGSHIP_CREATOR_USERNAME || '').trim();
  if (apply && (!expectedDatabase || expectedDatabase !== actualDatabase)) {
    throw new Error('Apply mode requires an exact --expected-database match');
  }
  if (apply && !creatorUsername) {
    throw new Error('Apply mode requires WT_FLAGSHIP_CREATOR_USERNAME');
  }

  const collections = {
    users: connection.collection('users'), topics: connection.collection('topics'),
    arguments: connection.collection('arguments'), artifacts: connection.collection('artifacts'),
    issues: connection.collection('issues'), civicrecords: connection.collection('civicrecords'),
    objectlinks: connection.collection('objectlinks'), civicentrylinks: connection.collection('civicentrylinks'),
    entryrevisions: connection.collection('entryrevisions'),
    entryrevisioncounters: connection.collection('entryrevisioncounters'),
    entrytranslations: connection.collection('entrytranslations'), entryevents: connection.collection('entryevents'),
  };

  const creator = creatorUsername ? await collections.users.findOne({ username: creatorUsername }) : null;
  if (apply && !creator?._id) throw new Error('The configured flagship creator account was not found');
  const userId = creator?._id || deterministicId('dry-run-creator');
  const now = new Date();
  const parentTopic = await collections.topics.findOne({
    private: { $ne: true }, 'screening.status': 1,
    friendlyUrl: { $in: pack.wikitruth.parentTopicCandidates },
  });
  if (!parentTopic?._id) throw new Error('No accepted public parent topic matched the flagship candidates');
  const tenant = await connection.collection('civictenants').findOne({ tenantId: pack.fixph.tenantId, status: 'active' });
  if (!tenant?._id) throw new Error(`Active civic tenant ${pack.fixph.tenantId} was not found`);

  const topic = {
    ...entryBase(pack, pack.wikitruth.topic, userId, now),
    references: pack.wikitruth.topic.references, parentId: parentTopic._id,
    categoryId: parentTopic._id, ownerId: parentTopic._id, ownerType: TYPE.topic,
    childrenCount: {}, ethicalStatus: { hasValue: false },
  };
  const claims = pack.wikitruth.claims.map((claim) => ({
    ...entryBase(pack, claim, userId, now), references: claim.references,
    ownerType: TYPE.topic, ownerId: topic._id, categoryId: parentTopic._id,
    typeId: 1, against: Boolean(claim.against), childrenCount: {}, ethicalStatus: { hasValue: false },
  }));
  const mainClaim = claims[0];
  const knowledgeArtifacts = pack.wikitruth.artifacts.map((artifact) => ({
    ...entryBase(pack, artifact, userId, now), source: artifact.source,
    artifactType: 'document', ownerType: TYPE.argument, ownerId: mainClaim._id,
    categoryId: parentTopic._id,
    provenance: {
      originType: 'primary', publisher: artifact.publisher,
      publicationDate: artifact.publicationDate ? new Date(artifact.publicationDate) : null,
      captureDate: now, accessLimitations: 'Public web source; availability may change.',
      verifiabilityNotes: artifact.verifiabilityNotes,
      sourceIntegrity: { status: 'unchecked', checkedAt: null },
    },
  }));
  const issue = {
    ...entryBase(pack, pack.wikitruth.openIssue, userId, now),
    issueType: pack.wikitruth.openIssue.issueType, ownerType: TYPE.argument,
    ownerId: mainClaim._id, categoryId: parentTopic._id,
    resolution: { status: 'open', reason: '' }, childrenCount: {},
  };

  const civicIds = Object.fromEntries(pack.fixph.records.map((record) => [record.key, deterministicId(record.key)]));
  const civicRecords = pack.fixph.records.map((record) => {
    const document = civicBase(pack, pack.fixph, record, userId, now);
    document.parentId = record.parentKey ? civicIds[record.parentKey] : null;
    if (record.responsibilityRole) {
      document.responsibility = { institutionId: civicIds['emb-epr-institution'], role: record.responsibilityRole };
    }
    if (record.observedAt || record.sourceUrl) {
      document.observation = {
        observedAt: record.observedAt ? new Date(record.observedAt) : null,
        sourceUrl: record.sourceUrl || '', escalationStatus: 'submitted',
      };
    }
    return document;
  });
  const civicProject = civicRecords.find((record) => record.friendlyUrl === 'epr-program-registry-and-compliance-monitoring');
  if (!civicProject?._id) {
    throw new Error('The FixPH flagship pack is missing its project registry record');
  }
  const civicArtifacts = pack.fixph.artifacts.map((artifact) => ({
    ...entryBase(pack, artifact, userId, now), source: artifact.source,
    artifactType: 'document', ownerType: TYPE.civicRecord, ownerId: civicProject._id,
    categoryId: null,
    provenance: {
      originType: 'primary', publisher: artifact.publisher,
      publicationDate: artifact.publicationDate ? new Date(artifact.publicationDate) : null,
      captureDate: now, accessLimitations: 'Public web source; availability may change.',
      verifiabilityNotes: artifact.verifiabilityNotes,
      sourceIntegrity: { status: 'unchecked', checkedAt: null },
    },
  }));

  const entities = [
    { collection: 'topics', type: TYPE.topic, name: 'topic', key: pack.wikitruth.topic.key, document: topic, translations: pack.wikitruth.topic.translations },
    ...claims.map((document, index) => ({ collection: 'arguments', type: TYPE.argument, name: 'argument', key: pack.wikitruth.claims[index].key, document, translations: pack.wikitruth.claims[index].translations })),
    ...knowledgeArtifacts.map((document, index) => ({ collection: 'artifacts', type: TYPE.artifact, name: 'artifact', key: pack.wikitruth.artifacts[index].key, document })),
    { collection: 'issues', type: TYPE.issue, name: 'issue', key: pack.wikitruth.openIssue.key, document: issue },
    ...civicRecords.map((document, index) => ({ collection: 'civicrecords', type: TYPE.civicRecord, name: 'civicRecord', key: pack.fixph.records[index].key, document })),
    ...civicArtifacts.map((document, index) => ({ collection: 'artifacts', type: TYPE.artifact, name: 'artifact', key: pack.fixph.artifacts[index].key, document })),
  ];

  const planned = [];
  for (const entity of entities) {
    const existingId = await collections[entity.collection].findOne({ _id: entity.document._id });
    const existingSlug = await collections[entity.collection].findOne({ friendlyUrl: entity.document.friendlyUrl });
    if (existingId && existingId.extras?.flagshipPilot?.key !== entity.key && existingId.extensions?.flagshipPilot?.key !== entity.key) {
      throw new Error(`Deterministic ID collision for ${entity.key}`);
    }
    const existingHash = existingId?.extras?.contentHash || existingId?.extensions?.contentHash;
    const plannedHash = entity.document.extras?.contentHash || entity.document.extensions?.contentHash;
    if (existingId && existingHash !== plannedHash) {
      throw new Error(`Existing flagship record has diverged and requires manual review: ${entity.key}`);
    }
    if (existingSlug && String(existingSlug._id) !== String(entity.document._id)) {
      throw new Error(`Friendly URL already belongs to another record: ${entity.document.friendlyUrl}`);
    }
    planned.push({ ...entity, action: existingId ? 'unchanged' : 'insert' });
  }

  const summary = {
    mode: apply ? 'apply' : 'dry-run', database: actualDatabase, packVersion: pack.version,
    insert: planned.filter((item) => item.action === 'insert').length,
    unchanged: planned.filter((item) => item.action === 'unchanged').length,
    records: planned.map((item) => ({ key: item.key, collection: item.collection, action: item.action })),
    reviewState: 'pending-review', seededVerdicts: 0, seededReviewerVotes: 0,
  };
  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    await connection.close();
    return;
  }

  const inserted = [];
  const counterChanges = [];
  try {
    for (const item of planned.filter((candidate) => candidate.action === 'insert')) {
      await collections[item.collection].insertOne(item.document);
      inserted.push({ collection: item.collection, id: item.document._id });
      const { revision, counter } = revisionDocument({
        pack, key: item.key, objectType: item.type, objectId: item.document._id,
        document: item.document, userId, now,
      });
      await collections.entryrevisioncounters.insertOne(counter);
      inserted.push({ collection: 'entryrevisioncounters', id: counter._id });
      await collections.entryrevisions.insertOne(revision);
      inserted.push({ collection: 'entryrevisions', id: revision._id });
      for (const translation of item.translations || []) {
        const translationId = deterministicId(`${item.key}:translation:${translation.locale}`);
        const translationDocument = {
          _id: translationId, objectType: item.type, objectName: item.name,
          objectId: item.document._id, locale: translation.locale,
          title: translation.title, content: translation.content,
          contentPreview: translation.content.slice(0, 240), sourceRevisionId: revision._id,
          sourceRevisionNumber: 1, status: 'pending',
          history: [{ action: 'submitted', actorUserId: userId, date: now }],
          createUserId: userId, editUserId: userId, createDate: now, editDate: now,
        };
        await collections.entrytranslations.insertOne(translationDocument);
        inserted.push({ collection: 'entrytranslations', id: translationId });
      }
      const eventId = deterministicId(`${item.key}:submitted-event`);
      await collections.entryevents.insertOne({
        _id: eventId, scope: 'entry', eventType: 'flagship.submitted',
        objectType: item.type, objectName: item.name, objectId: item.document._id,
        actorUserId: userId, actorUsername: '',
        message: 'Real-world flagship entry submitted for independent review.',
        payload: { packVersion: pack.version, publicationMode: pack.publicationMode }, createDate: now,
      });
      inserted.push({ collection: 'entryevents', id: eventId });
    }

    const insertedKeys = new Set(planned.filter((item) => item.action === 'insert').map((item) => item.key));
    const increment = async (collection, id, fields) => {
      await collections[collection].updateOne({ _id: id }, { $inc: fields });
      counterChanges.push({ collection, id, fields });
    };
    if (insertedKeys.has(pack.wikitruth.topic.key)) {
      await increment('topics', parentTopic._id, { 'childrenCount.topics.total': 1, 'childrenCount.topics.pending': 1 });
    }
    const newClaimCount = pack.wikitruth.claims.filter((claim) => insertedKeys.has(claim.key)).length;
    if (newClaimCount) await increment('topics', topic._id, { 'childrenCount.arguments.total': newClaimCount, 'childrenCount.arguments.pending': newClaimCount });
    const newKnowledgeArtifacts = pack.wikitruth.artifacts.filter((artifact) => insertedKeys.has(artifact.key)).length;
    if (newKnowledgeArtifacts) await increment('arguments', mainClaim._id, { 'childrenCount.artifacts.total': newKnowledgeArtifacts, 'childrenCount.artifacts.pending': newKnowledgeArtifacts });
    if (insertedKeys.has(pack.wikitruth.openIssue.key)) await increment('arguments', mainClaim._id, { 'childrenCount.issues.total': 1, 'childrenCount.issues.pending': 1 });

    for (const artifact of knowledgeArtifacts) {
      if (!insertedKeys.has(artifact.extras.flagshipPilot.key)) continue;
      const linkId = deterministicId(`knowledge-evidence:${mainClaim._id}:${artifact._id}`);
      await collections.objectlinks.insertOne({
        _id: linkId, leftId: mainClaim._id, leftType: TYPE.argument,
        rightId: artifact._id, rightType: TYPE.artifact, relationship: 'evidence',
        private: false, ...actorFields(userId, now),
      });
      inserted.push({ collection: 'objectlinks', id: linkId });
    }
    if (claims[1] && insertedKeys.has(pack.wikitruth.claims[1].key)) {
      const linkId = deterministicId(`knowledge-qualification:${mainClaim._id}:${claims[1]._id}`);
      await collections.objectlinks.insertOne({
        _id: linkId, leftId: mainClaim._id, leftType: TYPE.argument,
        rightId: claims[1]._id, rightType: TYPE.argument, relationship: 'qualifies',
        private: false, ...actorFields(userId, now),
      });
      inserted.push({ collection: 'objectlinks', id: linkId });
    }
    for (const artifact of civicArtifacts) {
      if (!insertedKeys.has(artifact.extras.flagshipPilot.key)) continue;
      const linkId = deterministicId(`civic-evidence:${civicProject._id}:${artifact._id}`);
      await collections.civicentrylinks.insertOne({
        _id: linkId, tenantId: pack.fixph.tenantId, civicRecordId: civicProject._id,
        objectType: TYPE.artifact, objectName: 'artifact', objectId: artifact._id,
        relationship: 'evidence', createUserId: userId, createUsername: '', createDate: now,
      });
      inserted.push({ collection: 'civicentrylinks', id: linkId });
      await collections.civicrecords.updateOne({ _id: civicProject._id }, { $addToSet: { artifactIds: artifact._id } });
    }

    console.log(JSON.stringify({ ...summary, insertedMutableRecords: inserted.length }, null, 2));
  } catch (error) {
    for (const change of counterChanges.reverse()) {
      const inverse = Object.fromEntries(Object.entries(change.fields).map(([field, value]) => [field, -value]));
      await collections[change.collection].updateOne({ _id: change.id }, { $inc: inverse });
    }
    for (const item of inserted.reverse()) await collections[item.collection].deleteOne({ _id: item.id });
    throw error;
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(`Flagship publication failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
