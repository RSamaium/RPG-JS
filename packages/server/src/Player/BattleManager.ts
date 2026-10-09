import { Constructor, PlayerCtor, RpgCommonPlayer } from "@rpgjs/common";
import { RpgPlayer } from "./Player";
import { ATK, PDEF, SDEF } from "@rpgjs/common";
import { Effect } from "./EffectManager";
import type { IElementManager } from "./ElementManager";
import type { IEffectManager } from "./EffectManager";
import type { IParameterManager } from "./ParameterManager";
import type { SkillData } from "./SkillManager";

export interface DamageResult {
  damage: number;
  critical: boolean;
  elementVulnerable: boolean;
  guard: boolean;
  superGuard: boolean;
}

export type BattleParameterSet = Record<string, number>;

export interface DamageFormulas {
  damageSkill?: (attacker: BattleParameterSet, defender: BattleParameterSet, skill: SkillData) => number;
  damagePhysic?: (attacker: BattleParameterSet, defender: BattleParameterSet) => number;
  damageCritical?: (damage: number, attacker: BattleParameterSet, defender: BattleParameterSet) => number;
  damageGuard?: (damage: number, attacker: BattleParameterSet, defender: BattleParameterSet) => number;
  coefficientElements?: (attacker: { rate: number }, defender: { rate: number }, defenderBase: { rate: number }) => number;
}

/**
 * Interface combining methods from other managers needed by BattleManager
 * Reuses existing interfaces instead of duplicating method signatures
 */
interface PlayerWithMixins extends IElementManager, IEffectManager, Pick<IParameterManager, 'parameters' | 'hp'> {
  getFormulas(name: string): any;
  getCurrentMap(): ReturnType<RpgPlayer['getCurrentMap']>;
}

export interface IBattleManager {
   /**
     * Apply damage. Player will lose HP. the `attackerPlayer` parameter is the other player, the one who attacks.
     *
     * If you don't set the skill parameter, it will be a physical attack.
     * The attack formula is already defined but you can customize it in the server options.
     * This method handles all aspects of damage calculation including critical hits,
     * elemental vulnerabilities, guard effects, and applies the final damage to HP.
     *
     * @param attackerPlayer - The attacking player who deals the damage
     * @param skill - Optional skill object for magical attacks, if not provided uses physical attack
     * @returns Object containing damage details and special effects that occurred
     * 
     * @example
     * ```ts
     * // Physical attack
     * const result = player.applyDamage(attackerPlayer);
     * console.log(`Physical damage: ${result.damage}, Critical: ${result.critical}`);
     * 
     * // Magical attack with skill
     * const fireSkill = { id: 'fire', power: 50, element: 'fire' };
     * const magicResult = player.applyDamage(attackerPlayer, fireSkill);
     * console.log(`Magic damage: ${magicResult.damage}, Vulnerable: ${magicResult.elementVulnerable}`);
     * 
     * // Check for guard effects
     * if (result.guard) {
     *   console.log('Attack was partially blocked!');
     * }
     * if (result.superGuard) {
     *   console.log('Attack was heavily reduced by super guard!');
     * }
     * ```
     */
  applyDamage(attackerPlayer: RpgPlayer, skill?: SkillData): DamageResult;
}

export function WithBattleManager<TBase extends PlayerCtor>(Base: TBase): new (...args: ConstructorParameters<TBase>) => InstanceType<TBase> & IBattleManager {
  return class extends Base {
    applyDamage(
      attackerPlayer: RpgPlayer,
      skill?: SkillData
    ): DamageResult {
      const self = this as unknown as PlayerWithMixins;
      const getParam = (player: RpgPlayer) => {
        const params = {};
        Object.keys(self.parameters).forEach((key) => {
          params[key] = (player as any).param[key];
        });
        return {
          [ATK]: (player as any).atk,
          [PDEF]: (player as any).pdef,
          [SDEF]: (player as any).sdef,
          ...params,
        };
      };
      let damage = 0,
        fn;
      let critical = false;
      let guard = false;
      let superGuard = false;
      let elementVulnerable = false;
      const paramA = getParam(attackerPlayer);
      const paramB = getParam(self as any);
      if (skill) {
        fn = self.getFormulas("damageSkill");
        if (!fn) {
          throw new Error("Skill Formulas not exists");
        }
        damage = fn(paramA, paramB, skill);
      } else {
        fn = self.getFormulas("damagePhysic");
        if (!fn) {
          throw new Error("Physic Formulas not exists");
        }
        damage = fn(paramA, paramB);
        const coef = self.coefficientElements(attackerPlayer);
        if (coef >= 2) {
          elementVulnerable = true;
        }
        damage *= coef;
        fn = self.getFormulas("damageCritical");
        if (fn) {
          let newDamage = fn(damage, paramA, paramB);
          if (damage != newDamage) {
            critical = true;
          }
          damage = newDamage;
        }
      }
      if (self.hasEffect(Effect.GUARD)) {
        fn = self.getFormulas("damageGuard");
        if (fn) {
          let newDamage = fn(damage, paramA, paramB);
          if (damage != newDamage) {
            guard = true;
          }
          damage = newDamage;
        }
      }
      if (self.hasEffect(Effect.SUPER_GUARD)) {
        damage /= 4;
        superGuard = true;
      }
      self.hp -= damage;
      return {
        damage,
        critical,
        elementVulnerable,
        guard,
        superGuard,
      };
    }

    /**
     * Get damage formulas from the current map
     * 
     * Retrieves the damage calculation formulas defined in the current map's configuration.
     * These formulas are used to calculate different types of damage including physical,
     * magical, critical hits, and guard effects. The formulas provide flexibility in
     * customizing the battle system's damage calculations.
     * 
     * @param name - The name of the formula to retrieve (e.g., 'damagePhysic', 'damageSkill')
     * @returns The formula function or undefined if not found
     * 
     * @example
     * ```ts
     * // Get physical damage formula
     * const physicFormula = player.getFormulas('damagePhysic');
     * if (physicFormula) {
     *   const damage = physicFormula(attackerParams, defenderParams);
     * }
     * 
     * // Get critical damage formula
     * const criticalFormula = player.getFormulas('damageCritical');
     * if (criticalFormula) {
     *   const criticalDamage = criticalFormula(baseDamage, attackerParams, defenderParams);
     * }
     * ```
     */
    getFormulas(name: string) {
      const self = this as unknown as PlayerWithMixins;
      const map = self.getCurrentMap(); 
      return map?.damageFormulas[name];
    }
  } as unknown as any;
}
