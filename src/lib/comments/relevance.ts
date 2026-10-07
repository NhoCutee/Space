/**
 * Pure utility for calculating deterministic relevance score for comments.
 * Score = (reactionsCount * 3) + (repliesCount * 2) + recencyBonus
 * Decay:
 * - Within 24 hours: +15 points
 * - Within 72 hours: +8 points
 * - Within 7 days:   +3 points
 * - Older:            0 points
 */
export function calculateCommentRelevance(comment: {
  reactionsCount: number;
  repliesCount?: number;
  createdAt: Date | string;
}): number {
  const ageHours = (Date.now() - new Date(comment.createdAt).getTime()) / (1000 * 60 * 60);
  let recencyBonus = 0;
  if (ageHours <= 24) {
    recencyBonus = 15;
  } else if (ageHours <= 72) {
    recencyBonus = 8;
  } else if (ageHours <= 168) {
    recencyBonus = 3;
  }

  const reactionsWeight = (comment.reactionsCount || 0) * 3;
  const repliesWeight = (comment.repliesCount || 0) * 2;

  return reactionsWeight + repliesWeight + recencyBonus;
}
