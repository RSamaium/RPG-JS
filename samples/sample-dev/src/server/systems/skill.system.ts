
export interface Skill {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  requiredAlignment: { heuristicIndex: number; value: number };
  bonus: (level: number) => any;
}

export interface PlayerAlignment {
  heuristics: number[]; // Accumulated influence on each heuristic
  unlockedSkills: string[];
}

const playerAlignments: Map<string, PlayerAlignment> = new Map();

const availableSkills: Skill[] = [
  {
    id: 'master_trader',
    name: 'Master Trader',
    description: 'Reduces market prices and increases reputation gain.',
    level: 0,
    maxLevel: 5,
    requiredAlignment: { heuristicIndex: 2, value: 10 }, // H2: Economy
    bonus: (level) => ({ priceReduction: level * 0.05, repGain: level * 0.1 })
  },
  {
    id: 'chaos_strike',
    name: 'Chaos Strike',
    description: 'Increases critical hit damage based on chaos alignment.',
    level: 0,
    maxLevel: 5,
    requiredAlignment: { heuristicIndex: 11, value: 15 }, // H11: Chaos
    bonus: (level) => ({ critMultiplier: 1.5 + (level * 0.2) })
  },
  {
    id: 'order_shield',
    name: 'Order Shield',
    description: 'Reduces incoming damage when order is high.',
    level: 0,
    maxLevel: 5,
    requiredAlignment: { heuristicIndex: 10, value: 12 }, // H10: Order
    bonus: (level) => ({ damageReduction: level * 0.04 })
  },
  {
    id: 'efficient_gatherer',
    name: 'Efficient Gatherer',
    description: 'Increases resources gained from harvesting.',
    level: 0,
    maxLevel: 5,
    requiredAlignment: { heuristicIndex: 1, value: 8 }, // H1: Production
    bonus: (level) => ({ resourceMultiplier: 1 + (level * 0.2) })
  }
];

export function getPlayerAlignment(playerId: string): PlayerAlignment {
  if (!playerAlignments.has(playerId)) {
    playerAlignments.set(playerId, {
      heuristics: new Array(13).fill(0),
      unlockedSkills: []
    });
  }
  return playerAlignments.get(playerId)!;
}

export function trackAlignment(playerId: string, E: number[]) {
  const alignment = getPlayerAlignment(playerId);
  E.forEach((val, index) => {
    if (val > 0) {
      alignment.heuristics[index] += val;
    }
  });
  
  // Check for skill unlocks
  availableSkills.forEach(skill => {
    if (!alignment.unlockedSkills.includes(skill.id)) {
      if (alignment.heuristics[skill.requiredAlignment.heuristicIndex] >= skill.requiredAlignment.value) {
        alignment.unlockedSkills.push(skill.id);
      }
    }
  });
}

export function getPlayerSkills(playerId: string) {
  const alignment = getPlayerAlignment(playerId);
  return availableSkills.filter(s => alignment.unlockedSkills.includes(s.id));
}

export function getSkillBonus(playerId: string, skillId: string) {
  const alignment = getPlayerAlignment(playerId);
  if (!alignment.unlockedSkills.includes(skillId)) return null;
  
  const skill = availableSkills.find(s => s.id === skillId);
  if (!skill) return null;
  
  // Level is determined by alignment strength
  const level = Math.min(skill.maxLevel, Math.floor(alignment.heuristics[skill.requiredAlignment.heuristicIndex] / skill.requiredAlignment.value));
  return skill.bonus(level);
}

export function getHeuristicSignature(playerId: string) {
  const alignment = getPlayerAlignment(playerId);
  const total = alignment.heuristics.reduce((a, b) => a + b, 0) || 1;
  return alignment.heuristics.map(h => (h / total) * 100);
}
