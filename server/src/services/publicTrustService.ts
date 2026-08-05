import appModForDb from '../app';
import constants from '../models/constants';

const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;

const ACCEPTED = constants.SCREENING_STATUS.status1.code;
const PENDING = constants.SCREENING_STATUS.status0.code;
const ARCHIVED = constants.SCREENING_STATUS.status3.code;
const PUBLIC_SCREENING_STATES = [PENDING, ACCEPTED, ARCHIVED];
const PUBLIC_CIVIC_STATES = ['draft', 'pending', 'active', 'verified', 'resolved', 'archived'];
const FINAL_FACTUAL_STATES = ['supported', 'refuted', 'mixed', 'insufficient_evidence'];
const FINAL_ETHICAL_STATES = ['permissible', 'impermissible', 'contested', 'not_applicable'];
const EVIDENCE_RELATIONSHIPS = ['evidence', 'source', 'supports', 'refutes', 'qualifies', 'background'];
const WINDOW_DAYS = 365;
const MINIMUM_COHORT = 5;
const CACHE_TTL_MS = 5 * 60 * 1000;

const CORE_TARGETS = [
  { modelName: 'Topic', objectName: 'topic', objectType: constants.OBJECT_TYPES.topic },
  { modelName: 'Argument', objectName: 'argument', objectType: constants.OBJECT_TYPES.argument },
  { modelName: 'Question', objectName: 'question', objectType: constants.OBJECT_TYPES.question },
  { modelName: 'Answer', objectName: 'answer', objectType: constants.OBJECT_TYPES.answer },
  { modelName: 'Issue', objectName: 'issue', objectType: constants.OBJECT_TYPES.issue },
  { modelName: 'Opinion', objectName: 'opinion', objectType: constants.OBJECT_TYPES.opinion },
  { modelName: 'Artifact', objectName: 'artifact', objectType: constants.OBJECT_TYPES.artifact },
] as const;

const VERDICT_TARGETS = CORE_TARGETS.filter((target) => ['Topic', 'Argument', 'Answer'].includes(target.modelName));
const PUBLIC_TARGETS = [
  ...CORE_TARGETS.map((target) => ({ ...target, kind: 'core' as const })),
  {
    modelName: 'CivicRecord', objectName: 'civicRecord',
    objectType: constants.OBJECT_TYPES.civicRecord, kind: 'civic' as const,
  },
];

export interface PublicTrustMetric {
  key: string;
  label: string;
  display: string;
  description: string;
  percent?: number;
  value?: number;
  numerator?: number;
  denominator?: number;
  suppressed: boolean;
  suppressionReason?: 'small_cohort' | 'no_data';
}

export interface PublicTrustDashboard {
  generatedAt: string;
  scope: {
    label: string;
    publicRecordsOnly: true;
    windowDays: number;
    minimumCohort: number;
    includesCivicRecords: true;
  };
  summary: {
    publicKnowledge: number;
    accepted: number;
    pending: number;
    archived: number;
  };
  quality: PublicTrustMetric[];
  lifecycle: Array<{ key: 'accepted' | 'pending' | 'archived'; label: string; value: number; description: string }>;
  governance: PublicTrustMetric[];
  privacy: {
    title: string;
    summary: string;
    exclusions: string[];
  };
  methodology: string[];
}

function roundedUtcDay(value: Date): string {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())).toISOString();
}

function percentMetric(input: {
  key: string;
  label: string;
  description: string;
  numerator: number;
  denominator: number;
}): PublicTrustMetric {
  if (input.denominator === 0) {
    return {
      key: input.key, label: input.label, description: input.description,
      display: 'Not enough public data', suppressed: true, suppressionReason: 'no_data',
    };
  }
  if (input.denominator < MINIMUM_COHORT) {
    return {
      key: input.key, label: input.label, description: input.description,
      display: 'Not shown', suppressed: true, suppressionReason: 'small_cohort',
    };
  }
  const percent = Math.round((input.numerator / input.denominator) * 100);
  return {
    ...input, percent, display: `${percent}%`, suppressed: false,
  };
}

