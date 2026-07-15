'use strict';

require('ts-node/register/transpile-only');
const mongoose = require('mongoose');
const { run: runCivicMigration } = require('../migrations/civic-core-tenancy');

const TENANT_ID = 'fixtheph';
const FIXTURE_SOURCE = 'local-fixph-qa-v1';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const LOCAL_KNOWLEDGE_ROOT_FRIENDLY_URL = 'republic-of-the-philippines';

function mongoUri() {
  return process.env.MONGOLAB_URI
    || process.env.MONGOHQ_URL
    || process.env.MONGODB_URI
    || 'mongodb://127.0.0.1:27017/wikitruth';
}

function assertLocalMongoUri(uri) {
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('Local FixPH setup requires a valid MongoDB URI.');
  }
  if (parsed.protocol !== 'mongodb:' || !LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(`Refusing to modify non-local MongoDB host: ${parsed.hostname || 'unknown'}`);
  }
}

function oid(value) {
  return new mongoose.Types.ObjectId(value);
}

function buildJurisdictions(now) {
  return [
    {
      _id: oid('00000000000000000000f101'), code: 'PH', countryCode: 'PH', levelKey: 'country',
      name: 'Philippines', friendlyUrl: 'philippines', parentId: null,
    },
    {
      _id: oid('00000000000000000000f102'), code: 'PH-00', countryCode: 'PH', levelKey: 'region',
      name: 'National Capital Region', friendlyUrl: 'national-capital-region',
      parentId: oid('00000000000000000000f101'),
    },
    {
      _id: oid('00000000000000000000f103'), code: 'PH-00-QC', countryCode: 'PH', levelKey: 'city',
      name: 'Quezon City', friendlyUrl: 'quezon-city',
      parentId: oid('00000000000000000000f102'),
    },
  ].map((item) => ({
    ...item,
    tenantId: TENANT_ID,
    metadata: { sourceSystem: FIXTURE_SOURCE },
    active: true,
    createDate: now,
    editDate: now,
  }));
}

function buildRecords(now) {
  const actorId = oid('00000000000000000000f001');
  const cityId = oid('00000000000000000000f103');
  const institutionId = oid('00000000000000000000f201');
  const officeId = oid('00000000000000000000f202');
  const personId = oid('00000000000000000000f203');
  const electionId = oid('00000000000000000000f208');
  const base = {
    tenantId: TENANT_ID,
    countryCode: 'PH',
    jurisdictionId: cityId,
    status: 'active',
    stage: 'in_progress',
    severity: 'info',
    private: false,
    sourceSystem: FIXTURE_SOURCE,
    createUserId: actorId,
    editUserId: actorId,
    createDate: now,
    editDate: now,
    location: { countryCode: 'PH', region: 'National Capital Region', city: 'Quezon City' },
    history: [{ action: 'created', summary: 'Created by the repeatable local FixPH QA setup.', date: now }],
  };

  return [
    {
      _id: institutionId, kind: 'institution', friendlyUrl: 'local-qa-public-works-department',
      title: '[Local QA] Public Works Department',
      summary: 'Test institution used to validate organization and responsibility views.',
    },
    {
      _id: officeId, kind: 'office', friendlyUrl: 'local-qa-infrastructure-delivery-office',
      title: '[Local QA] Infrastructure Delivery Office', parentId: institutionId,
      summary: 'Test office nested beneath a civic institution.',
    },
    {
      _id: personId, kind: 'person', friendlyUrl: 'local-qa-public-official',
      title: '[Local QA] Public Official', summary: 'Test public official with an assigned office.',
      responsibility: { institutionId, officeId, role: 'Program director', startDate: new Date('2025-01-15T00:00:00Z') },
    },
    {
      _id: oid('00000000000000000000f204'), kind: 'project', friendlyUrl: 'local-qa-community-learning-center',
      title: '[Local QA] Community Learning Center',
      summary: 'Test public project with budget, contractor, schedule, and progress data.',
      responsibility: { institutionId, officeId, personId, role: 'Implementing office' },
      project: { budget: 12500000, currency: 'PHP', contractor: 'Local QA Builders', contractReference: 'QA-2026-001', progressPercent: 64, startDate: new Date('2026-01-10T00:00:00Z'), targetEndDate: new Date('2026-12-15T00:00:00Z') },
    },
    {
      _id: oid('00000000000000000000f205'), kind: 'observation', friendlyUrl: 'local-qa-drainage-observation',
      title: '[Local QA] Blocked drainage observation',
      summary: 'Test citizen observation awaiting verification and follow-through.',
      stage: 'screening', severity: 'medium',
      observation: { observedAt: new Date('2026-07-12T02:30:00Z'), sourceUrl: 'https://example.test/local-fixph-evidence', escalationStatus: 'screening' },
    },
    {
      _id: oid('00000000000000000000f206'), kind: 'incident', friendlyUrl: 'local-qa-flooded-intersection',
      title: '[Local QA] Flooded public intersection',
      summary: 'Test urgent incident for overview, severity, and status presentation.',
      stage: 'investigating', severity: 'high',
    },
    {
      _id: oid('00000000000000000000f207'), kind: 'action', friendlyUrl: 'local-qa-clearing-and-inspection',
      title: '[Local QA] Drainage clearing and inspection',
      summary: 'Test public response connected to the responsible office.',
      responsibility: { institutionId, officeId, personId, role: 'Responsible team' },
      outcome: { summary: 'Work scheduled; completion evidence is pending.', happenedAt: new Date('2026-07-14T01:00:00Z') },
    },
    {
      _id: electionId, kind: 'election', friendlyUrl: 'local-qa-city-election-2028',
      title: '[Local QA] City Election 2028',
      summary: 'Test election container for candidate comparison flows.',
      election: { position: 'City Mayor', electionDate: new Date('2028-05-08T00:00:00Z'), jurisdiction: 'Quezon City' },
    },
    {
      _id: oid('00000000000000000000f209'), kind: 'candidate', friendlyUrl: 'local-qa-candidate',
      title: '[Local QA] Candidate Profile', parentId: electionId,
      summary: 'Test candidate with platform text and related election context.',
      election: { position: 'City Mayor', electionDate: new Date('2028-05-08T00:00:00Z'), jurisdiction: 'Quezon City', platform: 'Open procurement, reliable public services, and measurable delivery.' },
    },
    {
      _id: oid('00000000000000000000f20a'), kind: 'history', friendlyUrl: 'local-qa-project-public-memory',
      title: '[Local QA] Project public memory',
      summary: 'Test historical outcome that preserves long-term civic accountability.',
      status: 'verified', stage: 'resolved',
      outcome: { summary: 'Milestone documents were published for public review.', happenedAt: new Date('2026-06-30T08:00:00Z') },
      relatedRecordIds: [oid('00000000000000000000f204'), oid('00000000000000000000f207')],
    },
  ].map((record) => ({ ...base, ...record }));
}

