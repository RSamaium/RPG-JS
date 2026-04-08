import { getToplistEntries } from "./admin";
import { addVotePremium } from "./premium";

export interface VoteRecord {
  playerId: string;
  toplistId: string;
  votedAt: number;
}

const VOTE_COOLDOWN_MS = 12 * 60 * 60 * 1000;

const voteHistory: VoteRecord[] = [];

export function canVote(playerId: string, toplistId: string): boolean {
  const lastVote = voteHistory.find(
    (v) =>
      v.playerId === playerId &&
      v.toplistId === toplistId &&
      Date.now() - v.votedAt < VOTE_COOLDOWN_MS
  );
  return !lastVote;
}

export function recordVote(playerId: string, toplistId: string): {
  success: boolean;
  premiumStatus?: ReturnType<typeof addVotePremium>;
  error?: string;
} {
  const entries = getToplistEntries();
  const entry = entries.find((e) => e.id === toplistId);
  if (!entry) return { success: false, error: "Toplist entry not found" };

  if (!canVote(playerId, toplistId)) {
    return { success: false, error: "Vote cooldown active (12h between votes)" };
  }

  voteHistory.push({
    playerId,
    toplistId,
    votedAt: Date.now(),
  });

  const premiumStatus = addVotePremium(playerId);

  return { success: true, premiumStatus };
}

export function getVoteHistory(playerId: string): VoteRecord[] {
  return voteHistory.filter((v) => v.playerId === playerId);
}

export function getVoteCountForToplist(toplistId: string): number {
  return voteHistory.filter((v) => v.toplistId === toplistId).length;
}

export { VOTE_COOLDOWN_MS };
