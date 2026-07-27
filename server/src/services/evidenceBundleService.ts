import appModForDb from '../app';
import constants from '../models/constants';
import { buildPublicTruthSummary, resolveTruthSummaryTarget } from './truthSummaryService';

type EvidenceQuery = {
  select: (fields: string) => EvidenceQuery;
  sort: (sort: Record<string, number>) => EvidenceQuery;
  lean: () => Promise<unknown>;
};
type EvidenceModel = {
  find: (query: Record<string, unknown>) => EvidenceQuery;
  findOne: (query: Record<string, unknown>) => EvidenceQuery;
};
const db = (appModForDb as unknown as { db: { models: Record<string, EvidenceModel | undefined> } }).db.models;

const ENTRY_TYPES: Record<string, { objectType: number; modelName: string; route: string }> = {
  topic: { objectType: constants.OBJECT_TYPES.topic, modelName: 'Topic', route: 'topics' },
  argument: { objectType: constants.OBJECT_TYPES.argument, modelName: 'Argument', route: 'arguments' },
  question: { objectType: constants.OBJECT_TYPES.question, modelName: 'Question', route: 'questions' },
  answer: { objectType: constants.OBJECT_TYPES.answer, modelName: 'Answer', route: 'answers' },
  artifact: { objectType: constants.OBJECT_TYPES.artifact, modelName: 'Artifact', route: 'artifacts' },
  issue: { objectType: constants.OBJECT_TYPES.issue, modelName: 'Issue', route: 'issues' },
  opinion: { objectType: constants.OBJECT_TYPES.opinion, modelName: 'Opinion', route: 'opinions' },
};
const NAME_BY_TYPE = new Map(Object.entries(ENTRY_TYPES).map(([name, config]) => [config.objectType, name]));

export interface PublicEvidenceBundle {
  schemaVersion: '1.0';
  generatedAt: string;
  canonicalUrl: string;
  entry: Record<string, unknown>;
  revision: Record<string, unknown> | null;
  truthSummary: Awaited<ReturnType<typeof buildPublicTruthSummary>>;
  relationships: Array<Record<string, unknown>>;
  translations: Array<Record<string, unknown>>;
}

function idOf(value: unknown): string { return String(value || '').trim(); }

function entryType(objectName: string): { objectType: number; modelName: string; route: string } {
  const config = ENTRY_TYPES[objectName];
  if (!config) throw new Error(`Unsupported evidence bundle object type: ${objectName}`);
  return config;
}

function model(name: string): EvidenceModel {
  const value = db[name];
  if (!value) throw new Error(`Evidence bundle model is unavailable: ${name}`);
  return value;
}

function entryPath(objectName: string, entry: Record<string, unknown>): string {
  const type = entryType(objectName);
  const friendlyUrl = String(entry.friendlyUrl || entry._id || 'entry');
  return `/${type.route}/entry/${encodeURIComponent(friendlyUrl)}/${encodeURIComponent(idOf(entry._id))}`;
}

function publicEntry(entry: Record<string, unknown>, objectName: string): Record<string, unknown> {
  return {
    id: idOf(entry._id), objectName, objectType: entryType(objectName).objectType,
    title: String(entry.title || ''), content: String(entry.content || ''),
    contentPreview: String(entry.contentPreview || ''), friendlyUrl: String(entry.friendlyUrl || ''),
    path: entryPath(objectName, entry), createDate: entry.createDate || null,
    editDate: entry.editDate || null, referenceDate: entry.referenceDate || null,
    tags: Array.isArray(entry.tags) ? entry.tags : [],
  };
}

async function publicLinkedTargets(links: Array<Record<string, unknown>>, sourceType: number, sourceId: string) {
  const refs = links.map((link) => {
    const sourceOnLeft = Number(link.leftType) === sourceType && idOf(link.leftId) === sourceId;
    return {
      link, direction: sourceOnLeft ? 'outgoing' : 'incoming',
      objectType: Number(sourceOnLeft ? link.rightType : link.leftType),
      objectId: idOf(sourceOnLeft ? link.rightId : link.leftId),
    };
  }).filter((ref) => NAME_BY_TYPE.has(ref.objectType) && ref.objectId);

  const targets = new Map<string, Record<string, unknown>>();
  await Promise.all(Array.from(new Set(refs.map((ref) => ref.objectType))).map(async (objectType) => {
    const objectName = NAME_BY_TYPE.get(objectType)!;
    const ids = refs.filter((ref) => ref.objectType === objectType).map((ref) => ref.objectId);
    const records = await model(entryType(objectName).modelName).find({
      _id: { $in: ids }, private: { $ne: true },
      'screening.status': constants.SCREENING_STATUS.status1.code,
    }).select('_id title friendlyUrl artifactType source provenance editDate').lean() as Array<Record<string, unknown>>;
    records.forEach((record: Record<string, unknown>) => targets.set(`${objectType}:${idOf(record._id)}`, record));
  }));

  return refs.flatMap((ref) => {
    const target = targets.get(`${ref.objectType}:${ref.objectId}`);
    if (!target) return [];
    const objectName = NAME_BY_TYPE.get(ref.objectType)!;
    const extras = ref.link.extras as Record<string, unknown> | undefined;
    return [{
      relationship: String(ref.link.relationship || 'related'), direction: ref.direction,
      citation: extras?.citation || null,
      target: {
        id: ref.objectId, objectName, objectType: ref.objectType,
        title: String(target.title || ''), friendlyUrl: String(target.friendlyUrl || ''),
        path: entryPath(objectName, target),
        ...(objectName === 'artifact' ? {
          artifactType: String(target.artifactType || 'other'), source: String(target.source || ''),
          provenance: target.provenance || {},
        } : {}),
      },
    }];
  });
}

