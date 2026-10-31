import type { RpgEvent } from "@rpgjs/server";
import { BattleAi, type BattleAiOptions } from "../ai.server";

/**
 * Enemy parameters, keyed like the RPGJS parameter constants
 * (`MAXHP` is `"maxHp"`, `ATK` is `"atk"`...). HP and SP start full.
 */
export interface ActionBattleEnemyStats {
  maxHp?: number;
  maxSp?: number;
  atk?: number;
  pdef?: number;
  sdef?: number;
  str?: number;
  agi?: number;
  int?: number;
  dex?: number;
}

export interface ActionBattleEnemyPreset extends BattleAiOptions {
  /** Spritesheet id applied with `setGraphic()`. */
  graphic?: string | string[];
  /** Parameters as an object, or a function for custom setup. */
  stats?: ActionBattleEnemyStats | ((event: RpgEvent) => void);
}

export type ActionBattleEnemyPresetMap = Record<string, ActionBattleEnemyPreset>;

/**
 * Declare a reusable enemy: graphic, stats, AI and rewards in one object.
 * Returns the preset unchanged, typed for autocomplete.
 *
 * @example
 * ```ts
 * export const Slime = defineActionBattleEnemy({
 *   graphic: "slime",
 *   stats: { maxHp: 120, atk: 10, pdef: 4 },
 *   rewards: { exp: 10, gold: 12, drop: true },
 * });
 * ```
 */
export const defineActionBattleEnemy = <T extends ActionBattleEnemyPreset>(
  preset: T
): T => preset;

export const defineActionBattleAiPreset = <T extends BattleAiOptions>(
  preset: T
): T => preset;

const applyEnemyStats = (event: RpgEvent, stats: ActionBattleEnemyStats) => {
  for (const [param, value] of Object.entries(stats)) {
    if (typeof value === "number") event.param[param] = value;
  }
  if (typeof stats.maxHp === "number") event.hp = stats.maxHp;
  if (typeof stats.maxSp === "number") event.sp = stats.maxSp;
};

/**
 * Turn an event into an action-battle enemy from a preset object or a preset
 * name. Applies the graphic and the stats, then attaches the `BattleAi`
 * (available afterwards as `event.battleAi`).
 *
 * @param event - Event to turn into an enemy, usually `this` in `onInit()`
 * @param presetOrOptions - Enemy preset, or its name in `presets`
 * @param presets - Named presets used when a name is given
 * @returns The attached `BattleAi`
 *
 * @example
 * ```ts
 * import { createActionEnemy } from "@rpgjs/action-battle/server";
 * import { Slime } from "./enemies";
 *
 * export default {
 *   onInit() {
 *     createActionEnemy(this, Slime);
 *   },
 * };
 * ```
 */
export const createActionEnemy = (
  event: RpgEvent,
  presetOrOptions: string | ActionBattleEnemyPreset,
  presets: ActionBattleEnemyPresetMap = {}
) => {
  const options =
    typeof presetOrOptions === "string"
      ? presets[presetOrOptions]
      : presetOrOptions;
  if (!options) {
    throw new Error(`Action battle enemy preset not found: ${presetOrOptions}`);
  }
  const { graphic, stats, ...aiOptions } = options;
  if (graphic !== undefined) event.setGraphic(graphic);
  if (typeof stats === "function") stats(event);
  else if (stats) applyEnemyStats(event, stats);
  return new BattleAi(event, aiOptions);
};
