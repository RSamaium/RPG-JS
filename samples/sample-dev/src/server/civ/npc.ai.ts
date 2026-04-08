import { H, updateHeuristics } from '../arelogic/heuristic.engine';
import { getReputation, getReputationLevel } from '../systems/reputation.system';
import { getWorldState } from '../systems/environment.system';
import { getFaction } from '../systems/faction.system';

export interface NPCGoal {
  id: string;
  title: string;
  progress: number;
  target: number;
  type: 'wealth' | 'power' | 'craft' | 'knowledge';
  completed: boolean;
}

const npcGoals: Map<string, NPCGoal> = new Map();

export function getNPCGoal(npcId: string): NPCGoal {
  if (!npcGoals.has(npcId)) {
    const types: NPCGoal['type'][] = ['wealth', 'power', 'craft', 'knowledge'];
    const type = types[Math.floor(Math.random() * types.length)];
    npcGoals.set(npcId, {
      id: `goal_${npcId}`,
      title: type === 'wealth' ? 'Accumulate Riches' : type === 'power' ? 'Rise in Rank' : type === 'craft' ? 'Forge a Masterpiece' : 'Uncover Ancient Secrets',
      progress: 0,
      target: 100,
      type,
      completed: false
    });
  }
  return npcGoals.get(npcId)!;
}

export function updateNPCGoal(npcId: string, delta: number) {
  const goal = getNPCGoal(npcId);
  if (goal.completed) return;
  
  goal.progress = Math.min(goal.target, goal.progress + delta);
  if (goal.progress >= goal.target) {
    goal.completed = true;
    // Goal completion affects world heuristics
    const E = new Array(13).fill(0);
    if (goal.type === 'wealth') E[2] += 0.2; // Economy
    if (goal.type === 'power') E[10] += 0.2; // Order
    if (goal.type === 'craft') E[1] += 0.2; // Resources/Production
    if (goal.type === 'knowledge') E[5] += 0.2; // Tech/Knowledge
    updateHeuristics(E);
  }
}

export function npcDecision(npc: any, playerReputation: number = 0) {
  const env = getWorldState();
  
  // Weather-based decisions
  if (env.weather === 'storm') return 'seek_shelter';
  if (env.weather === 'rain' && Math.random() > 0.5) return 'seek_shelter';
  
  // Geopolitical decisions
  if (H[8] > 0.8) return 'arm_self'; // High conflict
  if (H[11] > 0.8) return 'found_faction'; // High chaos
  
  // Personal goal progress (simulated)
  if (Math.random() > 0.9) {
    updateNPCGoal(npc.id || 'default_npc', 1);
  }
  
  // If player is hated, NPC might flee or call for help
  if (playerReputation <= -50) return 'flee';
  if (playerReputation <= -20) return 'avoid';
  
  // Normal logic
  if (H[0] < 0.3) return 'gather';
  if (H[11] > 0.7) return 'hide';
  if (H[1] > 0.5) return 'trade';
  return 'idle';
}

export function npcDialog(npc: any, playerId?: string, playerFaction?: string) {
  const env = getWorldState();
  // eslint-disable-next-line no-useless-assignment
  let reputation = 0;
  let level = 'Neutral';
  const npcId = npc.id || 'default_npc';
  
  if (playerId) {
    const rep = getReputation(playerId, npcId);
    reputation = rep.score;
    level = getReputationLevel(reputation);
  }

  // Faction awareness
  const factionGreeting = playerFaction ? `Greetings, member of ${playerFaction.toUpperCase()}. ` : "";
  const factionData = playerFaction ? getFaction(playerFaction) : null;
  
  // Personal Goal awareness
  const goal = getNPCGoal(npcId);
  const goalText = goal.completed ? `I have finally achieved my goal: ${goal.title}!` : `I am currently working on my goal: ${goal.title} (${Math.floor(goal.progress)}%).`;

  // War awareness
  if (factionData && factionData.enemies.length > 0) {
    const enemy = factionData.enemies[0];
    return `${factionGreeting}We are at war with ${enemy.toUpperCase()}! ${goalText}`;
  }

  // Weather-based dialog (High Priority)
  if (env.weather === 'storm') return `${factionGreeting}This storm is cursed! I must find shelter! ${goalText}`;
  if (env.weather === 'rain') return `${factionGreeting}The rain is good for the crops. ${goalText}`;

  // Reputation-based dialog
  if (level === 'Exalted') return `${factionGreeting}It is an honor, hero! ${goalText}`;
  if (level === 'Friendly') return `${factionGreeting}Good to see you, friend. ${goalText}`;
  if (level === 'Hated') return "Get away from me, monster!";
  if (level === 'Hostile') return "I don't like your kind.";

  // Geopolitical fallback
  if (H[8] > 0.8) return `${factionGreeting}I hear the drums of war. ${goalText}`;
  
  return `${factionGreeting}Welcome to our village. ${goalText}`;
}
