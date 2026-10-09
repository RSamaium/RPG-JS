import {
  arrayFlat,
  arrayUniq,
  Constructor,
  PlayerCtor,
  RpgCommonPlayer,
} from "@rpgjs/common";

export enum Effect {
  CAN_NOT_SKILL = 'CAN_NOT_SKILL',
  CAN_NOT_ITEM = 'CAN_NOT_ITEM',
  CAN_NOT_STATE = 'CAN_NOT_STATE',
  CAN_NOT_EQUIPMENT = 'CAN_NOT_EQUIPMENT',
  HALF_SP_COST = 'HALF_SP_COST',
  GUARD = 'GUARD',
  SUPER_GUARD = 'SUPER_GUARD'
}

/**
 * Effect Manager Mixin
 * 
 * Provides effect management capabilities to any class. This mixin handles
 * player effects including restrictions, buffs, and debuffs. Effects can come
 * from various sources like states, equipment, and temporary conditions.
 * 
 * @param Base - The base class to extend with effect management
 * @returns Extended class with effect management methods
 * 
 * @example
 * ```ts
 * class MyPlayer extends WithEffectManager(BasePlayer) {
 *   constructor() {
 *     super();
 *     // Effect system is automatically initialized
 *   }
 * }
 * 
 * const player = new MyPlayer();
 * player.effects = [Effect.GUARD];
 * console.log(player.hasEffect(Effect.GUARD)); // true
 * ```
 */
export function WithEffectManager<TBase extends PlayerCtor>(Base: TBase) {
  return class extends Base {
    hasEffect(effect: string): boolean {
      return this.effects.includes(effect);
    }

    get effects(): string[] {
      const getEffects = (prop) => {
        return arrayFlat(this[prop]().map((el) => el.effects || []));
      };
      return arrayUniq([
        ...this._effects(),
        ...getEffects("states"),
        ...getEffects("equipments"),
      ]);
    }

    set effects(val) {
      this._effects.set(val);
    }
  } as unknown as TBase;
}

/**
 * Interface for Effect Manager functionality
 * 
 * Provides effect management capabilities including restrictions, buffs, and debuffs.
 * This interface defines the public API of the EffectManager mixin.
 */
export interface IEffectManager {
  /**
   * Gets all currently active effects on the player from multiple sources:
   * - Direct effects assigned to the player
   * - Effects from active states (buffs/debuffs)
   * - Effects from equipped weapons and armor
   * The returned array contains unique effects without duplicates.
   * 
   * @returns Array of all active effects on the player
   */
  effects: string[];

  /**
   * Check if the player has a specific effect
   * 
   * Determines whether the player currently has the specified effect active.
   * This includes effects from states, equipment, and temporary conditions.
   * The effect system provides a flexible way to apply various gameplay
   * restrictions and enhancements to the player.
   * 
   * @param effect - The effect identifier to check for
   * @returns true if the player has the effect, false otherwise
   * 
   * @example
   * ```ts
   * import { Effect } from '@rpgjs/database'
   *
   * // Check for skill restriction
   * const cannotUseSkills = player.hasEffect(Effect.CAN_NOT_SKILL);
   * if (cannotUseSkills) {
   *   console.log('Player cannot use skills right now');
   * }
   * 
   * // Check for guard effect
   * const isGuarding = player.hasEffect(Effect.GUARD);
   * if (isGuarding) {
   *   console.log('Player is in guard stance');
   * }
   * 
   * // Check for cost reduction
   * const halfCost = player.hasEffect(Effect.HALF_SP_COST);
   * const actualCost = skillCost / (halfCost ? 2 : 1);
   * ```
   */
  hasEffect(effect: string): boolean;
}
