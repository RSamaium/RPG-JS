import { H } from '../arelogic/heuristic.engine';
import { getSkillBonus } from './skill.system';

export function calculateDamage(base:number, attacker:any, defender:any, playerId?: string){
 const conflict = H[8] + 0.5;
 const order = H[9] + 0.5;
 
 // Conflict increases damage, Order decreases it
 let multiplier = conflict / order;
 
 // Skill: Order Shield
 if (playerId) {
  const shield = getSkillBonus(playerId, 'order_shield');
  if (shield) {
   multiplier *= (1 - shield.damageReduction);
  }
 }
 
 return base * multiplier;
}

export function combatOutcome(attacker: any, defender: any) {
 const playerId = attacker.id;
 const win = Math.random() > 0.4;
 const crit = Math.random() > 0.8;
 const baseDamage = 10 + Math.floor(Math.random() * 20);
 
 let critMultiplier = crit ? 2 : 1;
 
 // Skill: Chaos Strike
 if (playerId && crit) {
  const strike = getSkillBonus(playerId, 'chaos_strike');
  if (strike) {
   critMultiplier = strike.critMultiplier;
  }
 }

 const damage = calculateDamage(baseDamage, attacker, defender, playerId) * critMultiplier;

 return {
  win,
  crit,
  damage: Math.floor(damage),
  loot: win ? (H[3] + 1) * 10 : 0,
  E: win ? [0, 0, 0.1, 0.2, 0, 0, 0, 0, 0.5, 0, 0, 0, 0] : [0, 0, 0, 0, 0, 0, 0, 0, 0.2, 0, 0, 0, 0]
 };
}
