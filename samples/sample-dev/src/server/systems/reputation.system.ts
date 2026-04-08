
export interface Reputation {
  score: number; // -100 to 100
  interactions: number;
  lastInteractionType: string;
}

export interface SocialLink {
  targetId: string;
  type: 'friend' | 'rival' | 'family';
  strength: number;
}

const playerReputations: Map<string, Map<string, Reputation>> = new Map();
const npcSocialGraph: Map<string, SocialLink[]> = new Map();

export function getReputation(playerId: string, npcId: string): Reputation {
  if (!playerReputations.has(playerId)) {
    playerReputations.set(playerId, new Map());
  }
  const npcMap = playerReputations.get(playerId)!;
  if (!npcMap.has(npcId)) {
    npcMap.set(npcId, { score: 0, interactions: 0, lastInteractionType: 'none' });
  }
  return npcMap.get(npcId)!;
}

export function addSocialLink(npcA: string, npcB: string, type: 'friend' | 'rival' | 'family', strength: number = 1) {
  if (!npcSocialGraph.has(npcA)) npcSocialGraph.set(npcA, []);
  if (!npcSocialGraph.has(npcB)) npcSocialGraph.set(npcB, []);
  
  npcSocialGraph.get(npcA)!.push({ targetId: npcB, type, strength });
  
  // Reciprocal link
  const reciprocalType = type === 'rival' ? 'rival' : type;
  npcSocialGraph.get(npcB)!.push({ targetId: npcA, type: reciprocalType, strength });
}

export function updateReputation(playerId: string, npcId: string, delta: number, type: string) {
  const rep = getReputation(playerId, npcId);
  rep.score = Math.max(-100, Math.min(100, rep.score + delta));
  rep.interactions++;
  rep.lastInteractionType = type;
  
  // Propagate to social graph
  const links = npcSocialGraph.get(npcId) || [];
  links.forEach(link => {
    const propagationDelta = link.type === 'rival' ? -delta * 0.5 : delta * 0.5;
    const linkedRep = getReputation(playerId, link.targetId);
    linkedRep.score = Math.max(-100, Math.min(100, linkedRep.score + (propagationDelta * link.strength)));
  });
}

export function getReputationLevel(score: number) {
  if (score >= 50) return 'Exalted';
  if (score >= 20) return 'Friendly';
  if (score <= -50) return 'Hated';
  if (score <= -20) return 'Hostile';
  return 'Neutral';
}

export function getSocialLinks(npcId: string) {
  return npcSocialGraph.get(npcId) || [];
}