export async function buildPublicEvidenceBundle(options: {
  objectName: string; objectId: string; origin: string;
}): Promise<PublicEvidenceBundle | null> {
  const objectName = String(options.objectName || '').trim().toLowerCase();
  const config = ENTRY_TYPES[objectName];
  if (!config || !/^[a-f\d]{24}$/i.test(options.objectId)) return null;
  const entry = await model(config.modelName).findOne({
    _id: options.objectId, private: { $ne: true },
    'screening.status': constants.SCREENING_STATUS.status1.code,
  }).lean() as Record<string, unknown> | null;
  if (!entry) return null;

  const [revision, links, translations, truthSummary] = await Promise.all([
    db.EntryRevision?.findOne
      ? db.EntryRevision.findOne({ objectType: config.objectType, objectId: options.objectId })
        .sort({ revisionNumber: -1 })
        .select('_id revisionNumber parentRevisionId source summary snapshotHash changedFields createDate')
        .lean() as Promise<Record<string, unknown> | null>
      : null,
    db.ObjectLink?.find
      ? db.ObjectLink.find({
        $or: [
          { leftType: config.objectType, leftId: options.objectId },
          { rightType: config.objectType, rightId: options.objectId },
        ],
        private: { $ne: true },
      }).select('leftId leftType rightId rightType relationship extras').lean() as Promise<Array<Record<string, unknown>>>
      : [],
    db.EntryTranslation?.find
      ? db.EntryTranslation.find({ objectType: config.objectType, objectId: options.objectId, status: 'published' })
        .select('locale title content contentPreview sourceRevisionId sourceRevisionNumber reviewUsername reviewDate')
        .sort({ locale: 1 }).lean() as Promise<Array<Record<string, unknown>>>
      : [],
    resolveTruthSummaryTarget(objectName)
      ? buildPublicTruthSummary({ objectName, objectId: options.objectId })
      : null,
  ]);
  const relationships = await publicLinkedTargets(links, config.objectType, options.objectId);
  const canonicalPath = entryPath(objectName, entry);
  const origin = options.origin.replace(/\/$/, '');

  return {
    schemaVersion: '1.0', generatedAt: new Date().toISOString(), canonicalUrl: `${origin}${canonicalPath}`,
    entry: publicEntry(entry, objectName),
    revision: revision ? {
      id: idOf(revision._id), number: Number(revision.revisionNumber || 0),
      parentRevisionId: revision.parentRevisionId ? idOf(revision.parentRevisionId) : null,
      source: String(revision.source || ''), summary: String(revision.summary || ''),
      snapshotHash: String(revision.snapshotHash || ''),
      changedFields: Array.isArray(revision.changedFields) ? revision.changedFields : [],
      createDate: revision.createDate || null,
    } : null,
    truthSummary, relationships,
    translations: translations
      .filter((translation: Record<string, unknown>) => !revision || idOf(translation.sourceRevisionId) === idOf(revision._id))
      .map((translation: Record<string, unknown>) => ({
        locale: String(translation.locale || ''), title: String(translation.title || ''),
        content: String(translation.content || ''), contentPreview: String(translation.contentPreview || ''),
        sourceRevisionId: idOf(translation.sourceRevisionId),
        sourceRevisionNumber: Number(translation.sourceRevisionNumber || 0),
        reviewUsername: String(translation.reviewUsername || ''), reviewDate: translation.reviewDate || null,
      })),
  };
}

export function evidenceBundleJsonLd(bundle: PublicEvidenceBundle): Record<string, unknown> {
  const entry = bundle.entry;
  const evidence = bundle.relationships
    .filter((link) => ['supports', 'refutes', 'qualifies', 'background', 'evidence', 'source'].includes(String(link.relationship)))
    .map((link) => link.target);
  return {
    '@context': {
      '@vocab': 'https://schema.org/', prov: 'http://www.w3.org/ns/prov#', wt: 'https://wikitruth.net/ns#',
    },
    '@id': bundle.canonicalUrl,
    '@type': ['topic', 'argument', 'answer'].includes(String(entry.objectName)) ? 'Claim' : 'CreativeWork',
    identifier: `${entry.objectName}:${entry.id}`, headline: entry.title, text: entry.content,
    dateCreated: entry.createDate, dateModified: entry.editDate,
    version: bundle.revision?.number || null, 'prov:valueHash': bundle.revision?.snapshotHash || null,
    citation: evidence,
    translationOfWork: bundle.translations.map((translation) => ({
      '@type': 'CreativeWork', inLanguage: translation.locale, headline: translation.title, text: translation.content,
    })),
    review: bundle.truthSummary?.channels || [],
    'wt:unresolvedIssue': bundle.truthSummary?.unresolvedIssues || [],
    'wt:relationship': bundle.relationships,
    datePublished: bundle.generatedAt,
  };
}
