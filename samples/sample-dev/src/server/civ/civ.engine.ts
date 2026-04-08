import { H, updateHeuristics } from '../arelogic/heuristic.engine';
import { Graph } from '../arelogic/graph.engine';
import { createRuinDungeon } from '../systems/dungeon.system';
import { createFaction, declareWar, getAllFactions } from '../systems/faction.system';
import { addSocialLink } from '../systems/reputation.system';
import { updateNPCGoal } from './npc.ai';
import { createStructure, getAllStructures, damageStructure, getGlobalStructureImpact } from '../systems/structure.system';

const graph = new Graph();
const activeCivs: string[] = [];

export function civTick(){
  const E = new Array(13).fill(0);
  
  // Apply global structure impact
  const structImpact = getGlobalStructureImpact();
  for (let i = 0; i < 13; i++) {
    E[i] += structImpact[i];
  }

  // NPCs build structures based on heuristics
  if (H[9] > 0.7 && Math.random() > 0.98) {
    createStructure('outpost', `chunk_${Math.floor(Math.random() * 10)}`, 'order');
  }
  if (H[8] > 0.7 && Math.random() > 0.98) {
    createStructure('barricade', `chunk_${Math.floor(Math.random() * 10)}`, 'chaos');
  }
  if (H[3] > 0.7 && Math.random() > 0.98) {
    createStructure('tradepost', `chunk_${Math.floor(Math.random() * 10)}`, 'neutral');
  }

  // Chaos (H11) damages structures
  if (H[11] > 0.6) {
    const structs = getAllStructures();
    structs.forEach(s => {
      if (Math.random() < H[11] * 0.1) {
        damageStructure(s.id, 10);
      }
    });
  }

  // Growth logic
  if(H[0] > 0.5){
    E[1] += 0.1;
    const id = 'civ_'+Date.now();
    graph.addNode({id, type:'farm'});
    activeCivs.push(id);
    
    // Create some social links for new civ members
    if (activeCivs.length > 1) {
      addSocialLink(id, activeCivs[activeCivs.length - 2], Math.random() > 0.8 ? 'rival' : 'friend');
    }
  }
  
  // Update NPC goals for all active civs
  activeCivs.forEach(civId => {
    if (Math.random() > 0.7) {
      updateNPCGoal(civId, 1);
    }
  });
  
  if(H[1] > 0.5){
    E[2] += 0.1;
    const id = 'civ_'+Date.now();
    graph.addNode({id, type:'market'});
    activeCivs.push(id);
  }
  
  // Geopolitical Logic: Faction Creation
  // If Chaos (H11) is high and Resources (H1) are available, a new faction might rise
  if (H[11] > 0.8 && H[1] > 0.3 && Math.random() > 0.95) {
    const factionNames = ['Shadow Syndicate', 'Iron Vanguard', 'The Lost Tribes', 'Crimson Hand'];
    const name = factionNames[Math.floor(Math.random() * factionNames.length)];
    const color = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    const newFaction = createFaction(name, color);
    if (newFaction) {
      E[11] += 0.2; // New faction causes initial chaos
      E[8] += 0.1;  // Potential conflict
    }
  }

  // Geopolitical Logic: War Declaration
  // If Conflict (H8) is high, factions might declare war
  if (H[8] > 0.7 && Math.random() > 0.9) {
    const allFactions = getAllFactions();
    if (allFactions.length >= 2) {
      const f1 = allFactions[Math.floor(Math.random() * allFactions.length)];
      const f2 = allFactions[Math.floor(Math.random() * allFactions.length)];
      if (f1.id !== f2.id) {
        if (declareWar(f1.id, f2.id)) {
          E[8] += 0.3;  // War spikes conflict
          E[11] += 0.1; // War causes chaos
        }
      }
    }
  }

  // Collapse logic (H6: Hunger or H8: Conflict too high)
  if(H[6] > 0.8 || H[8] > 0.8){
    if(activeCivs.length > 0){
      const collapsedCiv = activeCivs.pop();
      if(collapsedCiv){
        createRuinDungeon(collapsedCiv);
        // Collapse causes H11 (Chaos) and H7 (Famine) to spike
        E[11] += 0.3;
        E[7] += 0.2;
      }
    }
  }
  
  // Rebirth logic (H10: Order is high and H1: Resources stabilized)
  if(H[10] > 0.7 && H[1] > 0.4){
    if(activeCivs.length < 5){ // Limit civ count
      const newCiv = 'rebirth_'+Date.now();
      graph.addNode({id: newCiv, type:'capital'});
      activeCivs.push(newCiv);
      E[10] += 0.1;
      E[5] += 0.1; // Tech boost for rebirth
    }
  }

  updateHeuristics(E);
}

export function getActiveCivs() {
  return activeCivs;
}
