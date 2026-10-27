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
const SHAPE: SignalDesc["payload"] = {
  shape: {
    type: "object",
    fields: { name: { type: "string" }, x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" } },
  },
};
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
  "player.inShape": { doc: "A player enters a zone of the map (a shape, made by the game or by a script).", payload: SHAPE },
  "player.outShape": { doc: "A player leaves a zone of the map.", payload: SHAPE },
  "player.dead": { doc: "A player has no health left.", payload: {} },
  "gui.action": {
    doc: "A player acts in a GUI of the client: a button, a choice. The component sends the event with a name and data; a script opens the GUI with $player.openGui.",
    payload: {
      gui: { type: "string", doc: "Id of the GUI, <pluginId>_<file> for a plugin." },
      event: { type: "string", doc: "Name of the event the component sent." },
      data: { type: "object", doc: "What the component sent with it (plain data), or nothing." },
    },
  },
  "event.action": { doc: "A player acts on an event (the action key, next to it).", payload: EVENT },
  "event.touch": { doc: "A player touches an event.", payload: EVENT },
};
