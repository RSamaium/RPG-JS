/**
 * The signals the game emits, as data: what a script can listen to with `on("signal", ...)`, and what each carries. A signal is
 * named `<what>.<what happened>`; its payload is read-only. The player the script acts for (`$player`) and the event
 * (`$event`, `$self`) come from the world, not from the payload.
 */
import type { SignalDesc } from "../core/filter";

const MAP: SignalDesc["payload"] = { map: { type: "string", doc: "Id of the map." } };
const EVENT: SignalDesc["payload"] = {
  event: { type: "object", fields: { id: { type: "string" }, name: { type: "string", doc: "Name of the event, empty when it has none." } } },
};

export const GAME_SIGNALS: Record<string, SignalDesc> = {
  "player.joinMap": { doc: "A player enters a map.", payload: MAP },
  "player.leaveMap": { doc: "A player leaves a map.", payload: MAP },
  "player.levelUp": {
    doc: "A player gains one or more levels. While it runs, $player.level is still the level before the gain (RPGJS sends the hook before it sets the level): the new level is $player.level + e.gained.",
    payload: { gained: { type: "number", doc: "How many levels the player gained." } },
  },
  "player.dead": { doc: "A player has no health left.", payload: {} },
  "event.action": { doc: "A player acts on an event (the action key, next to it).", payload: EVENT },
  "event.touch": { doc: "A player touches an event.", payload: EVENT },
};
