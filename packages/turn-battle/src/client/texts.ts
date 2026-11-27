import type { RpgClientEngine } from "@rpgjs/client";
import { TURN_BATTLE_I18N, translateBattleText } from "../core/i18n";

export { TURN_BATTLE_I18N };

let engine: Pick<RpgClientEngine, "t"> | undefined;

/** The battle texts follow the i18n service and the language of the engine (reactive inside a computation). */
export const connectI18n = (value: Pick<RpgClientEngine, "t"> | undefined) => (engine = value);

/** A text of the battle in the language of the game (the English default before the engine is connected). */
export const t = (key: string, params?: Record<string, unknown>): string => translateBattleText(key, params, engine);
