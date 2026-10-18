import type { RpgEvent, RpgMap, RpgPlayer } from "@rpgjs/server";

// Kept apart from `event-type-runtime.ts`: `index.ts` also ships to the client,
// which must not load the server runtime.
/**
 * How an enemy event reacts to the players, chosen by the host of the game.
 *
 * - `"action"`: the enemy fights in real time (`BattleAi`), the default.
 * - `"none"`: no `BattleAi` is created.
 * - `{ onTouch }`: no `BattleAi`; `onTouch(player)` runs when a player touches the event.
 */
export type StudioEnemyInteraction =
  | "action"
  | "none"
  | { onTouch(player: RpgPlayer): void | Promise<void> };

export type StudioEnemyInteractionResolver = (context: {
  event: RpgEvent;
  /** Database record of the enemy. */
  enemy: Record<string, any>;
  map: RpgMap;
}) => StudioEnemyInteraction;

let enemyInteractionResolver: StudioEnemyInteractionResolver | undefined;

export const getStudioEnemyInteractionResolver = (): StudioEnemyInteractionResolver | undefined =>
  enemyInteractionResolver;

/** Sets the resolver given to `provideStudioGame({ enemyInteraction })`. */
export const configureStudioEnemyInteraction = (
  resolver?: StudioEnemyInteractionResolver,
): void => {
  enemyInteractionResolver = resolver;
};
