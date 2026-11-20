/**
 * The signals the game emits, as data: what a script can listen to with `on("signal", ...)`, and what each carries. A signal is
 * named `<what>.<what happened>`; its payload is read-only. The player the script acts for (`$player`) and the event
 * (`$event`, `$self`) come from the world, not from the payload.
 */
import type { SignalDesc } from "../core/filter";

/** A list of tags at the top of a payload: `where: { <field>: { has: "<example>" } }`. */
const TAG_LIST = (what: string, field: string, example: string): SignalDesc["payload"][string] => ({
  type: "string[]",
  doc: `The tags of ${what}, empty when it has none. Filter with where: { ${field}: { has: "${example}" } }.`,
});
const ROOM: SignalDesc["payload"] = {
  kind: { type: "string", doc: 'The kind of the room: "map" for a map, otherwise the kind the room was registered with.' },
  id: { type: "string", doc: "Id of the room." },
  mapTags: TAG_LIST("the map, when the room is one (empty otherwise)", "mapTags", "town"),
};
const MAP: SignalDesc["payload"] = {
  map: { type: "string", doc: "Id of the map." },
  mapTags: TAG_LIST("the map", "mapTags", "town"),
};
const SHAPE: SignalDesc["payload"] = {
  shape: {
    type: "object",
    fields: {
      name: { type: "string" },
      x: { type: "number" },
      y: { type: "number" },
      width: { type: "number" },
      height: { type: "number" },
      eventId: { type: "string", doc: 'Id of the event the zone is attached to ($map.attachShape), "" for a zone of the map.' },
    },
  },
};
const ITEM: SignalDesc["payload"] = {
  item: { type: "string", doc: "Id of the item." },
  quantity: { type: "number", doc: "How many." },
  itemTags: TAG_LIST("the item in the database", "itemTags", "relic"),
};
const EVENT: SignalDesc["payload"] = {
  event: {
    type: "object",
    fields: {
      id: { type: "string" },
      name: { type: "string", doc: "Name of the event, empty when it has none." },
      tags: { type: "string[]", doc: 'Tags of the event, empty when it has none. React to a kind of event rather than to a name: where: { "event.tags": { has: "help" } }.' },
    },
  },
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
      type: { type: "string", doc: "The type of the projectile (what the clients draw it with)." },
      projectileId: { type: "string", doc: "The `params.projectileId` of the projectile, when it was launched with one." },
    },
  },
  x: { type: "number", doc: "X of the impact." },
  y: { type: "number", doc: "Y of the impact." },
};

/**
 * The signals of the game: `player.joinRoom`, `player.leaveRoom`, `player.joinMap`, `player.leaveMap`, `player.levelUp`, `player.dead`,
 * `player.itemAdd`, `player.itemRemove`, `player.itemUse`, `player.itemEquip`, `player.goldChange`, `player.skillChange`, `player.connect`, `player.disconnect`, `battle.start`, `battle.command`, `battle.end`, `combat.hit`, `map.tick`, `event.action`,
 * `event.touch`, `event.arrived`, `player.touchTile`. The room ones fire in every kind of room; the map and event ones only in a map.
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
      skillTags: TAG_LIST("the skill in the database", "skillTags", "fire"),
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
    doc: 'A projectile hits a player. The player the script acts for is the one hit. Return "pass" to let it fly through, "stick" to keep it planted, "stop" to stop it; return nothing to keep what it does. Only a listener that does not wait (no wait, showText…) can reply.',
    payload: PROJECTILE,
    reply: ["stop", "pass", "stick"],
  },
  "event.projectileHit": {
    doc: 'A projectile hits an event. The player the script acts for is the owner of the projectile, so nothing fires when an event launched it. Return "pass" to let it fly through, "stick" to keep it planted in the event, "stop" to stop it; return nothing to keep what it does. Only a listener that does not wait (no wait, showText…) can reply. The onProjectileHit of the event itself has the last word.',
    payload: PROJECTILE,
    reply: ["stop", "pass", "stick"],
  },
  "projectile.end": {
    doc: "A projectile is gone: it hit something, reached its range, expired or landed (a bomb). The player the script acts for is the owner; nothing fires when an event launched it.",
    payload: {
      projectile: PROJECTILE.projectile,
      reason: { type: "string", doc: 'Why it ended: "hit", "range", "land", "return", "ttl"…' },
      x: { type: "number", doc: "X where it ended: the impact, where it landed, or the end of its range." },
      y: { type: "number", doc: "Y where it ended: the impact, where it landed, or the end of its range." },
      surface: { type: "string", doc: 'What it ended on: "target" (a player or an event), "wall", "ground" (it landed on nothing), or "" (it flew out of range or expired).' },
    },
  },
  "event.arrived": {
    doc: "An event that a script walked with $map.moveEvent arrives. The player the script acts for is the one of the script that walked it.",
    payload: {
      ...EVENT,
      x: { type: "number", doc: "X of the event where it stopped." },
      y: { type: "number", doc: "Y of the event where it stopped." },
    },
  },
  "timer.fire": {
    doc: "A timer of the player that a script started with $player.startTimer fires. The player the script acts for is the player of the timer.",
    payload: { name: { type: "string", doc: "The name of the timer." } },
  },
  "enemy.defeated": {
    doc: "A player defeats an enemy of an action battle (with actionBattleHooks). The player the script acts for is the one who defeated it.",
    payload: {
      ...EVENT,
      enemy: { type: "string", doc: "The id of the enemy, when $map.spawnEnemy made it or the game gives one; \"\" otherwise." },
    },
  },
  "player.touchTile": {
    doc: "A player steps on a tile, or walks against it, whose properties have interactive: true (a barrel, a lever, lava). It fires once each time the player reaches such a tile.",
    payload: {
      x: { type: "number", doc: "X of the tile, in tiles." },
      y: { type: "number", doc: "Y of the tile, in tiles." },
      properties: { type: "object", doc: "The properties of the tile (the top layer wins)." },
    },
  },
  "event.action": { doc: "A player acts on an event (the action key, next to it).", payload: EVENT },
  "event.touch": { doc: "A player touches an event.", payload: EVENT },
};
