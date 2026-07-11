import type { LegacyEntity } from '../types/legacy';

export function getTrustedRankingScore(entry: LegacyEntity, popularityScore: number): number {
  const screeningBoost = Number(entry.screening?.status) === 1 ? 10 : 0;
  return Number(entry.authorReputationScore || 0) + screeningBoost + popularityScore * 0.1;
}
