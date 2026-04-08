
export interface Faction {
  id: string;
  name: string;
  color: string;
  power: number;
  territory: string[]; // Array of chunk IDs
  enemies: string[];   // Factions at war with this one
}

const factions: Map<string, Faction> = new Map([
  ['order', { id: 'order', name: 'The Eternal Order', color: '#2196f3', power: 50, territory: [], enemies: ['chaos'] }],
  ['chaos', { id: 'chaos', name: 'Chaos Reavers', color: '#f44336', power: 50, territory: [], enemies: ['order'] }],
  ['trade', { id: 'trade', name: 'Merchant Guild', color: '#fbc02d', power: 50, territory: [], enemies: [] }]
]);

export function getFaction(id: string) {
  return factions.get(id);
}

export function getAllFactions() {
  return Array.from(factions.values());
}

export function createFaction(name: string, color: string, initialPower: number = 20) {
  const id = name.toLowerCase().replace(/\s+/g, '_');
  if (factions.has(id)) return null;
  
  const newFaction: Faction = {
    id,
    name,
    color,
    power: initialPower,
    territory: [],
    enemies: []
  };
  factions.set(id, newFaction);
  return newFaction;
}

export function declareWar(factionA: string, factionB: string) {
  const fA = factions.get(factionA);
  const fB = factions.get(factionB);
  if (fA && fB) {
    if (!fA.enemies.includes(factionB)) fA.enemies.push(factionB);
    if (!fB.enemies.includes(factionA)) fB.enemies.push(factionA);
    return true;
  }
  return false;
}

export function updateFactionPower(id: string, delta: number) {
  const faction = factions.get(id);
  if (faction) {
    faction.power = Math.max(0, faction.power + delta);
  }
}

export function claimTerritory(factionId: string, chunkId: string) {
  // Remove from other factions first
  factions.forEach(f => {
    f.territory = f.territory.filter(id => id !== chunkId);
  });
  
  const faction = factions.get(factionId);
  if (faction) {
    if (!faction.territory.includes(chunkId)) {
      faction.territory.push(chunkId);
    }
  }
}
