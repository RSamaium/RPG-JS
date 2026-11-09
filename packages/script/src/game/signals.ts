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
const ITEM: SignalDesc["payload"] = {
  item: { type: "string", doc: "Id of the item." },
  quantity: { type: "number", doc: "How many." },
};
const EVENT: SignalDesc["payload"] = {
  event: { type: "object", fields: { id: { type: "string" }, name: { type: "string", doc: "Name of the event, empty when it has none." } } },
};

const TAGS = (what: string): SignalDesc["payload"][string] => ({ type: "string[]", doc: `The tags of ${what}, to filter with where: { "x.tags": { has: "fire" } }.` });
const FIGHTER: SignalDesc["payload"][string] = {
  type: "object",
  fields: {
    id: { type: "string" },
    name: { type: "string" },
    kind: { type: "string", doc: '"player" or "event".' },
  },
  doc: "Who it is: the id, the name and whether it is a player or an event.",
};

const PROJECTILE: SignalDesc["payload"] = {
  projectile: {
    type: "object",
    fields: {
      id: { type: "string", doc: "Id of this projectile in flight." },
      type: { type: "string", doc: "The type of the projectile (its graphic, or the Studio projectile record)." },
      projectileId: { type: "string", doc: "Id of the Studio projectile record, when it has one." },
    },
  },
  x: { type: "number", doc: "X of the impact." },
  y: { type: "number", doc: "Y of the impact." },
};

/**
 * The signals of the game: `player.joinRoom`, `player.leaveRoom`, `player.joinMap`, `player.leaveMap`, `player.levelUp`, `player.dead`,
 * `player.itemAdd`, `player.itemRemove`, `player.itemUse`, `player.itemEquip`, `player.goldChange`, `player.skillChange`, `player.connect`, `player.disconnect`, `battle.start`, `battle.command`, `battle.end`, `combat.hit`, `map.tick`, `event.action`,
 * `event.touch`. The room ones fire in every kind of room; the map and event ones only in a map.
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
  "player.itemAdd": { doc: "Items are added to the inventory of a player.", payload: ITEM },
  "player.itemRemove": { doc: "Items leave the inventory of a player: removed, sold, or consumed by a use.", payload: ITEM },
  "player.itemUse": { doc: "A player uses an item.", payload: ITEM },
  "player.itemEquip": {
    doc: "A player equips or unequips an item.",
    payload: { ...ITEM, equipped: { type: "boolean", doc: "true when the item is now equipped, false when it is taken off." } },
  },
  "player.goldChange": {
    doc: "The gold of a player changes.",
    payload: {
      gold: { type: "number", doc: "The gold after the change." },
      delta: { type: "number", doc: "How much it changed: negative when the player spends." },
    },
  },
  "map.tick": {
    doc: "A tick of the server on a map with players, about 60 times a second. It runs once for each player of the map.",
    payload: {
      ...MAP,
      deltaMs: { type: "number", doc: "The time the tick covers, in milliseconds." },
      tick: { type: "number", doc: "The number of the tick since the map started." },
    },
  },
  "gui.action": {
    doc: "A player acts in a GUI of the client: a button, a choice. The component sends the event with a name and data; a script opens the GUI with $player.openGui.",
    payload: {
      gui: { type: "string", doc: "Id of the GUI, <pluginId>_<file> for a plugin." },
      event: { type: "string", doc: "Name of the event the component sent." },
      data: { type: "object", doc: "What the component sent with it (plain data), or nothing." },
    },
  },
  "player.skillChange": {
    doc: "A player learns or forgets a skill.",
    payload: {
      action: { type: "string", doc: '"learn" or "forget".' },
      skill: { type: "string", doc: "Id of the skill." },
    },
  },
  "player.connect": { doc: "A player connects to the game.", payload: {} },
  "player.disconnect": { doc: "A player disconnects from the game.", payload: {} },
  "battle.start": {
    doc: "A turn-based battle starts. The player the script acts for is the hero.",
    payload: {
      troop: TAGS("the troop"),
      enemies: TAGS("the enemies"),
    },
  },
  "battle.command": {
    doc: "The player picks a command in a turn-based battle (a skill on a target). A script observes it and never refuses it.",
    payload: {
      skill: TAGS("the skill"),
      hero: TAGS("the hero"),
      target: TAGS("the target"),
    },
  },
  "battle.end": {
    doc: "A turn-based battle ends.",
    payload: {
      result: { type: "string", doc: 'How it ended: "victory", "defeat" or "escape".' },
      troop: TAGS("the troop"),
      enemies: TAGS("the enemies"),
    },
  },
  "combat.hit": {
    doc: "A hit lands in an action battle, for the player of the hit: the attacker, otherwise the target. A hit between two events emits nothing.",
    payload: {
      damage: { type: "number", doc: "The damage dealt." },
      defeated: { type: "boolean", doc: "true when the target has no health left." },
      attacker: FIGHTER,
      target: FIGHTER,
    },
  },
  "player.hotbarChange": {
    doc: "The hotbar of a player changes: seeded, a slot assigned or cleared, a slot selected, or refreshed.",
    payload: {
      action: { type: "string", doc: '"initialize", "assign", "clear", "select" or "refresh".' },
      slots: { type: "object", doc: "The slots after the change, in order: { type, id } or null for a free slot." },
    },
  },
  "player.projectileHit": {
    doc: "A projectile hits a player. The player the script acts for is the one hit. It does not change what the projectile does.",
    payload: PROJECTILE,
  },
  "event.projectileHit": {
    doc: "A projectile hits an event. The player the script acts for is the owner of the projectile, so nothing fires when an event launched it. It does not change what the projectile does.",
    payload: PROJECTILE,
  },
  "projectile.end": {
    doc: "A projectile is gone: it hit something, reached its range, expired or landed (a bomb). The player the script acts for is the owner; nothing fires when an event launched it.",
    payload: {
      projectile: PROJECTILE.projectile,
      reason: { type: "string", doc: 'Why it ended: "hit", "range", "land", "return", "ttl"…' },
      x: PROJECTILE.x,
      y: PROJECTILE.y,
    },
  },
  "event.action": { doc: "A player acts on an event (the action key, next to it).", payload: EVENT },
  "event.touch": { doc: "A player touches an event.", payload: EVENT },
};
