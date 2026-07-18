import type { LegacyEntity } from '../types/legacy';

export function getTrustedRankingScore(entry: LegacyEntity, popularityScore: number): number {
  const screeningScore = Number(entry.screening?.status) === 1 ? 35 : 0;
  const sourceQuality = Math.max(0, Math.min(20, Number(entry.provenance?.sourceQuality?.total || 0)));
  const evidenceScore = sourceQuality * 1.5;
  const channels = [entry.verdicts?.factual, entry.verdicts?.ethical].filter(Boolean);
  const decisionScore = channels.reduce((score, verdict) => {
    if (!verdict || verdict.status === 'pending') return score;
    const provenance = verdict.decisionMode === 'consensus' ? 7.5 : verdict.decisionMode === 'admin_override' ? 2.5 : 0;
    const evidence = Array.isArray(verdict.evidenceRefs) && verdict.evidenceRefs.length ? 2.5 : 0;
    return score + provenance + evidence;
  }, 0);
  const acceptedIssues = Number(entry.childrenCount?.issues?.accepted || 0);
  const unresolvedIssuePenalty = Math.min(20, acceptedIssues * 5);
  const boundedReputation = Math.max(0, Math.min(10, Number(entry.authorReputationScore || 0) * 0.1));
  const boundedPopularity = Math.max(0, Math.min(5, Math.log2(Math.max(0, popularityScore) + 1)));
  return screeningScore + evidenceScore + decisionScore + boundedReputation + boundedPopularity - unresolvedIssuePenalty;
}
