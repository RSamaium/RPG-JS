import type { RpgClientEngine } from "@rpgjs/client";
import { TURN_BATTLE_I18N } from "../core/i18n";

export { TURN_BATTLE_I18N };

let engine: Pick<RpgClientEngine, "t"> | undefined;

/** The battle texts follow the i18n service and the language of the engine (reactive inside a computation). */
export const connectI18n = (value: Pick<RpgClientEngine, "t"> | undefined) => (engine = value);

/** A text of the battle in the language of the game (the English default before the engine is connected). */
export const t = (key: string, params?: Record<string, unknown>): string => {
  if (engine) return engine.t(key, params);
  return TURN_BATTLE_I18N.en[key] ?? key;
};
