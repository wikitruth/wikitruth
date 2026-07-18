'use strict';

const mongoose = require('mongoose');

const FIXTURE_SOURCE = 'local-wikitruth-explore-parity-v1';
const BACKUP_COLLECTION = 'localexploreparitybackups';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

const CATEGORY_DEFINITIONS = [
  {
    title: 'Culture & Society',
    acceptedChildren: 13,
    children: ['Activism', 'Animal Welfare', 'Cult', 'Discrimination', 'Education'],
  },
  { title: 'Economics and Finance', acceptedChildren: 0, children: [] },
  {
    title: 'Health & Medicine',
    acceptedChildren: 33,
    children: ['Abortion', 'Addiction', 'Alternative medicine', 'Arthritis', 'Attention Deficit Hyperactivity Disorder'],
  },
  {
    title: 'History',
    acceptedChildren: 4,
    children: ['Adolf Hitler', 'Christopher Columbus', 'Muammar Gaddafi', 'World War II'],
  },
  {
    title: 'Life & Existence',
    acceptedChildren: 4,
    children: ['Death', 'Human Languages', 'Life', 'Universe'],
  },
  {
    title: 'Morality & Ethics',
    acceptedChildren: 20,
    children: ['Choosing the lesser evil option', 'Consent', 'Considerate', 'Freedom of speech', 'Greater Good'],
  },
  {
    title: 'Organizations',
    acceptedChildren: 13,
    children: ['CNN', 'Central Intelligence Agency (CIA)', 'Citibank', 'Coca-Cola', 'Facebook'],
  },
  {
    title: 'Philosophy & Religion',
    acceptedChildren: 3,
    children: ['Metaphysics', 'Philosophy', 'Religion'],
  },
  {
    title: 'Politics & Governance',
    acceptedChildren: 14,
    children: ['Blood diamond', 'Capital punishment', 'Capitalism', 'Communism', 'Genocide'],
  },
  {
    title: 'Science',
    acceptedChildren: 15,
    children: ['Accuracy and credibility of science', 'Aliens & Extraterrestrial life', 'Apollo 11', 'Big Bang Theory', 'Climate change'],
  },
  {
    title: 'Special Categories',
    acceptedChildren: 4,
    children: ['Debates & Discussions', 'Dictionary', 'Sacred Texts', 'Sources and Artifacts'],
  },
  {
    title: 'Technology',
    acceptedChildren: 13,
    children: ['Apple', 'Google', 'Microsoft', 'Oracle', 'Planned obsolescence'],
  },
  {
    title: 'World & Territories',
    acceptedChildren: 17,
    children: ['Australia', 'Chad', 'China', 'Cuba', 'Global Issues'],
  },
  {
    title: 'Worldview & Ideology',
    acceptedChildren: 14,
    children: ['Agnosticism', 'Atheism', 'Bahaism', 'Buddhism', 'Confucianism'],
  },
];

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
    throw new Error('Local Explore parity setup requires a valid MongoDB URI.');
  }
  if (parsed.protocol !== 'mongodb:' || !LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(`Refusing to modify non-local MongoDB host: ${parsed.hostname || 'unknown'}`);
  }
}

function fixtureObjectId(offset) {
  return new mongoose.Types.ObjectId(`eeeeeeeeeeeeeeee${offset.toString(16).padStart(8, '0')}`);
}

