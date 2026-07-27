import appModForDb from '../app';
import constants from '../models/constants';

const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;

const TARGETS: Record<string, { objectType: number; modelName: string }> = {
  topic: { objectType: constants.OBJECT_TYPES.topic, modelName: 'Topic' },
  argument: { objectType: constants.OBJECT_TYPES.argument, modelName: 'Argument' },
  answer: { objectType: constants.OBJECT_TYPES.answer, modelName: 'Answer' },
};

const CRITICAL_ISSUE_TYPES = [10, 20, 30, 40, 45];
const EVIDENCE_RELATIONSHIPS = ['evidence', 'source', 'supports', 'refutes', 'qualifies', 'background'];

export interface PublicTruthSummary {
  entry: { id: string; objectName: string; objectType: number; title: string; revisionId: string | null };
  channels: Array<Record<string, unknown>>;
  evidenceMap: Array<Record<string, unknown>>;
  unresolvedIssues: Array<Record<string, unknown>>;
  generatedAt: string;
}

function idOf(value: unknown): string {
  return String(value || '').trim();
}

function uniqueIds(values: unknown[]): string[] {
  return Array.from(new Set(values.map(idOf).filter((value) => /^[a-f\d]{24}$/i.test(value))));
}

export function resolveTruthSummaryTarget(objectName: string): { objectType: number; modelName: string } | null {
  return TARGETS[String(objectName || '').trim().toLowerCase()] || null;
}

export async function buildPublicTruthSummary(options: {
  objectName: string;
  objectId: string;
  includePending?: boolean;
}): Promise<PublicTruthSummary | null> {
  const target = resolveTruthSummaryTarget(options.objectName);
  if (!target || !/^[a-f\d]{24}$/i.test(options.objectId)) return null;
  const model = db[target.modelName];
  const entry = await model.findOne({ _id: options.objectId, private: { $ne: true } }).lean();
  if (!entry) return null;
  if (!options.includePending && Number(entry.screening?.status) !== constants.SCREENING_STATUS.status1.code) return null;

  const channels = ['factual', 'ethical'].map((channel) => {
    const value = entry.verdicts?.[channel] || {};
    const snapshot = value.consensusSnapshot || {};
    const revalidateAt = value.revalidateAt ? new Date(value.revalidateAt) : null;
    return {
      channel,
      status: String(value.status || 'pending'),
      reasoning: String(value.reasoning || ''),
      framework: channel === 'ethical' ? String(value.framework || '') : '',
      evidenceRefs: uniqueIds(Array.isArray(value.evidenceRefs) ? value.evidenceRefs : []),
      decisionMode: String(value.decisionMode || 'none'),
      administratorOverride: value.decisionMode === 'admin_override',
      overrideReason: value.decisionMode === 'admin_override' ? String(value.overrideReason || '') : '',
      policyVersion: String(value.policyVersion || snapshot.policyVersion || ''),
      sensitivity: String(value.sensitivity || snapshot.sensitivity || 'standard'),
      eligibleVotes: Number(snapshot.eligibleVotes || 0),
      leadingVotes: Number(snapshot.leadingCount || 0),
      averageConfidence: Number(snapshot.leadingAverageConfidence || 0),
      distinctAffiliations: Number(snapshot.distinctAffiliations || 0),
      dissent: snapshot.dissent || { totalVotes: 0, statuses: [], rationales: [], evidenceRefs: [] },
      decidedAt: value.editDate || null,
      revalidateAt: revalidateAt?.toISOString() || null,
      revalidationDue: Boolean(revalidateAt && revalidateAt.getTime() <= Date.now()),
    };
  });

  const directEvidenceIds = uniqueIds(channels.flatMap((channel) => channel.evidenceRefs as string[]));
  const graphLinks = db.ObjectLink?.find ? await db.ObjectLink.find({
    leftType: target.objectType,
    leftId: options.objectId,
    rightType: constants.OBJECT_TYPES.artifact,
    relationship: { $in: EVIDENCE_RELATIONSHIPS },
    private: { $ne: true },
  }).lean() : [];
  const graphEvidenceIds = uniqueIds(graphLinks.map((link: Record<string, unknown>) => link.rightId));
  const evidenceIds = uniqueIds([...directEvidenceIds, ...graphEvidenceIds]);
  const artifacts = evidenceIds.length ? await db.Artifact.find({
    _id: { $in: evidenceIds },
    private: { $ne: true },
    'screening.status': constants.SCREENING_STATUS.status1.code,
  }).select('_id title friendlyUrl artifactType source provenance').lean() : [];
  const artifactById = new Map<string, Record<string, unknown>>(
    artifacts.map((artifact: Record<string, unknown>) => [idOf(artifact._id), artifact]),
  );
  const evidenceMap = evidenceIds.map((artifactId) => {
    const artifact = artifactById.get(artifactId);
    const link = graphLinks.find((candidate: Record<string, unknown>) => idOf(candidate.rightId) === artifactId);
    return artifact ? {
      artifactId,
      title: String(artifact.title || 'Untitled evidence'),
      friendlyUrl: String(artifact.friendlyUrl || artifactId),
      artifactType: String(artifact.artifactType || 'other'),
      source: String(artifact.source || ''),
      provenance: artifact.provenance || {},
      relationship: String(link?.relationship || 'evidence'),
      citation: (link?.extras as Record<string, unknown> | undefined)?.citation || null,
    } : null;
  }).filter(Boolean) as Array<Record<string, unknown>>;

  const unresolvedIssues = await db.Issue.find({
    ownerType: target.objectType,
    ownerId: options.objectId,
    issueType: { $in: CRITICAL_ISSUE_TYPES },
    'screening.status': constants.SCREENING_STATUS.status1.code,
    'resolution.status': { $ne: 'resolved' },
    private: { $ne: true },
  }).select('_id title friendlyUrl issueType resolution.status editDate').sort({ editDate: -1 }).lean();
  const revision = db.EntryRevision?.findOne
    ? await db.EntryRevision.findOne({ objectType: target.objectType, objectId: options.objectId })
      .sort({ revisionNumber: -1 }).select('_id').lean()
    : null;

  return {
    entry: {
      id: idOf(entry._id),
      objectName: options.objectName,
      objectType: target.objectType,
      title: String(entry.title || ''),
      revisionId: revision ? idOf(revision._id) : null,
    },
    channels,
    evidenceMap,
    unresolvedIssues: unresolvedIssues.map((issue: Record<string, unknown>) => ({
      id: idOf(issue._id),
      title: String(issue.title || 'Critical issue'),
      friendlyUrl: String(issue.friendlyUrl || issue._id || ''),
      issueType: Number(issue.issueType || 0),
      status: String((issue.resolution as Record<string, unknown> | undefined)?.status || 'open'),
      editDate: issue.editDate || null,
    })),
    generatedAt: new Date().toISOString(),
  };
}
