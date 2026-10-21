/**
 * The signals the game emits, as data: what a script can listen to with `on("signal", ...)`, and what each carries. A signal is
 * named `<what>.<what happened>`; its payload is read-only. The player the script acts for (`$player`) and the event
 * (`$event`, `$self`) come from the world, not from the payload.
 */
import type { SignalDesc } from "../core/filter";

const ROOM: SignalDesc["payload"] = {
  kind: { type: "string", doc: 'The kind of the room: "map" for a map, otherwise the kind the room was registered with.' },
  id: { type: "string", doc: "Id of the room." },
};
const MAP: SignalDesc["payload"] = { map: { type: "string", doc: "Id of the map." } };
const EVENT: SignalDesc["payload"] = {
  event: { type: "object", fields: { id: { type: "string" }, name: { type: "string", doc: "Name of the event, empty when it has none." } } },
};

/**
 * The signals of the game: `player.joinRoom`, `player.leaveRoom`, `player.joinMap`, `player.leaveMap`, `player.levelUp`, `player.dead`,
 * `event.action`, `event.touch`. The room ones fire in every kind of room; the map and event ones only in a map.
 * A plugin adds its own with the `signals` option of `ScriptService`.
 */
export const GAME_SIGNALS: Record<string, SignalDesc> = {
  "player.joinRoom": { doc: "A player enters a room: a map, or a gameplay room that is not a map.", payload: ROOM },
  "player.leaveRoom": { doc: "A player leaves a room.", payload: ROOM },
  "player.joinMap": { doc: "A player enters a map.", payload: MAP },
  "player.leaveMap": { doc: "A player leaves a map.", payload: MAP },
  "player.levelUp": {
    doc: "A player gains one or more levels.",
    payload: {
      gained: { type: "number", doc: "How many levels the player gained." },
      level: { type: "number", doc: "The level of the player after the gain." },
    },
  },
  "player.dead": { doc: "A player has no health left.", payload: {} },
  "event.action": { doc: "A player acts on an event (the action key, next to it).", payload: EVENT },
  "event.touch": { doc: "A player touches an event.", payload: EVENT },
};
