import { H } from '../arelogic/heuristic.engine';

export interface Quest {
  id: string;
  title: string;
  description: string;
  task: string;
  targetType: string;
  targetCount: number;
  currentCount: number;
  reward: number;
  completed: boolean;
  chainIndex?: number;
  nextQuestId?: string;
  worldImpact?: number[]; // Heuristic changes on completion
}

const QUEST_CHAINS: Record<string, any[]> = {
  'rebuild_village': [
    { title: 'Gathering Supplies', description: 'The village needs wood for the new granary.', task: 'Collect Wood', targetType: 'wood', targetCount: 10, reward: 200, impact: [0.1, 0, 0.05, 0, 0, 0, -0.1, 0, 0, 0, 0.05, 0, 0] },
    { title: 'Securing the Perimeter', description: 'Raiders are eyeing our new supplies.', task: 'Defeat Raiders', targetType: 'combat', targetCount: 5, reward: 400, impact: [0, 0, 0, 0, 0, 0, 0, 0, -0.1, 0, 0.1, 0, 0] },
    { title: 'Establishing Trade', description: 'Now we need to fill the granary with grain.', task: 'Complete a Trade', targetType: 'trade', targetCount: 3, reward: 600, impact: [0, 0, 0.1, 0.1, 0.1, 0, -0.2, 0, 0, 0, 0.1, 0, 0] }
  ],
  'chaos_rift': [
    { title: 'The First Tear', description: 'A rift has opened. Close it by defeating the shadows.', task: 'Defeat Shadows', targetType: 'combat', targetCount: 10, reward: 1000, impact: [0, 0, 0, 0, 0, 0, 0, 0, 0.1, 0, -0.2, 0, 0.2] }
  ]
};

export function generateQuest(chainId?: string, index: number = 0): Quest {
  const id = 'q_' + Math.random().toString(36).substr(2, 9);
  
  if (chainId && QUEST_CHAINS[chainId] && QUEST_CHAINS[chainId][index]) {
    const qData = QUEST_CHAINS[chainId][index];
    return {
      id,
      title: qData.title,
      description: qData.description,
      task: qData.task,
      targetType: qData.targetType,
      targetCount: qData.targetCount,
      currentCount: 0,
      reward: qData.reward,
      completed: false,
      chainIndex: index,
      nextQuestId: QUEST_CHAINS[chainId][index + 1] ? chainId : undefined,
      worldImpact: qData.impact
    };
  }

  // Dynamic Heuristic-driven quests (Fallback)
  if (H[0] < 0.3) {
    return { id, title: 'Resource Shortage', description: 'The village is running low on wood.', task: 'Collect Wood', targetType: 'wood', targetCount: 5, currentCount: 0, reward: 150, completed: false, worldImpact: [0.1, 0, 0, 0, 0, 0, -0.05, 0, 0, 0, 0.02, 0, 0] };
  }
  
  if (H[8] > 0.6) {
    return { id, title: 'Border Skirmish', description: 'Raiders are attacking the outskirts.', task: 'Defeat Raiders', targetType: 'combat', targetCount: 3, currentCount: 0, reward: 300, completed: false, worldImpact: [0, 0, 0, 0, 0, 0, 0, 0, -0.1, 0, 0.05, 0, 0] };
  }

  // Start a new chain if heuristics allow
  if (H[11] > 0.8) return generateQuest('chaos_rift', 0);
  if (H[2] < 0.4) return generateQuest('rebuild_village', 0);

  return { id, title: 'Daily Patrol', description: 'Keep the area safe by exploring the surroundings.', task: 'Explore the Map', targetType: 'move', targetCount: 20, currentCount: 0, reward: 100, completed: false };
}

export function generateLore(){
  if(H[10] > 0.7) return "The era of absolute order has begun. The law is absolute.";
  if(H[11] > 0.7) return "Chaos reigns in the outer lands. The old world is burning.";
  if(H[2] > 0.7) return "The markets are booming. Wealth flows like water.";
  if(H[6] > 0.7) return "Famine stalks the land. The people are hungry.";
  return "The world is in a fragile state of balance.";
}