async function cleanFixtures(database) {
  const [records, jurisdictions] = await Promise.all([
    database.collection('civicrecords').deleteMany({ tenantId: TENANT_ID, sourceSystem: FIXTURE_SOURCE }),
    database.collection('jurisdictions').deleteMany({ tenantId: TENANT_ID, 'metadata.sourceSystem': FIXTURE_SOURCE }),
  ]);
  return { recordsRemoved: records.deletedCount, jurisdictionsRemoved: jurisdictions.deletedCount };
}

async function seedFixtures(database) {
  const now = new Date();
  const jurisdictions = buildJurisdictions(now);
  const records = buildRecords(now);
  await Promise.all(jurisdictions.map(({ _id, ...document }) => database.collection('jurisdictions').updateOne(
    { _id }, { $set: document, $setOnInsert: { _id } }, { upsert: true },
  )));
  await Promise.all(records.map(({ _id, ...document }) => database.collection('civicrecords').updateOne(
    { _id }, { $set: document, $setOnInsert: { _id } }, { upsert: true },
  )));
  return { recordsSeeded: records.length, jurisdictionsSeeded: jurisdictions.length };
}

async function configureLocalTenantSite(database) {
  const root = await database.collection('topics').findOne(
    { friendlyUrl: LOCAL_KNOWLEDGE_ROOT_FRIENDLY_URL },
    { projection: { _id: 1, title: 1 } },
  );
  if (!root?._id) {
    throw new Error(`Local FixPH setup could not find topic: ${LOCAL_KNOWLEDGE_ROOT_FRIENDLY_URL}`);
  }
  await database.collection('civictenants').updateOne(
    { tenantId: TENANT_ID },
    { $set: { 'site.knowledgeRootTopicId': String(root._id), editDate: new Date() } },
  );
  return { knowledgeRootTopicId: String(root._id), knowledgeRootTitle: root.title };
}

async function run({ clean = false } = {}) {
  const uri = mongoUri();
  assertLocalMongoUri(uri);
  if (!clean) await runCivicMigration({ apply: true });

  await mongoose.connect(uri, { dbName: process.env.MONGODB_DBNAME || undefined });
  const site = clean ? {} : await configureLocalTenantSite(mongoose.connection.db);
  const result = clean
    ? await cleanFixtures(mongoose.connection.db)
    : { ...await seedFixtures(mongoose.connection.db), ...site };
  await mongoose.disconnect();
  console.log(JSON.stringify({
    mode: clean ? 'clean' : 'seed', tenantId: TENANT_ID, fixtureSource: FIXTURE_SOURCE, ...result,
    localUrl: '/civic',
  }, null, 2));
  return result;
}

if (require.main === module) {
  run({ clean: process.argv.includes('--clean') }).catch(async (error) => {
    console.error(error.message || error);
    await mongoose.disconnect().catch(() => undefined);
    process.exitCode = 1;
  });
}

module.exports = { assertLocalMongoUri, buildJurisdictions, buildRecords, configureLocalTenantSite, run };
