export const REPUTATION_FORMULA_VERSION = '2026-07-v1';

type Badge = { key: string; label: string; description: string };

export type ReputationCounts = {
  contributions: number;
  acceptedContributions: number;
  rejectedContributions: number;
  acceptedArtifacts: number;
  artifactReviews: number;
  verdictVotes: number;
  privilegedActions: number;
  acceptedChangeRequests: number;
  rejectedChangeRequests: number;
};

export type ReputationSnapshotValue = {
  userId: string;
  username: string;
  score: number;
  level: string;
  dimensions: { quality: number; participation: number; stewardship: number; evidence: number };
  counts: ReputationCounts;
  badges: Badge[];
  formulaVersion: string;
  calculatedAt: Date;
};

const CONTRIBUTION_MODELS = ['Topic', 'Argument', 'Question', 'Answer', 'Issue', 'Opinion', 'Artifact'] as const;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function reputationLevel(score: number): string {
  if (score >= 80) return 'Exemplary contributor';
  if (score >= 60) return 'Trusted contributor';
  if (score >= 40) return 'Established contributor';
  if (score >= 20) return 'Emerging contributor';
  return 'New contributor';
}

export function calculateReputationFromCounts(
  userId: string,
  username: string,
  counts: ReputationCounts,
  calculatedAt = new Date(),
): ReputationSnapshotValue {
  const reviewed = counts.acceptedContributions + counts.rejectedContributions;
  const activity = counts.contributions + counts.verdictVotes + counts.privilegedActions + counts.artifactReviews;
  const quality = activity === 0 ? 0 : clampScore(((counts.acceptedContributions + 2) / (reviewed + 4)) * 100);
  const participation = clampScore(Math.log2(counts.contributions + 1) * 18);
  const stewardship = clampScore(
    counts.verdictVotes * 4 + counts.privilegedActions * 5 + counts.acceptedChangeRequests * 8,
  );
  const evidence = clampScore(counts.acceptedArtifacts * 12 + counts.artifactReviews * 8);
  const score = activity === 0
    ? 0
    : clampScore(quality * 0.5 + participation * 0.25 + stewardship * 0.15 + evidence * 0.1);

  const badges: Badge[] = [];
  if (counts.contributions >= 1) {
    badges.push({ key: 'first-contribution', label: 'First Contribution', description: 'Published at least one contribution.' });
  }
  if (counts.contributions >= 25 && quality >= 70) {
    badges.push({ key: 'established-contributor', label: 'Established Contributor', description: 'At least 25 contributions with a strong review record.' });
  }
  if (counts.acceptedArtifacts >= 5) {
    badges.push({ key: 'evidence-builder', label: 'Evidence Builder', description: 'At least five accepted artifacts.' });
  }
  if (counts.verdictVotes >= 10) {
    badges.push({ key: 'consensus-builder', label: 'Consensus Builder', description: 'Participated in at least ten verdict reviews.' });
  }
  if (counts.acceptedChangeRequests >= 5) {
    badges.push({ key: 'revision-steward', label: 'Revision Steward', description: 'Authored at least five accepted change requests.' });
  }
  if (counts.privilegedActions >= 20 && score >= 60) {
    badges.push({ key: 'trusted-reviewer', label: 'Trusted Reviewer', description: 'Sustained, auditable moderation activity.' });
  }

  return {
    userId,
    username,
    score,
    level: reputationLevel(score),
    dimensions: { quality, participation, stewardship, evidence },
    counts,
    badges,
    formulaVersion: REPUTATION_FORMULA_VERSION,
    calculatedAt,
  };
}

async function count(model: any, query: Record<string, unknown>): Promise<number> {
  if (!model?.countDocuments) return 0;
  return Number(await model.countDocuments(query)) || 0;
}

