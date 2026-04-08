
export interface WorldStructure {
  id: string;
  type: 'outpost' | 'barricade' | 'shrine' | 'tradepost';
  name: string;
  chunkId: string;
  health: number;
  maxHealth: number;
  factionId: string;
  impact: number[]; // E-vector impact per tick
}

const structures: WorldStructure[] = [];

export function createStructure(type: WorldStructure['type'], chunkId: string, factionId: string): WorldStructure {
  const id = `struct_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  let name = '';
  let health = 100;
  const impact = new Array(13).fill(0);

  switch (type) {
    case 'outpost':
      name = 'Order Outpost';
      health = 500;
      impact[9] = 0.05; // Order
      impact[8] = -0.02; // Reduces conflict
      break;
    case 'barricade':
      name = 'War Barricade';
      health = 300;
      impact[8] = 0.1; // Conflict
      impact[11] = 0.05; // Chaos
      break;
    case 'shrine':
      name = 'Mystic Shrine';
      health = 200;
      impact[12] = 0.1; // Mysticism
      impact[10] = 0.05; // Rebirth
      break;
    case 'tradepost':
      name = 'Trade Station';
      health = 400;
      impact[3] = 0.1; // Market
      impact[4] = 0.05; // Trade
      break;
  }

  const newStruct: WorldStructure = {
    id,
    type,
    name,
    chunkId,
    health,
    maxHealth: health,
    factionId,
    impact
  };

  structures.push(newStruct);
  return newStruct;
}

export function damageStructure(id: string, amount: number): boolean {
  const index = structures.findIndex(s => s.id === id);
  if (index === -1) return false;

  structures[index].health -= amount;
  if (structures[index].health <= 0) {
    structures.splice(index, 1);
    return true; // Destroyed
  }
  return false; // Still standing
}

export function getStructuresInChunk(chunkId: string): WorldStructure[] {
  return structures.filter(s => s.chunkId === chunkId);
}

export function getAllStructures(): WorldStructure[] {
  return structures;
}

export function getGlobalStructureImpact(): number[] {
  const totalImpact = new Array(13).fill(0);
  structures.forEach(s => {
    for (let i = 0; i < 13; i++) {
      totalImpact[i] += s.impact[i];
    }
  });
  return totalImpact;
}
