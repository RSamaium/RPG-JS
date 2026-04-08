import { H, updateHeuristics } from '../arelogic/heuristic.engine';

export interface Dungeon {
  id: string;
  name: string;
  difficulty: number;
  cleared: boolean;
  monsters: number;
  loot: string[];
}

const activeDungeons: Map<string, Dungeon> = new Map();

export function createRuinDungeon(civId: string): Dungeon {
  const dungeon: Dungeon = {
    id: 'dungeon_' + civId,
    name: 'Ruins of ' + civId,
    difficulty: Math.floor(H[8] * 10) + 1, // H8 (Conflict) influences difficulty
    cleared: false,
    monsters: 10 + Math.floor(H[6] * 5), // H6 (Hunger/Famine) influences monster count
    loot: ['ancient_relic', 'gold_coin', 'rusty_sword']
  };
  activeDungeons.set(dungeon.id, dungeon);
  return dungeon;
}

export function clearDungeon(dungeonId: string) {
  const dungeon = activeDungeons.get(dungeonId);
  if (dungeon && !dungeon.cleared) {
    dungeon.cleared = true;
    // Clearing a dungeon improves H10 (Order) and H1 (Resources)
    const E = new Array(13).fill(0);
    E[10] += 0.2;
    E[1] += 0.1;
    updateHeuristics(E);
    return true;
  }
  return false;
}

export function getDungeon(id: string) {
  return activeDungeons.get(id);
}

export function getAllDungeons() {
  return Array.from(activeDungeons.values());
}
