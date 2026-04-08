import { H } from '../arelogic/heuristic.engine';
import { getAllFactions } from '../systems/faction.system';

export interface Prophecy {
  category: string;
  text: string;
  severity: 'low' | 'medium' | 'high';
}

export function interpretHeuristics(): Prophecy[] {
  const prophecies: Prophecy[] = [];
  const factions = getAllFactions();

  // Faction Wars
  const warringFactions = factions.filter(f => f.enemies.length > 0);
  if (warringFactions.length > 0) {
    prophecies.push({
      category: 'Diplomacy',
      text: `The banners of ${warringFactions[0].name} and ${warringFactions[0].enemies[0].toUpperCase()} clash in the fields.`,
      severity: 'high'
    });
  }

  // H0: Production / Resources
  if (H[0] < 0.3) {
    prophecies.push({
      category: 'Economy',
      text: 'The earth yields little. A great scarcity of wood and stone is upon us.',
      severity: 'high'
    });
  } else if (H[0] > 0.8) {
    prophecies.push({
      category: 'Economy',
      text: 'The storehouses overflow. It is a golden age of production.',
      severity: 'low'
    });
  }

  // H2: Economy / Market
  if (H[2] > 0.7 && H[3] < 0.4) {
    prophecies.push({
      category: 'Trade',
      text: 'Wealth is concentrated in few hands. The common market is stagnant.',
      severity: 'medium'
    });
  }

  // H6: Hunger / Famine
  if (H[6] > 0.6) {
    prophecies.push({
      category: 'Survival',
      text: 'I see hollow eyes and empty plates. Famine stalks the eastern villages.',
      severity: 'high'
    });
  }

  // H8: Conflict / War
  if (H[8] > 0.7) {
    prophecies.push({
      category: 'War',
      text: 'The drums of war beat louder. Factions are sharpening their blades.',
      severity: 'high'
    });
  }

  // H11: Chaos / New Factions
  if (H[11] > 0.8) {
    prophecies.push({
      category: 'Geopolitics',
      text: 'New powers rise from the shadows. The old order is crumbling.',
      severity: 'high'
    });
  }

  // H10: Order / Law
  if (H[10] > 0.8) {
    prophecies.push({
      category: 'Society',
      text: 'The law is absolute. Even the shadows fear the light of order.',
      severity: 'low'
    });
  } else if (H[10] < 0.3) {
    prophecies.push({
      category: 'Society',
      text: 'The fabric of society is fraying. Anarchy whispers in the dark.',
      severity: 'medium'
    });
  }

  // H11: Chaos
  if (H[11] > 0.6) {
    prophecies.push({
      category: 'Mystic',
      text: 'The veil is thin. Chaos leaks into our reality, twisting the familiar.',
      severity: 'high'
    });
  }

  // Default if nothing special is happening
  if (prophecies.length === 0) {
    prophecies.push({
      category: 'General',
      text: 'The threads of fate are calm. The world breathes in quiet balance.',
      severity: 'low'
    });
  }

  return prophecies;
}