export async function calculateReputation(db: Record<string, any>, user: { _id: unknown; username?: unknown }) {
  const userId = String(user._id || '');
  const username = String(user.username || '');
  const contributionQueries = CONTRIBUTION_MODELS.flatMap((modelName) => [
    count(db[modelName], { createUserId: userId }),
    count(db[modelName], { createUserId: userId, 'screening.status': 1 }),
    count(db[modelName], { createUserId: userId, 'screening.status': 2 }),
  ]);
  const [contributionValues, acceptedArtifacts, artifactReviews, verdictVotes, privilegedActions, acceptedChangeRequests, rejectedChangeRequests] = await Promise.all([
    Promise.all(contributionQueries),
    count(db.Artifact, { createUserId: userId, 'screening.status': 1 }),
    count(db.Artifact, { 'provenance.sourceQuality.reviewUserId': userId }),
    count(db.VerdictVote, { voterUserId: userId }),
    count(db.EntryEvent, { actorUserId: userId, scope: 'privileged' }),
    count(db.ChangeRequest, { createUserId: userId, status: { $in: ['accepted', 'partially_accepted'] } }),
    count(db.ChangeRequest, { createUserId: userId, status: 'rejected' }),
  ]);

  const totals = contributionValues.filter((_, index) => index % 3 === 0).reduce((sum, value) => sum + value, 0);
  const accepted = contributionValues.filter((_, index) => index % 3 === 1).reduce((sum, value) => sum + value, 0);
  const rejected = contributionValues.filter((_, index) => index % 3 === 2).reduce((sum, value) => sum + value, 0);

  return calculateReputationFromCounts(userId, username, {
    contributions: totals,
    acceptedContributions: accepted,
    rejectedContributions: rejected,
    acceptedArtifacts,
    artifactReviews,
    verdictVotes,
    privilegedActions,
    acceptedChangeRequests,
    rejectedChangeRequests,
  });
}

export async function getOrRefreshReputation(
  db: Record<string, any>,
  user: { _id: unknown; username?: unknown },
  options: { force?: boolean; maxAgeMs?: number } = {},
) {
  const maxAgeMs = options.maxAgeMs ?? 15 * 60 * 1000;
  const existing = await db.ReputationSnapshot.findOne({ userId: user._id }).lean();
  const existingDate = existing?.calculatedAt ? new Date(existing.calculatedAt).getTime() : 0;
  if (!options.force && existing && Date.now() - existingDate < maxAgeMs && existing.formulaVersion === REPUTATION_FORMULA_VERSION) {
    return existing;
  }

  const calculated = await calculateReputation(db, user);
  return db.ReputationSnapshot.findOneAndUpdate(
    { userId: user._id },
    { $set: calculated },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  ).lean();
}

export async function attachReputationSnapshots(db: Record<string, any>, users: Array<Record<string, any>>) {
  if (!users.length) return users;
  const snapshots = await db.ReputationSnapshot.find({ userId: { $in: users.map((user) => user._id) } }).lean();
  const byUserId = new Map<string, Record<string, any>>(
    snapshots.map((snapshot: Record<string, any>) => [String(snapshot.userId), snapshot]),
  );
  return users
    .map((user) => ({ ...user, reputation: byUserId.get(String(user._id)) || null }))
    .sort((left, right) => Number(right.reputation?.score || 0) - Number(left.reputation?.score || 0));
}

export async function attachAuthorReputation(db: Record<string, any>, model: Record<string, unknown>) {
  const buckets = ['topics', 'arguments', 'questions', 'answers', 'artifacts', 'issues', 'opinions'];
  const entries = buckets.flatMap((bucket) => Array.isArray(model[bucket]) ? model[bucket] as Array<Record<string, any>> : []);
  const userIds = Array.from(new Set(entries.map((entry) => String(entry.createUserId || '')).filter(Boolean)));
  if (!userIds.length) return;
  const snapshots = await db.ReputationSnapshot.find({ userId: { $in: userIds } }).select('userId score level').lean();
  const byUserId = new Map<string, Record<string, any>>(
    snapshots.map((snapshot: Record<string, any>) => [String(snapshot.userId), snapshot]),
  );
  entries.forEach((entry) => {
    const snapshot = byUserId.get(String(entry.createUserId || ''));
    entry.authorReputationScore = Number(snapshot?.score || 0);
    entry.authorReputationLevel = String(snapshot?.level || 'New contributor');
  });
}
