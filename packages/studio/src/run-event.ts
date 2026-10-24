import type { RpgPlayer } from "@rpgjs/server";
import { createBlockExecutionService } from "./block-executor";

const eventQueues = new WeakMap<object, Promise<void>>();

/**
 * Runs an event of the Studio (one of the `commonEvents` the map was published
 * with) for a player, outside of a map event.
 *
 * `variables` are the variables the event reads, like the `itemId` of an item
 * workflow. Calls are serialised per player. An event id the map does not know
 * resolves without throwing.
 *
 * @param player - Player the event runs for
 * @param eventId - Identifier of the common event
 * @param variables - Variables given to the event
 *
 * @example
 * ```ts
 * await runStudioEvent(player, "after-battle", { winnerId: "hero", damage: 12 });
 * ```
 */
export const runStudioEvent = (
  player: RpgPlayer,
  eventId: string,
  variables: Record<string, unknown> = {},
): Promise<void> => {
  const previous = eventQueues.get(player) ?? Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(async () => {
      const map = player.getCurrentMap?.() ?? (player as RpgPlayer & { map?: any }).map ?? null;
      if (!map) return;
      const executor = createBlockExecutionService(player, null, map, {
        initialVariables: variables,
      });
      await executor.executeSingleBlock({
        id: `run-event-${eventId}`,
        type: "call_common_event",
        data: { commonEventId: eventId, parameters: variables },
      });
      player.syncChanges?.();
    })
    .catch((error) => {
      console.error(`[studio] Event "${eventId}" failed`, error);
    });

  eventQueues.set(player, current);
  void current.finally(() => {
    if (eventQueues.get(player) === current) eventQueues.delete(player);
  });
  return current;
};
