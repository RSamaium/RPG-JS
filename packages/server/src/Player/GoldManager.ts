import { PlayerCtor } from "@rpgjs/common";

export interface GoldManager {
  /**
   * You can change the game money
   *
   * ```ts
   * player.gold += 100
   * ```
   *
   * @title Change Gold
   * @prop {number} player.gold
   * @default 0
   * @memberof GoldManager
   * */
  gold: number;
}

export function WithGoldManager<TBase extends PlayerCtor>(
  Base: TBase
): new (...args: ConstructorParameters<TBase>) => InstanceType<TBase> &
  GoldManager {
  return class extends Base {
    set gold(val: number) {
      if (val < 0) {
        val = 0;
      }
      const previous = this._gold();
      this._gold.set(val);
      if (val !== previous) {
        try {
          void (this as any).execMethod("onGoldChange", [{ gold: val, delta: val - previous }]).catch(() => {});
        } catch {
          // the player has no hooks yet (not attached to a room)
        }
      }
    }

    get gold(): number {
      return this._gold();
    }
  } as unknown as any;
}

/**
 * Type helper to extract the interface from the WithGoldManager mixin
 * This provides the type without duplicating method signatures
 */
export type IGoldManager = InstanceType<ReturnType<typeof WithGoldManager>>;
