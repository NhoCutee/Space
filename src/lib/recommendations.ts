/**
 * Explainable Scoring & Recommendation Engine for Spaces & Drops (MVP)
 * Non-opaque, deterministic heuristic ranking.
 */

export interface DropScoreInput {
  reactionsCount: number;
  commentsCount: number;
  savesCount: number;
  isCurated: boolean;
  createdAt: Date;
  isJoinedSpace: boolean;
  matchesUserInterest: boolean;
}

export interface ScoredDrop {
  score: number;
  reasonBadge: string;
}

export function calculateDropScore(input: DropScoreInput): ScoredDrop {
  const now = Date.now();
  const createdTime = new Date(input.createdAt).getTime();
  const hoursElapsed = Math.max(0, (now - createdTime) / (1000 * 60 * 60));

  // Weights
  let interestMultiplier = 1.0;
  let reasonBadge = 'Fresh in Network';

  if (input.isCurated) {
    reasonBadge = "Curator's Choice";
  } else if (input.isJoinedSpace) {
    interestMultiplier = 2.5;
    reasonBadge = 'From Your Spaces';
  } else if (input.matchesUserInterest) {
    interestMultiplier = 1.8;
    reasonBadge = 'Matches Your Interests';
  } else if (input.reactionsCount > 15 || input.savesCount > 5) {
    reasonBadge = 'Trending Now';
  }

  const rawEngagement =
    input.reactionsCount * 1.5 +
    input.commentsCount * 2.0 +
    input.savesCount * 3.0;

  const curatedBonus = input.isCurated ? 50 : 0;
  const timeDecay = Math.pow(hoursElapsed + 2, 1.2);

  const score = (interestMultiplier * rawEngagement + curatedBonus) / timeDecay;

  return {
    score,
    reasonBadge,
  };
}