function friendlyUrl(title) {
  return title
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function baseTopic(now) {
  return {
    content: '',
    references: '',
    ownerId: null,
    ownerType: -1,
    private: false,
    screening: { status: 1, history: [] },
    createDate: now,
    editDate: now,
    extras: { fixtureSource: FIXTURE_SOURCE },
  };
}

function buildTaxonomy(now) {
  let childOffset = 0x100;
  const roots = [];
  const children = [];

  CATEGORY_DEFINITIONS.forEach((definition, categoryIndex) => {
    const rootId = fixtureObjectId(categoryIndex + 1);
    roots.push({
      ...baseTopic(now),
      _id: rootId,
      title: definition.title,
      friendlyUrl: friendlyUrl(definition.title),
      parentId: null,
      categoryId: null,
      childrenCount: {
        topics: {
          total: definition.acceptedChildren,
          accepted: definition.acceptedChildren,
          pending: 0,
          rejected: 0,
        },
      },
    });

    definition.children.forEach((title) => {
      children.push({
        ...baseTopic(now),
        _id: fixtureObjectId(childOffset),
        title,
        friendlyUrl: friendlyUrl(title),
        parentId: rootId,
        categoryId: rootId,
        childrenCount: {
          topics: { total: 0, accepted: 0, pending: 0, rejected: 0 },
        },
      });
      childOffset += 1;
    });
  });

  return { roots, children };
}

async function archiveExistingRootCategories(database) {
  const topics = database.collection('topics');
  const backups = database.collection(BACKUP_COLLECTION);
  const existingRoots = await topics.find({
    parentId: null,
    'screening.status': 1,
    'extras.fixtureSource': { $ne: FIXTURE_SOURCE },
  }, { projection: { _id: 1, 'screening.status': 1 } }).toArray();

  await Promise.all(existingRoots.map((topic) => backups.updateOne(
    { _id: topic._id },
    {
      $setOnInsert: {
        topicId: topic._id,
        previousScreeningStatus: topic.screening?.status ?? 1,
        fixtureSource: FIXTURE_SOURCE,
        archivedAt: new Date(),
      },
    },
    { upsert: true },
  )));

  if (existingRoots.length > 0) {
    await topics.updateMany(
      { _id: { $in: existingRoots.map((topic) => topic._id) } },
      {
        $set: {
          'screening.status': 3,
          'extras.localExploreParityHiddenBy': FIXTURE_SOURCE,
        },
      },
    );
  }
  return existingRoots.length;
}

async function seedFixtures(database) {
  const archivedRoots = await archiveExistingRootCategories(database);
  const taxonomy = buildTaxonomy(new Date());
  const topics = database.collection('topics');
  const documents = [...taxonomy.roots, ...taxonomy.children];

  await Promise.all(documents.map(({ _id, ...document }) => topics.updateOne(
    { _id },
    { $set: document, $setOnInsert: { _id } },
    { upsert: true },
  )));

  return {
    categoriesSeeded: taxonomy.roots.length,
    visibleChildrenSeeded: taxonomy.children.length,
    existingRootsArchived: archivedRoots,
  };
}

async function cleanFixtures(database) {
  const topics = database.collection('topics');
  const backups = database.collection(BACKUP_COLLECTION);
  const savedRoots = await backups.find({ fixtureSource: FIXTURE_SOURCE }).toArray();

  await Promise.all(savedRoots.map((backup) => topics.updateOne(
    { _id: backup.topicId },
    {
      $set: { 'screening.status': backup.previousScreeningStatus },
      $unset: { 'extras.localExploreParityHiddenBy': '' },
    },
  )));

  const [fixtures, backupResult] = await Promise.all([
    topics.deleteMany({ 'extras.fixtureSource': FIXTURE_SOURCE }),
    backups.deleteMany({ fixtureSource: FIXTURE_SOURCE }),
  ]);

  return {
    fixtureTopicsRemoved: fixtures.deletedCount,
    originalRootsRestored: savedRoots.length,
    backupsRemoved: backupResult.deletedCount,
  };
}

async function run({ clean = false } = {}) {
  const uri = mongoUri();
  assertLocalMongoUri(uri);
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DBNAME || undefined });
  try {
    const result = clean
      ? await cleanFixtures(mongoose.connection.db)
      : await seedFixtures(mongoose.connection.db);
    console.log(JSON.stringify({
      mode: clean ? 'clean' : 'seed',
      fixtureSource: FIXTURE_SOURCE,
      localUrl: '/explore',
      note: 'Restart the local Wikitruth process to clear its category cache.',
      ...result,
    }, null, 2));
    return result;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  run({ clean: process.argv.includes('--clean') }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

module.exports = {
  BACKUP_COLLECTION,
  CATEGORY_DEFINITIONS,
  FIXTURE_SOURCE,
  archiveExistingRootCategories,
  assertLocalMongoUri,
  buildTaxonomy,
  cleanFixtures,
  run,
  seedFixtures,
};
