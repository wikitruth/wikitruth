import constants from '../models/constants';

type HomeEntry = Record<string, unknown>;
type ReactionRow = { entryId?: unknown; objectType?: unknown; channel?: unknown; value?: unknown };
type RankingKey = 'latest' | 'trending' | 'top';
type RankingDb = {
  Reaction: {
    find: (query: Record<string, unknown>) => {
      select: (fields: string) => { lean: () => Promise<ReactionRow[]> };
    };
  };
};

const OBJECT_TYPE_BY_NAME: Record<string, number> = {
  topic: constants.OBJECT_TYPES.topic,
  argument: constants.OBJECT_TYPES.argument,
  question: constants.OBJECT_TYPES.question,
  answer: constants.OBJECT_TYPES.answer,
  issue: constants.OBJECT_TYPES.issue,
  opinion: constants.OBJECT_TYPES.opinion,
  artifact: constants.OBJECT_TYPES.artifact,
};

export const HOME_RANKING_FORMULAS = {
  latest: 'Most recently edited accepted public entries.',
  trending: 'Recent engagement divided by (age in hours + 2)^1.15. Engagement is reactions plus accepted responses.',
  top: 'Two points per positive reaction, minus one per negative reaction, plus 1.5 per accepted response.',
  disclaimer: 'Discovery ranking only. Scores never establish screening status, verdicts, or truth.',
};

function entryKey(entry: HomeEntry): string {
  const objectName = String(entry.objectName || '').toLowerCase();
  return `${OBJECT_TYPE_BY_NAME[objectName] || Number(entry.objectType || 0)}:${String(entry._id || '')}`;
}

function reactionKey(reaction: ReactionRow): string {
  return `${Number(reaction.objectType || 0)}:${String(reaction.entryId || '')}`;
}

function acceptedResponses(entry: HomeEntry): number {
  const children = (entry.childrenCount || {}) as Record<string, unknown>;
  return Object.values(children).reduce((sum: number, value: unknown) => {
    const accepted = Number((value as { accepted?: unknown } | undefined)?.accepted || 0);
    return sum + (Number.isFinite(accepted) ? accepted : 0);
  }, 0);
}

function dateValue(value: unknown): number {
  const parsed = new Date(String(value || 0)).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function rankHomeEntries(entries: HomeEntry[], reactions: ReactionRow[], now = new Date()): {
  formulas: typeof HOME_RANKING_FORMULAS;
  candidateCount: number;
  candidateWindow: string;
  buckets: Record<RankingKey, HomeEntry[]>;
} {
  const reactionStats = new Map<string, { positive: number; negative: number; total: number }>();
  reactions.forEach((reaction) => {
    const key = reactionKey(reaction);
    const stats = reactionStats.get(key) || { positive: 0, negative: 0, total: 0 };
    const value = String(reaction.value || '');
    if (['expose', 'upvote', 'good'].includes(value)) stats.positive += 1;
    if (['bury', 'downvote', 'bad'].includes(value)) stats.negative += 1;
    stats.total += 1;
    reactionStats.set(key, stats);
  });

  const scored = entries.map((entry) => {
    const stats = reactionStats.get(entryKey(entry)) || { positive: 0, negative: 0, total: 0 };
    const responses = acceptedResponses(entry);
    const editedAt = dateValue(entry.editDate || entry.createDate);
    const ageHours = Math.max((now.getTime() - editedAt) / 3_600_000, 0);
    const engagement = stats.total + responses;
    return {
      entry,
      editedAt,
      latest: editedAt,
      trending: (engagement + 1) / Math.pow(ageHours + 2, 1.15),
      top: (stats.positive * 2) - stats.negative + (responses * 1.5),
      stats: { ...stats, acceptedResponses: responses },
    };
  });

  const bucket = (key: RankingKey) => [...scored]
    .sort((a, b) => b[key] - a[key] || b.editedAt - a.editedAt)
    .slice(0, 12)
    .map((item) => ({
      ...item.entry,
      discoveryRanking: {
        bucket: key,
        score: key === 'latest' ? new Date(item.editedAt).toISOString() : Number(item[key].toFixed(4)),
        ...item.stats,
      },
    }));

  return {
    formulas: HOME_RANKING_FORMULAS,
    candidateCount: entries.length,
    candidateWindow: '20 most recently edited accepted public entries per content type',
    buckets: { latest: bucket('latest'), trending: bucket('trending'), top: bucket('top') },
  };
}

export async function loadHomeRankings(db: RankingDb, entries: HomeEntry[]): Promise<ReturnType<typeof rankHomeEntries>> {
  const entryIds = entries.map((entry) => entry._id).filter(Boolean);
  const reactions = entryIds.length
    ? await db.Reaction.find({ entryId: { $in: entryIds } }).select('entryId objectType channel value').lean()
    : [];
  return rankHomeEntries(entries, reactions);
}