function countMetric(input: {
  key: string;
  label: string;
  description: string;
  value: number;
  protectSmallCohort?: boolean;
  cohortSize?: number;
}): PublicTrustMetric {
  const cohortSize = input.cohortSize ?? input.value;
  if (input.protectSmallCohort && cohortSize < MINIMUM_COHORT) {
    return {
      key: input.key, label: input.label, description: input.description,
      display: input.value === 0 ? 'Not enough public data' : 'Not shown',
      suppressed: true,
      suppressionReason: input.value === 0 ? 'no_data' : 'small_cohort',
    };
  }
  return {
    key: input.key, label: input.label, description: input.description,
    value: input.value, display: input.value.toLocaleString('en-US'), suppressed: false,
  };
}

function publicCoreQuery(status?: number): Record<string, unknown> {
  return {
    private: { $ne: true },
    'screening.status': typeof status === 'number' ? status : { $in: PUBLIC_SCREENING_STATES },
  };
}

function finalVerdictCondition(): Record<string, unknown> {
  return {
    $or: [
      { 'verdicts.factual.status': { $in: FINAL_FACTUAL_STATES } },
      { 'verdicts.ethical.status': { $in: FINAL_ETHICAL_STATES } },
    ],
  };
}

async function sumCoreCounts(status: number): Promise<number> {
  const values = await Promise.all(CORE_TARGETS.map(async ({ modelName }) => (
    db[modelName]?.countDocuments ? db[modelName].countDocuments(publicCoreQuery(status)) : 0
  )));
  return values.reduce((sum, value) => sum + Number(value || 0), 0);
}

async function civicLifecycleCounts(): Promise<{ accepted: number; pending: number; archived: number }> {
  if (!db.CivicRecord?.countDocuments) return { accepted: 0, pending: 0, archived: 0 };
  const base = { private: { $ne: true } };
  const [accepted, pending, archived] = await Promise.all([
    db.CivicRecord.countDocuments({ ...base, status: { $in: ['active', 'verified', 'resolved'] } }),
    db.CivicRecord.countDocuments({ ...base, status: { $in: ['draft', 'pending'] } }),
    db.CivicRecord.countDocuments({ ...base, status: 'archived' }),
  ]);
  return { accepted: Number(accepted || 0), pending: Number(pending || 0), archived: Number(archived || 0) };
}

async function verdictMetrics(now: Date): Promise<{
  finalVerdicts: number;
  evidenceLinked: number;
  freshReviews: number;
  explanations: number;
  dissent: number;
}> {
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const metrics = await Promise.all(VERDICT_TARGETS.map(async (target) => {
    const model = db[target.modelName];
    if (!model?.countDocuments) return { finalVerdicts: 0, evidenceLinked: 0, freshReviews: 0, explanations: 0, dissent: 0 };
    const linkedIds = db.ObjectLink?.distinct
      ? await db.ObjectLink.distinct('leftId', {
        leftType: target.objectType,
        relationship: { $in: EVIDENCE_RELATIONSHIPS },
        private: { $ne: true },
      })
      : [];
    const accepted = publicCoreQuery(ACCEPTED);
    const final = finalVerdictCondition();
    const evidenceConditions: Array<Record<string, unknown>> = [
      { 'verdicts.factual.evidenceRefs.0': { $exists: true } },
      { 'verdicts.ethical.evidenceRefs.0': { $exists: true } },
    ];
    if (linkedIds.length) evidenceConditions.push({ _id: { $in: linkedIds } });
    const [finalVerdicts, evidenceLinked, freshReviews, explanations, dissent] = await Promise.all([
      model.countDocuments({ ...accepted, ...final }),
      model.countDocuments({ ...accepted, $and: [final, { $or: evidenceConditions }] }),
      model.countDocuments({
        ...accepted,
        $and: [final, { $or: [
          { 'verdicts.factual.revalidateAt': { $gt: now } },
          { 'verdicts.ethical.revalidateAt': { $gt: now } },
          { 'verdicts.factual.editDate': { $gte: windowStart } },
          { 'verdicts.ethical.editDate': { $gte: windowStart } },
        ] }],
      }),
      model.countDocuments({
        ...accepted,
        $and: [final, { $or: [
          { 'verdicts.factual.reasoning': { $type: 'string', $ne: '' } },
          { 'verdicts.ethical.reasoning': { $type: 'string', $ne: '' } },
        ] }],
      }),
      model.countDocuments({
        ...accepted,
        $and: [final, { $or: [
          { 'verdicts.factual.consensusSnapshot.dissent.totalVotes': { $gt: 0 } },
          { 'verdicts.ethical.consensusSnapshot.dissent.totalVotes': { $gt: 0 } },
        ] }],
      }),
    ]);
    return { finalVerdicts, evidenceLinked, freshReviews, explanations, dissent };
  }));
  return metrics.reduce((total, metric) => ({
    finalVerdicts: total.finalVerdicts + Number(metric.finalVerdicts || 0),
    evidenceLinked: total.evidenceLinked + Number(metric.evidenceLinked || 0),
    freshReviews: total.freshReviews + Number(metric.freshReviews || 0),
    explanations: total.explanations + Number(metric.explanations || 0),
    dissent: total.dissent + Number(metric.dissent || 0),
  }), { finalVerdicts: 0, evidenceLinked: 0, freshReviews: 0, explanations: 0, dissent: 0 });
}

