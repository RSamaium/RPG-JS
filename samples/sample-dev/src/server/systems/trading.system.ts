import { H } from '../arelogic/heuristic.engine';
import { getReputation } from './reputation.system';
import { getSkillBonus } from './skill.system';

// Simulated global supply/demand state
const marketInventory: Record<string, number> = {
  wood: 1000,
  iron: 500,
  potion: 100
};

export function calculatePrice(item: any, playerId?: string, npcId: string = 'village_merchant') {
  const economy = H[2] + 0.5;
  const market = H[3] + 0.5;
  const trade = H[4] + 0.5;
  const conflict = H[8];
  const hunger = H[6];
  
  // Base price influenced by heuristics
  const baseValue = item.baseValue || 10;
  let price = baseValue * (economy / trade) * (1 + market);
  
  // Supply & Demand impact
  const currentSupply = marketInventory[item.id] || 100;
  const supplyFactor = 100 / Math.max(1, currentSupply);
  price *= supplyFactor;

  // Economic Events
  if (conflict > 0.7 && item.id === 'iron') price *= 2.5; // War increases iron price
  if (hunger > 0.7 && item.id === 'food') price *= 3.0; // Famine increases food price
  if (H[11] > 0.7) price *= 1.5; // Chaos causes inflation

  // Reputation Discount
  if (playerId) {
    const rep = getReputation(playerId, npcId);
    let discount = Math.min(0.3, (rep.score || 0) / 200); // Up to 30% discount at 60+ rep
    
    // Skill: Master Trader
    const traderBonus = getSkillBonus(playerId, 'master_trader');
    if (traderBonus) {
      discount += traderBonus.priceReduction;
    }
    
    price *= (1 - Math.min(0.5, discount)); // Cap total discount at 50%
  }

  return Math.max(1, Math.round(price));
}

export function executeTrade(player: any, item: any, isBuying: boolean, npcId: string = 'village_merchant') {
  const price = calculatePrice(item, player.id, npcId);
  
  // Update market inventory
  if (!marketInventory[item.id]) marketInventory[item.id] = 100;
  if (isBuying) {
    marketInventory[item.id]--;
  } else {
    marketInventory[item.id]++;
  }

  // A5: Continuous Integration - Trade affects heuristics
  const E = new Array(13).fill(0);
  if (isBuying) {
    E[2] += 0.05; // Economy up
    E[3] += 0.1;  // Market up
    E[4] += 0.05; // Trade up
  } else {
    E[2] -= 0.02; // Economy down (selling assets)
    E[3] += 0.05; // Market up (liquidity)
    E[4] += 0.1;  // Trade up
  }
  
  return {
    success: true,
    price,
    E
  };
}
