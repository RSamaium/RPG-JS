import { arrayUniq, PlayerCtor, RpgCommonPlayer } from "@rpgjs/common";
import { Constructor } from "@rpgjs/common";
import { RpgPlayer } from "./Player";

export interface ElementAffinity {
  rate: number;
  element: string;
}

/**
 * Element Manager Mixin
 * 
 * Provides elemental management capabilities to any class. This mixin handles
 * elemental resistances, vulnerabilities, and attack elements. It manages both
 * defensive capabilities (elementsDefense) and offensive elements from equipment,
 * as well as player-specific elemental efficiency modifiers.
 * 
 * @param Base - The base class to extend with element management
 * @returns Extended class with element management methods
 * 
 * @example
 * ```ts
 * class MyPlayer extends WithElementManager(BasePlayer) {
 *   constructor() {
 *     super();
 *     this.elementsEfficiency = [{ rate: 0.5, element: 'fire' }];
 *   }
 * }
 * 
 * const player = new MyPlayer();
 * const fireResistance = player.elementsDefense.find(e => e.element === 'fire');
 * ```
 */
export function WithElementManager<TBase extends PlayerCtor>(Base: TBase) {
  return class extends Base {
    _elementsEfficiency: ElementAffinity[] = [];

    get elementsDefense(): ElementAffinity[] {
      return (this as any).getFeature("elementsDefense", "element");
    }

    get elementsEfficiency(): ElementAffinity[] {
      if (this._class()) {
        const classData = this._class() as any;
        return <any>[
          ...this._elementsEfficiency,
          ...(classData?.elementsEfficiency || []),
        ];
      }
      return this._elementsEfficiency;
    }

    set elementsEfficiency(val) {
      this._elementsEfficiency = val;
    }

    get elements(): {
      rate: number;
      element: string;
    }[] {
      let elements: any = [];
      for (let item of this.equipments()) {
        if (item.elements) {
          elements = [...elements, ...item.elements];
        }
      }
      return arrayUniq(elements);
    }

    coefficientElements(otherPlayer: RpgPlayer): number {
      const atkPlayerElements: any = (otherPlayer as any).elements;
      const playerElements: any = this.elementsEfficiency;
      let coefficient = 1;

      for (let atkElement of atkPlayerElements) {
        const elementPlayer = playerElements.find(
          (el) => el.element == atkElement.element
        );
        const elementPlayerDef = this.elementsDefense.find(
          (el) => el.element == atkElement.element
        );
        if (!elementPlayer) continue;
        const fn = (this as any).getFormulas("coefficientElements");
        if (!fn) {
          return coefficient;
        }
        coefficient += fn(
          atkElement,
          elementPlayer,
          elementPlayerDef || { rate: 0 }
        );
      }
      return coefficient;
    }
  } as unknown as TBase;
}

/**
 * Interface for Element Manager functionality
 * 
 * Provides elemental management capabilities including resistances, vulnerabilities,
 * and attack elements. This interface defines the public API of the ElementManager mixin.
 */
export interface IElementManager {
  /**
   * Gets the defensive capabilities against various elements from equipped items.
   * The system automatically consolidates multiple defensive items, keeping only
   * the highest protection rate for each element type.
   * 
   * @returns Array of element defense objects with rate and element properties
   */
  elementsDefense: ElementAffinity[];

  /**
   * Manages the player's elemental efficiency modifiers, which determine how
   * effective different elements are against this player. Values greater than 1
   * indicate vulnerability, while values less than 1 indicate resistance.
   * This combines both class-based efficiency and player-specific modifiers.
   * 
   * @returns Array of element efficiency objects with rate and element properties
   */
  elementsEfficiency: ElementAffinity[];

  /**
   * Gets all offensive elements available to the player from equipped weapons and armor.
   * This determines what elemental damage types the player can deal in combat.
   * The system automatically combines elements from all equipped items and removes duplicates.
   * 
   * @returns Array of element objects with rate and element properties for offensive capabilities
   */
  elements: {
    rate: number;
    element: string;
  }[];

  /**
   * Calculate elemental damage coefficient against another player
   * 
   * Determines the damage multiplier when this player attacks another player,
   * taking into account the attacker's offensive elements, the defender's
   * elemental efficiency, and elemental defense from equipment. This is used
   * in the battle system to calculate elemental damage modifiers.
   * 
   * @param otherPlayer - The target player to calculate coefficient against
   * @returns Numerical coefficient to multiply base damage by
   * 
   * @example
   * ```ts
   * // Calculate elemental damage coefficient
   * const firePlayer = new MyPlayer();
   * const icePlayer = new MyPlayer();
   * 
   * // Fire player attacks ice player (assuming ice is weak to fire)
   * const coefficient = icePlayer.coefficientElements(firePlayer);
   * console.log(`Damage multiplier: ${coefficient}`); // e.g., 2.0 for double damage
   * 
   * // Use in damage calculation
   * const baseDamage = 100;
   * const finalDamage = baseDamage * coefficient;
   * console.log(`Final damage: ${finalDamage}`);
   * 
   * // Check for elemental advantage
   * if (coefficient > 1) {
   *   console.log('Attacker has elemental advantage!');
   * } else if (coefficient < 1) {
   *   console.log('Defender resists this element');
   * }
   * ```
   */
  coefficientElements(otherPlayer: RpgPlayer): number;
}