function targetVisibilityMatch(target: typeof PUBLIC_TARGETS[number]): Record<string, unknown> {
  if (target.kind === 'civic') {
    return { 'target.private': { $ne: true }, 'target.status': { $in: PUBLIC_CIVIC_STATES } };
  }
  return {
    'target.private': { $ne: true },
    'target.screening.status': { $in: PUBLIC_SCREENING_STATES },
  };
}

function collectionName(modelName: string): string {
  return String(db[modelName]?.collection?.collectionName || `${modelName.toLowerCase()}s`);
}

async function publicAppealCounts(windowStart: Date): Promise<{ total: number; reviewed: number }> {
  if (!db.Appeal?.aggregate) return { total: 0, reviewed: 0 };
  const grouped = await Promise.all(PUBLIC_TARGETS.map(async (target) => {
    const rows = await db.Appeal.aggregate([
      { $match: { objectName: target.objectName, createDate: { $gte: windowStart } } },
      { $lookup: { from: collectionName(target.modelName), localField: 'objectId', foreignField: '_id', as: 'target' } },
      { $unwind: '$target' },
      { $match: targetVisibilityMatch(target) },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return rows as Array<{ _id: string; count: number }>;
  }));
  const rows = grouped.flat();
  return {
    total: rows.reduce((sum, row) => sum + Number(row.count || 0), 0),
    reviewed: rows.filter((row) => ['resolved', 'dismissed'].includes(row._id))
      .reduce((sum, row) => sum + Number(row.count || 0), 0),
  };
}

async function publicRevisionCount(windowStart: Date): Promise<number> {
  if (!db.EntryRevision?.aggregate) return 0;
  const grouped = await Promise.all(PUBLIC_TARGETS.map(async (target) => {
    const rows = await db.EntryRevision.aggregate([
      { $match: { objectType: target.objectType, createDate: { $gte: windowStart } } },
      { $lookup: { from: collectionName(target.modelName), localField: 'objectId', foreignField: '_id', as: 'target' } },
      { $unwind: '$target' },
      { $match: targetVisibilityMatch(target) },
      { $count: 'count' },
    ]);
    return Number(rows?.[0]?.count || 0);
  }));
  return grouped.reduce((sum, value) => sum + value, 0);
}

async function sourceHealthCounts(): Promise<{ total: number; healthy: number }> {
  if (!db.Artifact?.countDocuments) return { total: 0, healthy: 0 };
  const base = {
    ...publicCoreQuery(ACCEPTED),
    source: { $type: 'string', $ne: '' },
  };
  const [total, healthy] = await Promise.all([
    db.Artifact.countDocuments(base),
    db.Artifact.countDocuments({ ...base, 'provenance.sourceIntegrity.status': 'healthy' }),
  ]);
  return { total: Number(total || 0), healthy: Number(healthy || 0) };
}

export async function buildPublicTrustDashboard(now = new Date()): Promise<PublicTrustDashboard> {
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const [coreAccepted, corePending, coreArchived, civic, verdicts, sources, appeals, revisions] = await Promise.all([
    sumCoreCounts(ACCEPTED), sumCoreCounts(PENDING), sumCoreCounts(ARCHIVED),
    civicLifecycleCounts(), verdictMetrics(now), sourceHealthCounts(),
    publicAppealCounts(windowStart), publicRevisionCount(windowStart),
  ]);
  const accepted = coreAccepted + civic.accepted;
  const pending = corePending + civic.pending;
  const archived = coreArchived + civic.archived;

  return {
    generatedAt: roundedUtcDay(now),
    scope: {
      label: 'Public, non-private Wikitruth and Civic Core records',
      publicRecordsOnly: true,
      windowDays: WINDOW_DAYS,
      minimumCohort: MINIMUM_COHORT,
      includesCivicRecords: true,
    },
    summary: { publicKnowledge: accepted + pending + archived, accepted, pending, archived },
    quality: [
      percentMetric({
        key: 'evidence_linked_verdicts', label: 'Evidence-linked verdicts',
        description: 'Final public verdicts that cite accepted evidence or a public evidence relationship.',
        numerator: verdicts.evidenceLinked, denominator: verdicts.finalVerdicts,
      }),
      percentMetric({
        key: 'fresh_reviews', label: 'Fresh reviews',
        description: `Final public verdicts reviewed within ${WINDOW_DAYS} days or not yet due for revalidation.`,
        numerator: verdicts.freshReviews, denominator: verdicts.finalVerdicts,
      }),
      percentMetric({
        key: 'healthy_public_sources', label: 'Healthy public sources',
        description: 'Accepted public source artifacts whose latest integrity check is healthy.',
        numerator: sources.healthy, denominator: sources.total,
      }),
      percentMetric({
        key: 'resolved_appeals', label: 'Resolved appeals',
        description: `Public-target appeals opened in the last ${WINDOW_DAYS} days that were resolved or dismissed.`,
        numerator: appeals.reviewed, denominator: appeals.total,
      }),
    ],
    lifecycle: [
      { key: 'accepted', label: 'Accepted', value: accepted, description: 'Published knowledge that passed screening, plus active, verified, or resolved public civic records.' },
      { key: 'pending', label: 'Pending', value: pending, description: 'Public contributions and civic records still under review.' },
      { key: 'archived', label: 'Archived', value: archived, description: 'Historical or superseded public context retained for reference.' },
    ],
    governance: [
      countMetric({
        key: 'verdict_explanations', label: 'Verdict explanations published',
        description: 'Public entries with a final verdict and a plain-language reason.', value: verdicts.explanations,
      }),
      countMetric({
        key: 'material_dissent', label: 'Material dissent preserved',
        description: 'Public verdict records that retain one or more dissenting review votes.', value: verdicts.dissent,
      }),
      countMetric({
        key: 'appeals_reviewed', label: 'Appeals reviewed',
        description: `Resolved or dismissed appeals on public records during the last ${WINDOW_DAYS} days.`,
        value: appeals.reviewed, protectSmallCohort: true, cohortSize: appeals.total,
      }),
      countMetric({
        key: 'revisions_recorded', label: 'Revisions recorded',
        description: `Immutable revisions recorded for public records during the last ${WINDOW_DAYS} days.`,
        value: revisions, protectSmallCohort: true,
      }),
    ],
    privacy: {
      title: 'Private by design',
      summary: 'No identities, private records, or small-cohort activity are exposed.',
      exclusions: [
        'Names, usernames, emails, IP addresses, sessions, and account identifiers',
        'Private records, private tenant configuration, moderation notes, and raw operational events',
        `Numerators and denominators for cohorts smaller than ${MINIMUM_COHORT}`,
      ],
    },
    methodology: [
      'Counts use persisted public records only and exclude rejected and private core entries.',
      'Quality percentages use documented denominators and are hidden when the public cohort is too small.',
      `Appeal, review-freshness, and revision activity use a rolling ${WINDOW_DAYS}-day window and daily-rounded freshness.`,
      'Popularity, reactions, and rankings are intentionally excluded because they do not establish truth.',
    ],
  };
}

let cached: { expiresAt: number; promise: Promise<PublicTrustDashboard> } | null = null;

export function getCachedPublicTrustDashboard(): Promise<PublicTrustDashboard> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.promise;
  const promise = buildPublicTrustDashboard();
  cached = { expiresAt: now + CACHE_TTL_MS, promise };
  promise.catch(() => {
    if (cached?.promise === promise) cached = null;
  });
  return promise;
}

export function resetPublicTrustCacheForTests(): void {
  cached = null;
}
