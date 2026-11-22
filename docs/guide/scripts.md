---
title: "Scripts"
description: "Sandboxed scripts that listen to the signals of the game, with @rpgjs/script: a JavaScript subset run by its own interpreter, with the names of the API of RPGJS."
---

# Scripts

`@rpgjs/script` lets a game, an editor or an AI agent add gameplay as **text** without giving it the keys of the game. A script is
written in a subset of JavaScript and run by its own interpreter: it is **never** evaluated as JavaScript, so it can only use what
the game exposes, and it is stopped when it uses too much.

A script does not call the game. It **listens** to the signals of the game (a player levels up, an event is activated, a zone is
entered…) and reacts, with the names of the API of RPGJS: `$player.showText`, `$player.addItem`, `$map.createDynamicEvent`…

## Where it runs

The server owns the gameplay state, so scripts run on the server: in an MMORPG (Node or Cloudflare) and in a standalone game, where
the server part runs next to the client. Scripts are never sent to players. The interpreter has no dependency on the engine
(`@rpgjs/script/core`), so it also runs in a Worker or a browser, for example to check a script before saving it.

A script runs in a **map** or in a **gameplay room that is not a map** (see [Custom Gameplay Rooms](/advanced/custom-gameplay-rooms)).
`$map` and the events only exist in a map; `$room` says where the script is.

## Register it

```ts
// server.ts
import { provideScripts } from "@rpgjs/script/server"
import { createServer, provideServerModules } from "@rpgjs/server"
import chest from "./scripts/chest"

export default createServer({
  providers: [
    provideScripts({ scripts: [{ id: "chest", source: chest }] }),
    provideServerModules([]),
  ],
})
```

`provideScripts` is a module: it adds to the modules of the game, it does not replace `provideServerModules`.

```ts
// scripts/chest.ts: a script is text, so it can live in a plain module
export default `
  on("event.action", { where: { "event.name": "chest" } }, () => {
    $player.gold += 10;
    $player.showNotification("You found 10 gold");
  });
`
```

Keep the text in a `.ts` module rather than importing a file with `?raw`: the server module is also loaded by `vite.config.ts`
(`rpgjs({ server })`), which does not resolve `?raw`.

A script is `{ id, source }`, or `{ id, tree }` when the tree was already computed from the text (an editor does it once, on its
server, with `parseScript` from `@rpgjs/script/parse`). `version` is optional and names the version.

A script is **refused** when it does not parse, uses a name that does not exist, or listens to a signal the game does not have. The
reason is logged and kept in `service.errors`, and the other scripts run.

`playground/games/scripts` is a small town with a chest, a shop whose stock is shared by the players, a trap, and a zone at the bottom
that shakes the screen, all written as scripts (`src/scripts`; the zone is made by a script with `$map.createShape`). Run it with `pnpm --dir playground/games/scripts dev` (add `RPG_TYPE=mmorpg` in front for the MMORPG mode),
walk with the arrow keys, press the action key next to the chest or the shop, and step on the red block and walk to the bottom of the town.

## The language

A subset of JavaScript: `const`/`let`, functions and arrow functions, `if`/`for`/`while`, template texts, lists and objects with the
usual methods (`map`, `filter`, `find`, `reduce`, `includes`, `join`…), `??` and `?.`.

Not available: `eval`, `Function`, classes, `import`, `new`, timers, the prototype, optional calls (`a.b?.()`). A name that does not
exist is refused when the script is installed, with the line and what is available.

**Data that comes from the game is read-only**: copy it (`{ ...x }`, `[...x]`) before changing the copy. A function of the API that
returns nothing (`showText`, `addItem`…) cannot be used as a value.

A script has a budget, so that none can hurt the game: steps, 100 iterations per loop, texts of 10 000 characters, lists and objects
of 1 000 entries, call depth 20, `$state` of 10 000 characters. A script that goes over is stopped, reported in the console, and the
game goes on.

## Signals

A listener is written `on(signal, handler)` or `on(signal, filter, handler)`. The handler receives the payload `e`, which it can
read and cannot change. Listeners **observe**: none can refuse or modify what happened. They run in the order the scripts were
installed, and a listener that fails does not stop the next one.

| Signal | Emitted by | Payload |
| --- | --- | --- |
| `player.joinRoom` | `onJoinRoom` of the player, in every kind of room | `kind` (`"map"`, or the kind of the gameplay room), `id`, `mapTags` (empty when the room is not a map) |
| `player.leaveRoom` | `onLeaveRoom` of the player | `kind`, `id`, `mapTags` |
| `player.joinMap` | `onJoinMap` of the player, in a map | `map` (id of the map), `mapTags` |
| `player.leaveMap` | `onLeaveMap` of the player, in a map | `map`, `mapTags` |
| `player.inShape` | `onInShape` of the player: enters a zone of the map; `onDetectInShape` of an event: enters a zone a script attached to it | `shape.name`, `shape.x`, `shape.y`, `shape.width`, `shape.height`, `shape.eventId` (the event of an attached zone, `""` for a zone of the map) |
| `player.outShape` | `onOutShape` of the player, `onDetectOutShape` of an event: leaves a zone | the same |
| `player.touchTile` | `onMove` of the player: steps on a tile, or walks against it, whose properties have `interactive: true`; once each time the player reaches such a tile | `x`, `y` (the cell, in tiles), `properties` |
| `player.levelUp` | `onLevelUp` of the player | `gained` (levels gained), `level` (the level after the gain) |
| `player.dead` | `onDead` of the player | |
| `player.itemAdd` | `onItemAdd` of the player: items enter the inventory | `item` (id of the item), `quantity`, `itemTags` |
| `player.itemRemove` | `onItemRemove` of the player: items leave it (removed, sold, consumed by a use) | `item`, `quantity`, `itemTags` |
| `player.itemUse` | `onItemUse` of the player | `item`, `quantity`, `itemTags` |
| `player.itemEquip` | `onItemEquip` of the player: equips or takes off an item | `item`, `quantity`, `itemTags`, `equipped` |
| `player.goldChange` | `onGoldChange` of the player | `gold` (the gold after the change), `delta` (negative when the player spends) |
| `player.skillChange` | `onSkillChange` of the player | `action` (`learn`, `forget`), `skill`, `skillTags` |
| `player.connect` | `onConnected` of the player | |
| `player.disconnect` | `onDisconnected` of the player | |
| `battle.start` | `onStart` of the `battle` scope (a turn-based battle) | `troop`, `enemies` (tags) |
| `battle.command` | `onCommand` of the `battle` scope; a script observes it and never refuses it | `skill`, `hero`, `target` (tags) |
| `battle.end` | `onEnd` of the `battle` scope | `result`, `troop`, `enemies` |
| `combat.hit` | `combat.hooks.afterHit` of Action Battle, through `actionBattleHooks(scripts)`: for the attacker when it is a player, otherwise the target; nothing for a hit between two events | `damage`, `defeated`, `attacker`, `target` (`id`, `name`, `kind`) |
| `player.hotbarChange` | `onHotbarChange` of the player | `action` (`initialize`, `assign`, `clear`, `select`, `refresh`), `slots` |
| `player.projectileHit` | `onProjectileHit` of the player hit | `projectile` (`id`, `type`, `projectileId`), `x`, `y`; may reply `"pass"`, `"stick"` or `"stop"` (see [Reply to a projectile](#reply-to-a-projectile)) |
| `event.projectileHit` | `onProjectileHit` of an event; the script acts for the owner of the projectile (nothing fires when an event launched it) | `projectile`, `x`, `y`; may reply `"pass"`, `"stick"` or `"stop"` (see [Reply to a projectile](#reply-to-a-projectile)) |
| `projectile.end` | `onDestroy` of the projectiles; the script acts for the owner (nothing fires when an event launched it) | `projectile`, `reason`, `x`, `y` (where it ended: the impact, where it landed, or the end of its range), `surface` (`"target"`, `"wall"`, `"ground"`, or `""` when it flew out of range) |
| `map.tick` | `onTick` of a map with players, about 60 times a second, once for each player of the map | `map`, `deltaMs`, `tick` |
| `gui.action` | `onGuiInteraction` of the player: a GUI of the client sent an interaction (see [GUIs](#guis-of-the-client)) | `gui` (id of the GUI), `event` (the name the component sent), `data` |
| `event.action` | `onAction` of any event | `event.id`, `event.name`, `event.tags` |
| `event.touch` | `onPlayerTouch` of any event | `event.id`, `event.name`, `event.tags` |
| `timer.fire` | a timer a script started with `$player.startTimer` fires, for its player | `name` |
| `enemy.defeated` | `actionBattleHooks(scripts)` of Action Battle: a player defeats an event | `event.id`, `event.name`, `event.tags`, `enemy` (the id of the enemy when `$map.spawnEnemy` made it or the event gives one, `""` otherwise) |
| `event.arrived` | an event a script walked with `$map.moveEvent` arrives; for the player of that script | `event.id`, `event.name`, `event.tags`, `x`, `y` |

### Tags

Listen to a **kind** of thing rather than to a name: events, maps and records of the database (items, skills...) can have
tags, and the signals about them give them as a list, empty when there is none. A plugin that rewards helping any villager
does not depend on the name of each event, and keeps working when one is renamed:

```js
on("event.action", { where: { "event.tags": { has: "help" } } }, () => {
  $player.setVariable("reputation", ($player.getVariable("reputation") ?? 0) + 1);
});
on("player.itemAdd", { where: { itemTags: { has: "relic" } } }, (e) => { $player.showNotification("A relic: " + e.item); });
on("player.joinMap", { where: { mapTags: { has: "town" } } }, () => { /* entering a town */ });
```

Where the tags come from, on the server:

- an event: the `tags` of its definition (`createDynamicEvent({ event: { name, tags, ... } })`) or of `@EventData({ tags })`,
  kept in `event.tags`;
- a map: the `tags` of its data (`map.data().tags`); a Studio game sets them from the tags of the map;
- a record: its `tags` field in the database (`$data.get(type, id).tags` gives them too).

### Reply to a projectile

`event.projectileHit` and `player.projectileHit` are asked **before** the projectile decides what to do. A listener can return
`"pass"` (it flies through, as through a bush), `"stick"` (it stays planted in the target) or `"stop"` (it stops, even a piercing
one); return nothing to keep what the projectile does. The first listener that replies decides, and an event's own
`onProjectileHit` has the last word.

```js
on("event.projectileHit", { where: { "projectile.type": "arrow" } }, (e) => {
  if ($event.name === "Ghost") return "pass";
  if ($player.getVariable("sticky_arrows") === true) return "stick";
});
```

The projectile does not wait, so only a listener that **answers at once** can reply: it reads the payload, `$event`, `$player`
and `$map`, and calls only the methods that read (`getVariable`, `hasVariable`, `getItem`, `hasItem`, `getEvent`, `getEvents`,
`getPlayers`, `getShape`, `getShapes`, `getWeather`, `getLighting`). A listener that does anything else (`setVariable`,
`showText`, `wait`, a function of the script) still runs, after the hit, but its reply is ignored. Put the reply and the effects
in two listeners when you need both.

The script acts for **the player of the signal** (`$player`) and, for the event signals, for **that event** (`$event`). The signals of
the player fire in every kind of room, a map or not; `event.action` and `event.touch` only exist in a map, since events do. The zones
of `player.inShape` are the ones of the game and the ones scripts make.

`map.tick` runs on every tick of the server of a map with players (about 60 times a second), once for each player of the map, in
standalone and in MMORPG alike. The map does not wait for it: while the listeners still run for a player (a `wait`, a `showText`
or a `showChoices` the player has not answered), that player skips the next ticks. Keep a tick listener short, and use `e.deltaMs`
to count time instead of `wait`. A listener that fails is written to the console once, not on every tick.

### The filter

The filter is plain data, never computed, so it is known before anything runs. All of its entries must hold.

```js
on("player.levelUp", {
  where: { gained: { gte: 2 } },
  when: [{ variable: "tournament", eq: true }, { stat: "gold", gte: 100 }],
}, (e) => {
  $player.gold += 10 * e.gained;
});
```

- `where`: conditions on the payload, by dotted path (`"shape.name"`). A value alone means equal. Operators: `eq`, `ne`, `gt`,
  `gte`, `lt`, `lte`, `in: [...]`, `has: value` (the field is a list that contains it) and `exists: true | false`. A path that is
  not in the payload of the signal, or an operator that does not fit its type (`has` on a number), is refused when the script is
  installed.
- `when`: conditions on the player, a list.

| Condition | Holds when |
| --- | --- |
| `{ variable: "name", eq: true }` | the variable of the player matches (`gte: 3`…); a variable nobody set matches nothing |
| `{ item: "id" }` | the player has the item (or give `gte: 2`…) |
| `{ stat: "gold" \| "level", gte: 50 }` | the gold or the level matches |

Comparisons are `eq`, `ne`, `gt`, `gte`, `lt`, `lte`.

- `every`: the listener runs at most once every `every` seconds (0.05 to 3 600) **for each player**. A listener of `map.tick` runs
  about 60 times a second for each player of the map: `on("map.tick", { every: 0.5 }, ...)` runs it twice a second, and the
  service skips the other ticks before the script even starts.

### Add more signals

The mapping from the hooks of RPGJS to signals is data, so it can be extended. A binding says which hook of which module scope
(`player`, `event`, `map`, `room`, `engine`, `projectiles`) to listen to, and turns the arguments of the hook into the payload of the
signal and the context it happened in:

```ts
import { signalBinding, provideScripts } from "@rpgjs/script/server"

const input = signalBinding<[RpgPlayer, RpgActionInput<unknown>]>({
  signal: "player.input",
  scope: "player",
  hook: "onInput",
  describe: { doc: "A player presses an input.", payload: { action: { type: "string" } } },
  emit: (player, data) => ({ payload: { action: String(data.action) }, context: { player } }),
})

provideScripts({ bindings: [input], scripts })
```

`describe` adds the signal to the catalog, so a script that listens to it has its filter checked against the payload. Several
bindings may listen to the same hook. Return nothing from `emit` to emit nothing. The context is the player; the room, the map and
the event are the ones of the player unless you give them. `DEFAULT_SIGNAL_BINDINGS` lists the ones of the game.

A plugin that has its own events adds its signals with the `signals` option of `ScriptService` and sends them with `service.emit`
(see below).

## What a script can use

Every name is the one of the API of RPGJS.

### The player: `$player`

The player of the signal, with the names of `RpgPlayer`.

| Name | What it is |
| --- | --- |
| `gold` | read, and assign with `=`, `+=`, `-=`, `*=`: it never goes below 0 |
| `level`, `name` | read |
| `x`, `y`, `direction` | read: the position on the map (the top-left of the hitbox, as `changeMap` and `teleport` take it) and where the player faces (`"up"`, `"down"`, `"left"`, `"right"`) |
| `hp`, `sp` | read, and assign with `=`, `+=`, `-=`, `*=`: they stay between 0 and `maxHp` / `maxSp`; `hp` at 0 makes the player dead (`player.dead`) |
| `maxHp`, `maxSp` | read; 0 when the game gives the player no maximum (no parameters), and then nothing is capped |
| `exp` | read, and assign with `=` or `+=`: it never goes below 0, and the player levels up as it grows (`player.levelUp`) |
| `teleport({ x, y })` | moves the player at once to a position of the map they are on |
| `canMove` | read, and assign `true` or `false`: whether the player moves with its inputs. Set it to `false` for a cutscene and back to `true` after: nothing gives it back by itself |
| `cameraFollow(target, { smoothMove, time }?)` | points the camera of the player at an event (its id), or back at the player with `"player"`. `smoothMove` glides to it in `time` ms (10 000 at most). Only this player sees it |
| `startTimer(name, seconds, { repeat }?)`, `stopTimer(name)` | a timer of the player: `timer.fire` (`{ name }`) is emitted for this player after `seconds` (0.1 to 3 600), and again with `repeat`, until `stopTimer` or the player leaves the game. The same name restarts it. 20 timers per player at most |
| `showEmotionBubble(emotion)` | an emotion bubble above the player, for every player of the map: `"like"`, `"surprise"`, `"idea"`, `"question"`, `"exclamation"`… |
| `addState(id)`, `removeState(id)`, `hasState(id)`, `getStates()` | the states of the database (poison, sleep, haste…), with their effects on the parameters. `addState` gives `false` when the player already has it, `removeState` when the player does not |
| `learnSkill(id)`, `forgetSkill(id)`, `hasSkill(id)`, `getSkills()` | the skills of the player (`player.skillChange` fires). `false` when it already knows it, or does not |
| `equip(id, equipped?)`, `isEquipped(id)` | equips a weapon or an armor of the inventory, or takes it off with `false` (`player.itemEquip` fires). `false` when it cannot: not in the inventory, not equipment, refused by the class, already so |
| `useItem(id)` | uses an item of the inventory as the player would: its effects and states apply, then one is consumed (`player.itemUse` fires). `false` when it cannot |
| `startBattle(troopId, { kind }?)` | plays a troop with the battle system of the game and **waits** for the end: gives `"victory"`, `"defeat"` or `"escape"`, or `null` when the game has no battle system for it. `kind` is `"turn"` or `"tactical"`; without it the game picks. See [Battles](#battles) |
| `getItem(id)` | a copy `{ id, name, quantity }` of an item of the inventory, or `undefined` |
| `hasItem(id)`, `addItem(id, nb?)`, `removeItem(id, nb?)` | a player who has fewer items loses what they have, one who has none loses nothing |
| `getVariable(key)`, `setVariable(key, value)`, `hasVariable(key)`, `removeVariable(key)` | the variables of the player. A value is a text, a number, true/false, null or plain data of at most 2 000 characters, and is copied |
| `showText(text, options?)` | a dialogue, which waits for the player. Options: `position` (`top`, `middle`, `bottom`), `speaker`, `fullWidth`, `autoClose`, `typewriterEffect` |
| `showChoices(text, choices)` | 2 to 8 choices `{ text, value }`; gives the choice picked, or `null` when the player closes it |
| `showNotification(message, options?)` | a notification. Options: `type` (`info`, `warn`, `error`), `time` |
| `changeMap(map, { x, y }?)` | moves the player to a map |
| `useSkill(skillId, { target }?)` | uses a skill the player knows, as `player.useSkill` does; gives `false` when it cannot be used now. With Action Battle on the map, a skill with an `action` follows the battle rules: its projectile, damage formula, factions, states, SP cost and cooldown. `target` is the id of an event or a player of the map; without it, Action Battle aims at the nearest enemy within the reach of the action, whatever the player faces |
| `openGui(id, data?, options?)`, `updateGui(id, data)`, `closeGui(id, data?)` | a GUI of the client, as `player.gui(id).open(data, options)`, `.update(data)` and `player.removeGui(id, data)` do. See [GUIs](#guis-of-the-client) |

RPGJS has variables, not switches: a flag is a variable (`$player.setVariable("tournament", true)`). A private switch of an event is
a variable of the player named after the event (`$event.id + "_opened"`), as the chest of the playground does.

### GUIs of the client

A script opens the GUIs the client has (a component added with `RpgGui`, a CanvasEngine `.ce` file or a Vue component):

```ts
on("player.joinMap", () => {
  $player.openGui("quests_panel", { count: 2 }, { blockPlayerInput: true });
});

// the component sent an interaction: onInteraction("accept", { quest: "wolves" })
on("gui.action", { where: { gui: "quests_panel", event: "accept" } }, (e) => {
  $player.setVariable("quest", e.data.quest);
  $player.closeGui("quests_panel");
});
```

- The id is `a-z`, `0-9` and `_`. The GUIs of the game (`rpg-main-menu`, `rpg-title-screen`…) have a hyphen and **cannot** be opened or closed by a script. A GUI that the client does not have is an error of the client, as in RPGJS.
- `data` is plain data of at most 2 000 characters, copied; the component receives it as `data`.
- `blockPlayerInput` is the only option. The script **does not wait** for the GUI (`waitingAction` has no place in a script): it listens to `gui.action`.
- `gui.action` fires for every interaction of every GUI, including the ones of the game, and whether or not the server listens to the event with `player.gui(id).on(name, ...)`. The server hook behind it is `player.onGuiInteraction(player, { guiId, name, data })`.

### Where the script is: `$room`, `$event`

- `$room`: `kind` (`"map"` for a map, otherwise the kind of the gameplay room) and `id` of the room the script runs in.
- `$event`: `id`, `name`, `x`, `y` and `direction` of the event the script runs for (empty and 0 when there is none).

### The map: `$map`

The map the script runs in, with the names of `RpgMap`. In a room that is not a map it does not exist: using it is an error that says
so, and `$room.kind === "map"` tells before.

```js
on("player.joinMap", () => {
  if ($map.getEvent("well")) return;
  $map.createDynamicEvent({ id: "well", x: 700, y: 450, name: "well", hitbox: { width: 50, height: 50 } });
  $map.createShape({ name: "well-area", x: 650, y: 400, width: 150, height: 150 });
});

on("player.inShape", { where: { "shape.name": "well-area" } }, () => {
  $map.playSound("splash", { volume: 0.5 });
  $player.showNotification($map.getPlayers().length + " player(s) on " + $map.id);
});
```

**Events**

| Name | What it does |
| --- | --- |
| `createDynamicEvent(options)` | makes an event and gives its id. Plain data: `id` (letters, digits, `_`, `.`, `-`), `x` and `y`, and optionally `name`, `graphic` (the id of a graphic), `hitbox: { width, height }`, `through`, `forPlayer` (the event exists for the player of the script only: the others neither see nor touch it, it goes when that player leaves the map, and its id is made unique for the player). It is a real event: it listens to `event.action` and `event.touch` like the others, and has no look beyond its graphic |
| `getEvent(id)`, `getEvents()` | copies `{ id, name, x, y, direction }` of the events of the map, the ones of the game too |
| `removeEvent(id)` | removes an event **a script made**; an event of the game stays and it gives `false` |
| `getPlayers()` | `{ id, name }` of the players on the map |

**Moving events.** Every player of the map sees what an event does: a script moves the events of the game as well as its own.

| Name | What it does |
| --- | --- |
| `moveEvent(id, to, options?)` | walks an event to `{ x, y }` (its top-left when it arrives) or to `"player"`, around what blocks its way, and stops it there. `event.arrived` fires when it arrives. Options: `speed` (0.1 to 20, set on the event), `wait` (the script waits, and gets whether the event arrived: `false` when it was stopped, or after 60 seconds; without it the script goes on at once) |
| `followPlayer(id, { distance }?)` | the event follows the player, about `distance` pixels away (48 by default) |
| `fleePlayer(id, { distance }?)` | the event runs away until it is `distance` pixels away (160 by default), and again when the player comes closer |
| `stopEvent(id)` | stops what scripts made the event do (a move, a follow, a flight); the routes the event has in the game go on |
| `turnEvent(id, direction)` | turns the event to `"up"`, `"down"`, `"left"`, `"right"`, or toward the player with `"player"` |
| `teleportEvent(id, { x, y })` | puts the event at a position at once |
| `setEventVisible(id, visible)` | hides the event (no sprite, collision, touch or action; `getEvent` gives `undefined`) and shows it again where it was, with its state, as `event.suspend()` and `resume()` do |

A follow or a flight lasts until `stopEvent`, another move of the same event, or the player leaving the map. **50 events** of a map
at most follow or flee at once.

```js
// the guard sees the player in front of it, chases them, and gives up when it loses them
on("map.tick", { every: 0.5 }, () => {                // twice a second for each player
  const guard = $map.getEvent("guard");
  if (!guard) return;
  const sees = inSight(guard, { x: $player.x, y: $player.y }, { range: 180, walls: true });
  if (sees && !$player.getVariable("seen")) {
    $player.setVariable("seen", true);
    $map.turnEvent("guard", "player");
    $map.showEmotionBubble("guard", "exclamation");
    $map.followPlayer("guard", { distance: 32 });
  } else if (!sees && $player.getVariable("seen")) {
    $player.setVariable("seen", false);
    $map.stopEvent("guard");
  }
});
```

**Zones attached to an event**

| Name | What it does |
| --- | --- |
| `attachShape(eventId, zone)` | attaches a zone to the event and gives its name: it moves with the event, and with `follow: "direction"` it turns with it. A circle of `radius`, or around `width` x `height`; with `angle` below 360 a cone facing `direction`; with `limitedByWalls` the walls hide what is behind them. Also `name`, `positioning` (`center`, `top`, `bottom`, `left`, `right`), `properties`. Players entering and leaving it fire `player.inShape` and `player.outShape`, with `shape.eventId`. It counts in the 50 zones of scripts, and `removeShape(name)` removes it |

```js
on("player.joinMap", () => {
  if ($map.getEvent("healer")) $map.attachShape("healer", { name: "aura", radius: 80 });
});
on("player.inShape", { where: { "shape.eventId": "healer" } }, () => {
  $player.hp = $player.maxHp;
});
```

**How events look**

| Name | What it does |
| --- | --- |
| `setEventGraphic(id, graphic)` | changes the graphic of an event: an opened chest, a lit torch |
| `playEventAnimation(id, animationName, times?)` | plays an animation of its graphic (attack, skill…) `times` times (1 by default, 100 at most), then the event walks and stands as before |
| `showEmotionBubble(id, emotion)` | an emotion bubble above an event: `"surprise"` when a guard sees the player |

```js
on("event.action", { where: { "event.name": "chest" } }, () => {
  const key = $event.id + "_opened";
  if ($player.getVariable(key)) return;
  $player.setVariable(key, true);
  $map.setEventGraphic($event.id, "chest_open");
  $player.addItem("potion", 1);
});
```

**Enemies**

| Name | What it does |
| --- | --- |
| `spawnEnemy({ enemy, x, y, id?, name?, forPlayer? })` | makes an enemy appear and gives the id of its event: the game turns the event into the enemy `enemy`. It counts in the 50 events of scripts, `removeEvent` removes it, and it is refused when the game has no such enemy. `forPlayer` makes it for the player of the script only. `enemy.defeated` fires when a player defeats it |

The game says what an enemy is: a module implements `scriptEnemy.create(event, enemyId)`, makes the enemy and returns `true` (it
returns nothing for an enemy it does not know). A Studio game does it already, from the enemies of its database, with their battle
AI. With Action Battle in your own game:

```ts
import { createActionEnemy } from "@rpgjs/action-battle/server";
import { Slime, Wolf } from "./enemies";

const presets = { slime: Slime, wolf: Wolf };

export default defineModule<RpgServer>({
  scriptEnemy: {
    create(event, enemyId) {
      if (!presets[enemyId]) return;
      createActionEnemy(event, enemyId, presets);
      return true;
    },
  },
} as RpgServer);
```

**Tiles**

| Name | What it does |
| --- | --- |
| `getTile(x, y)` | the tile at a position in pixels: `{ x, y, collision, properties, layers }`, its cell in tiles, whether it blocks, and the properties of its tiles (`properties` merges them, the top layer wins). `undefined` when the map has no tiles (it is not a Tiled map) or outside of it |

A tile whose properties have `interactive: true` fires `player.touchTile` when a player steps on it or walks against it (a barrel
that blocks): give the barrels, the levers or the lava of a tileset that property in Tiled.

```js
on("player.touchTile", (e) => {
  if (e.properties.kind === "barrel") $player.showText("An old barrel. It smells of wine.");
  if (e.properties.kind === "lava") $player.hp -= 10;
});
```

**Variables of the map**: `getVariable(key)`, `setVariable(key, value)`, `hasVariable(key)`, `removeVariable(key)`. They are shared by
the players of the map, separate from the variables of a player, and hold the same plain values.

**Zones** (shapes)

| Name | What it does |
| --- | --- |
| `createShape(zone)` | makes a zone and gives its name. Plain data: `x`, `y`, `width`, `height`, and optionally `name`, `z`, `color` (`"#rrggbb"`), `collision`, `properties` (plain data, 1 000 characters). The players who enter and leave it fire `player.inShape` and `player.outShape` |
| `getShape(name)`, `getShapes()` | copies `{ name, x, y, width, height }` of the zones of the map, the ones of the game too |
| `removeShape(name)` | removes a zone **a script made**; a zone of the game stays and it gives `false` |

**Weather and lighting.** They are plain data of at most 4 000 characters, with the fields RPGJS knows (see the guides of the weather
and the lighting). `setWeather` needs an `effect` or a `preset`; `patchWeather` changes some fields and merges `params`.

| Name | What it does |
| --- | --- |
| `getWeather()`, `setWeather(state)`, `patchWeather(patch)`, `clearWeather()` | the weather of the map: `{ effect, preset, params, transitionMs, durationMs }`. `setWeather(null)` clears it |
| `getLighting()`, `setLighting(state)`, `patchLighting(patch)`, `clearLighting()` | the lighting: `{ ambient, spots, sun, shadows, dayNight }`. `setLighting(null)` clears it |
| `setDay()`, `setNight()` | turns the day or the night on |
| `transitionLighting(to, options?)` | moves the lighting to another one. Options: `duration` (0 to 600 000 ms), `easing` (`"linear"`, `"easeInOut"`) |

**Sounds and effects**, for the players of the map

| Name | What it does |
| --- | --- |
| `playSound(id, options?)`, `stopSound(id)` | a sound of the game. Options: `volume` (0 to 1), `loop` |
| `showAnimation({ x, y }, graphic, animationName?)` | an animation of a graphic at a position (`"default"` when no name) |
| `showComponentAnimation(id, { x, y }, params?)` | an animation made by a component of the game, with plain data as `params` |
| `shakeMap(options?)` | shakes the screen. Options: `intensity` (0 to 100), `duration` (0 to 10 000 ms), `frequency` (1 to 60), `direction` (`"x"`, `"y"`, `"both"`) |
| `launchProjectile({ projectile, from, toward, ... })` | launches a projectile (its type: what the clients draw it with, see `projectiles.looks`) and gives its id. `damage` is HP removed from each player or event it hits, as is (no defense, no faction): for a hit that follows the battle rules, use `$player.useSkill`. It flies straight and hits the first player or event on its way. Options: `damage`, `speed` (1 to 2 000), `range` (1 to 5 000), `arc` (`true` or `{ height }`, 0 to 500: lobbed over everything, it lands on `toward` or short of it at `range`), `landingRadius` (0 to 500, with `arc`: hits the players and events that close to where it lands), `delay` (0 to 10 000 ms of wind-up), `owner: "player"` (the player of the script launches it: it flies through them, and `projectile.end` and `event.projectileHit` fire for them; without it the projectile has no owner, can hit any player, and those signals do not fire). Listen to `projectile.end` for where it ended |
| `playVisualEffect({ effect, at, ... })` | a one-shot particle effect at a point. `effect` names a built-in preset, or the effect of `preset` (a particle preset `{ emitters: [...] }`, such as the resolved preset of a Studio Visual Effect). Options: `duration` (0 to 10 000 ms), `scale` (0.1 to 10) |

**Limits.** A script makes **50 events** and **50 zones** on a map at most, an id or a name that is already on the map is refused, a
number outside its range is refused with the range, and a description with a key RPGJS does not take is refused with the keys that
are accepted. Only what a script made can be removed by a script.

### Shared properties and state

A script declares what the players of a room share, and every player reads and changes the same value:

```js
shared({ stock: { initial: 3, client: true, persist: false } });

on("event.action", { where: { "event.name": "shop" } }, () => {
  if (!$shared.take("stock", 1)) { $player.showNotification("Sold out"); return; }
  $player.addItem("Potion", 1);
});
```

In a map they live on the map with `map.setSync`, under the prefix `script_` (`script_stock`), so a script cannot reach another
property of the map. In a gameplay room that is not a map they live in the `state` of the room, under the same prefix: RPGJS
synchronizes that state with the clients, and the state of the room then holds the `script_*` keys next to its own. A lobby has
neither, and a script that uses shared properties there gets an error that says so.

`client: true` sends the value to the clients. `$shared.take(name, amount)` tests and decreases in one step: two players cannot both
take the last one.

`$state` is data kept by the script, in memory: assign a whole value, `$state.crafted = { ...$state.crafted, potion: 1 }`.

### The database: `$data`

A script reads the records of the database of the game, and never changes them:

```js
on("event.action", { where: { "event.name": "old-man" } }, () => {
  const quest = $data.get("quests_quest", "wolves");   // a copy, or undefined
  if (!quest) return;
  $player.showText(`${quest.name}: ${quest.story}`);
  $player.setVariable("quest_wolves", "started");
  $player.gold += quest.reward;
});
```

| Name | What it gives |
| --- | --- |
| `$data.get(type, id)` | a copy of the record of that collection with that id, or `undefined`. It has its fields, its `id` and its `type`. |
| `$data.list(type)` | copies of the records of the collection, **1 000 at most**. |

`type` is the collection: `item`, `skill`, or any type of record a game puts in its database (a collection that Studio plugins add, for
example). On a real game the records are the ones RPGJS keeps in the database of the room (`map.database()`): a record is plain
data with `_type` for its collection, as `@rpgjs/studio` loads it; a record that is a class of the game is not given. A record is
a copy of plain data: what a script changes of it changes nothing, and the next read is as the game has it. A collection that does
not exist gives `undefined` and `[]`.

### Outside services: `$http`

A script reaches an outside service (a weather API, a leaderboard, a webhook) only through a **connection** the game declares. The
script names the connection; the game keeps its address, its headers and its secrets, and does the networking. Without connections
there is no `$http`: it is not described, and a script that uses it is refused.

```js
on("event.action", { where: { "event.name": "oracle" } }, () => {
  const res = $http.request("meteo_api", { path: "/v1/forecast", query: { city: "Paris" } });
  if (!res.ok) { $player.showNotification("The sky is silent"); return; }
  $player.showText(`Tomorrow: ${res.json.summary}`);
});
```

`$http.request(connection, { method?, path?, query?, body? })` waits for the answer, as `showChoices` does, and gives
`{ ok, status, json?, text?, error? }`:

- `path` starts with `/`, and holds no `//`, `..`, `?` or `#`: the query goes in `query`, a flat object of texts, numbers and
  true/false. `method` is `GET` unless the connection allows another; `body` is plain data, sent as JSON. A request that breaks a
  rule, names a connection the game does not declare, or uses a method it does not allow is an error of the script, and never
  reaches the network. A literal connection name is checked when the script is.
- `ok` is a status in 200–299. A JSON answer is in `json` (read-only data, as `$data` gives); any other in `text`.
- It never throws for the network: `error` is `"network"`, `"timeout"`, `"refused"` or `"quota"` (given by the game),
  `"too_large"` (an answer above `httpBodyMax`), or `"budget"` (a handler run makes `httpPerHandler` requests at most).
- It is refused in a listener of `map.tick`, which runs for every player many times a second, even through a function.

The game gives the connections with `provideScripts({ scripts, http })`. The transport receives the checked request and the context
of the run (the script, the player, an `AbortSignal`, the size to read at most), and gives back the status and the body as text:

```ts
import { provideScripts, type HttpTransport } from "@rpgjs/script/server";

const http: HttpTransport = {
  connections: { meteo_api: { methods: ["GET"] } },
  async send(request, { signal, maxBytes }) {
    const url = new URL(request.path, "https://api.example.com");
    for (const [key, value] of Object.entries(request.query ?? {})) url.searchParams.set(key, String(value));
    const res = await fetch(url, { method: request.method, signal, redirect: "error", headers: { authorization: `Bearer ${process.env.METEO_KEY}` } });
    return { status: res.status, body: (await res.text()).slice(0, maxBytes + 1), contentType: res.headers.get("content-type") ?? "" };
  },
};

provideScripts({ scripts, http, limits: { steps: 10_000, iterations: 100, httpPerHandler: 3, httpBodyMax: 256_000, httpTimeout: 10 } });
```

The rules of the network belong to the transport: the base URL of each connection, refusing internal addresses and redirects,
secrets, quotas, logs. What `send` throws never reaches the script, which gets `"network"`; the reason is written to the console of
the server. `send` may give an error code of its own, `{ error: "quota" }`; a code other than `refused`, `quota`, `timeout` or
`network` becomes `network`. `httpTimeout` (seconds, 10 by default, 60 at most) aborts the request through its `AbortSignal`.

In `simulate()` and `runTests()`, `http` gives the connections and their fake answers, so nothing touches the network; each request
that reaches the network is an `http` effect:

```ts
await simulate({
  source,
  emit: { signal: "event.action", payload: { event: { id: "oracle-1", name: "oracle", tags: [] } } },
  http: { meteo_api: { status: 200, json: { summary: "sunny" } }, scores: { methods: ["POST"], status: 201 } },
});
```

`checkScript(source, catalog, { http: { connections } })` and `describeGameApi(signals, { http: { connections } })` check and
describe a script with the connections of the game.

### Helpers

| Name | What it is |
| --- | --- |
| `wait(seconds)` | pauses the script (60 seconds at most) |
| `random(min, max)` | a whole number, both included |
| `Item("id")` | a reference to an item of the database, checked when the script is saved |
| `log(...values)` | writes a line where the author reads it: the console of the server (or `onLog`) and `service.logs`, with the id of the script. Texts as they are, anything else as JSON, 500 characters at most. A simulation keeps it in its effects (`log`) |
| `distance(a, b)` | the distance between two points `{ x, y }`, in pixels |
| `inSight(from, to, options?)` | whether `to` is in sight of `from`: within `range` pixels (200 by default), within `angle` degrees of where `from` faces (90 by default when `from` has a `direction`, a full circle otherwise), and with `walls: true`, with no wall between them. `from` is often an event: `inSight($map.getEvent("guard"), { x: $player.x, y: $player.y })` |
| `$hook` | the payload of the signal, as `$hook.map` (`e` is the same data) |

### The API of RpgPlayer and RpgMap

Most of the public API of the engine is given to scripts with its own names: a name that **mirrors** a method or a property of
`RpgPlayer` or `RpgMap`. Its arguments are checked against its signature (a wrong one is refused with the name of the parameter:
`options.type must be "alpha" or "tint" or "both"`), then given to the engine as they are, and what the engine gives back is copied
as plain data. `describeGameApi()` lists them all with their signatures.

| On | Names |
| --- | --- |
| physics of the player | `through`, `throughEvent`, `throughOtherPlayer`, `pushable`, `speed`, `frequency`, `z`, `directionFixed`, `animationFixed` (read and assign); `hitbox`, `mass` (read); `setHitbox`, `setMass`, `setSizes`, `knockbackActive` |
| look | `tint`, `graphics`, `animationName`; `setGraphic`, `setGraphicAnimation`, `setAnimation`, `flash`, `showHit`, `showComponentAnimation`, `setComponentsTop` / `Bottom` / `Left` / `Right` / `Center`, `removeComponents`, `showAttachedGui`, `hideAttachedGui` |
| parameters and battle | `parameters`, `paramsModifier`, `atk`, `pdef`, `sdef`, `effects`, `elements`, `elementsEfficiency`, `statesEfficiency`, `expCurve`, `initialLevel`, `finalLevel`, `expForNextlevel`; `addParameter`, `setParameter`, `getParamValue`, `getParamItem`, `hasEffect`, `applyDamage(attackerId, skillId?)`, `setClass`, `setActor`, `changeActor` |
| moves | `dash`, `knockback`, `followPath`, `oscillate`, `applyIceMovement`, `shootProjectile`, `clearMovements`, `hasActiveMovements`, `moveRoutes`, `infiniteMoveRoute`, `breakRoutes`, `replayRoutes`, `autoChangeMap` |
| sounds, loot, items, hotbar | `playSound`, `stopSound`, `stopAllSounds`, `dropLoot`, `buyItem`, `sellItem`, `getHotbar`, `getHotbarCapacity`, `configureHotbar`, `selectHotbarSlot`, `clearHotbarSlot`, `useHotbarSlot`, `useActiveHotbarSlot`, `placeHotbarItem`, `showHotbar`, `hideHotbar`, `refreshHotbar` |
| GUIs of the game | `callShop`, `callMainMenu`, `callGameover`, `showInput`, `showSave`, `showLoad`, `showSaveLoad`, `showCharacterSelect` |
| the rest | `changeRoom`, `getVariableKeys`, `clearVariables`, `setLocale`, `getLocale`, `t(key, params?)`, `getShapes`, `getInShapes` |
| the map | `widthPx`, `heightPx`; `getPlayer`, `getTick`, `queryArea`, `queryHitbox`, `findSpawnPosition`, `getInteractableObjectIds`, `isMoving`, `movePlayer`, `getBodyPosition`, `setBodyPosition`, `updateHitbox`, `suspendEvents`, `resumeEvents`, `getSuspendedEvents`, `isEventSuspended`, `addInDatabase`, `removeInDatabase`, `dropLoot`, `broadcast`, `getVariableKeys`, `clearVariables` |

What the engine takes in another form than data is given as data, and translated:

- **A route** is a list of steps: a name of `Move` (`up`, `tileLeft`, `random`, `towardPlayer`, `turnTowardPlayer`…), `{ name: repeat }`,
  or `{ wait: seconds }`: `["up", { tileRight: 2 }, "turnTowardPlayer", { wait: 0.5 }]`. "Player" is the player of the script.
- **A component** is `{ type: "text", value: "{name}" }`, `{ type: "hpBar" }`, `{ type: "image", value: "icon" }`… as `Components` makes them.
- **An attacker** (`applyDamage`) is the id of a player or an event of the map; **an area** (`queryArea`) is `{ x, y, radius }` or
  `{ x, y, width, height }`; **events to hide** (`suspendEvents`) are a list of ids.

**An event has the same.** `$map.eventCall(id, method, ...args)` calls on an event a method a character has, `$map.eventGet(id, property)`
reads a property and `$map.eventSet(id, property, value)` changes it, checked the same way:

```js
on("event.action", { where: { "event.name": "guard" } }, () => {
  $map.eventSet("guard", "speed", 6);
  $map.eventCall("guard", "flash", { type: "tint", tint: "#ff0000" });
  $map.eventCall("guard", "moveRoutes", ["left", "left", { wait: 0.5 }, "turnTowardPlayer"]);
});
```

### Battles

`$player.startBattle(troopId, { kind })` asks the battle systems of the game to play a troop, through the hooks a battle module
implements: `studioBattle: { start, startTurnBased, startTactical }` (the ones the battle blocks of the Studio call). Without `kind`
it calls `start`, with `"turn"` `startTurnBased`, with `"tactical"` `startTactical`. The module that plays the troop returns
`{ outcome }` when the battle is over; a player who leaves a tactical battle escaped. `battle.start` and `battle.end` fire as for any
battle.

```js
on("player.inShape", { where: { "shape.name": "trap" } }, () => {
  const outcome = $player.startBattle("wolves");
  if (outcome === "defeat") { $player.hp = 1; $player.changeMap("village", { x: 120, y: 200 }); }
});
```

### What scripts have of the engine

Every public method and property of `RpgPlayer`, `RpgEvent`, `RpgMap`, the GUIs (`Gui`) and the projectiles of the server, and every
export of `@rpgjs/action-battle`, is either given to scripts (by a name, or by the signal that tells it) or left out on purpose, with
the reason. What is left out is only what is not gameplay (the life cycle, the synchronization, the hooks of the engine), the private
methods of the engine, and what takes or gives what is not data (a class, a function, a body of the physics engine):
`ENGINE_COVERAGE` of `@rpgjs/script/testing` lists the decisions. A test of `@rpgjs/script` fails when a method of the engine has
none, so a new method gets a decision instead of being forgotten.

## Install scripts while the game runs

```ts
import { ScriptService, provideScripts } from "@rpgjs/script/server"

const scripts = new ScriptService()
// providers: [provideScripts(scripts), provideServerModules([])]

scripts.install({ id: "late", source: `on("player.dead", () => { $player.showNotification("Careful!"); });` })
scripts.uninstall("late")
```

`inject(ScriptService)` gives the service back. `service.listeners("player.dead")` says who listens, in the order they run, with
their filter.

**Keep `$state` between two starts.** Without a store, `$state` lives in memory and is lost when the server stops. Give the service a
`stateStore`: it reads the state of a script once, when the script is installed (a signal waits for it), and saves it after the
changes of a turn. `await scripts.flushState()` saves what is left before the server stops. A store that fails is reported and the
game goes on.

```ts
import { readFile, writeFile } from "node:fs/promises"

const scripts = new ScriptService({
  stateStore: {
    load: async (script) => JSON.parse(await readFile(`state/${encodeURIComponent(script)}.json`, "utf8").catch(() => "{}")),
    save: (script, data) => writeFile(`state/${encodeURIComponent(script)}.json`, JSON.stringify(data)),
  },
  onLog: ({ script, message }) => console.log(`[${script}] ${message}`),
})
```

`scripts.logs` keeps the last 200 lines the scripts wrote with `log(...)`, with their script and their time.

**Enemies that fall.** `actionBattleHooks(scripts)` given to Action Battle (`provideActionBattle({ combat: { hooks: actionBattleHooks(scripts) } })`)
emits `combat.hit` after each hit, and `enemy.defeated` when a player defeats an event.

A plugin that has its own events adds its signals, so that scripts can listen to them and the compiler can check their payload:

```ts
const scripts = new ScriptService({
  signals: { "quests.start": { payload: { questId: { type: "string" } } } },
})

await scripts.emit("quests.start", { questId: "wolves" }, { player })
```

## Write and test scripts without the game

`@rpgjs/script/testing` runs a script in an in-memory world:

```ts
import { checkScript, runTests, simulate, describeGameApi } from "@rpgjs/script/testing"

describeGameApi()                       // the API and the signals, as TypeScript declarations: give them to an agent
checkScript(source)                     // { ok, diagnostics and warnings with lines, listeners, permissions, shared… }

await simulate({
  source,
  emit: { signal: "player.levelUp", payload: { gained: 3 } },
  world: { player: { gold: 10 } },
})                                      // { effects, state, listeners: which ran and why the others did not }

await runTests(source, [
  { name: "levels up", emit: { signal: "player.levelUp", payload: { gained: 3 } }, expect: { "player.gold": 40 } },
])
```

`checkScript` is what an editor calls before it saves a script. Besides what refuses a script when it is installed, it checks the
calls of the API against their declarations: a call with fewer arguments than the required parameters, more than the function
takes, or a literal of another kind than a `string`, `number` or `boolean` parameter is refused with the line and the signature:

```ts
checkScript(`export function close() {\n  $player.closeGui();\n}`).diagnostics
// [{ line: 2, message: '"$player.closeGui" needs at least 1 argument (id: string, data?: object), got 0' }]
```

A script already installed in a game is not refused for its arguments when the game starts: the check is made when it is saved, as
the references of `Item("…")` to the catalog are.

`checkScript` also gives **warnings**, which do not refuse the script but point at what is likely wrong, with the line: a listener
of `map.tick` without `every`, a `showText`, `showChoices`, `wait` or `startBattle` inside one (the ticks of the player are skipped
until it is done), an event or a zone or a timer made in a loop, a `followPlayer` or `fleePlayer` that nothing stops, and
`$player.canMove = false` never set back to `true`.

`describeGameApi()` starts with the API **by family** (rewards and dialogues, positions and sight, zones, movement and cutscenes,
look of events, scenery, battle and character, time, debugging), each with its names and an example: an agent finds the family of
a request first.

The world of a simulation is a map called `start` by default; `world: { room: { id: "battle-1", kind: "battle" } }` makes it a room
that is not a map, `events` and `shapes` put the events and the zones of the game on the map, and `data` (`{ quests_quest: [{ id: "wolves", name: "Wolves" }] }`) the records of its database, for `$data`.

`expect` keys are `returns`, `error`, `effects`, `effectsInclude`, `effectsExclude`, `texts`, `notifications`, and paths
`player.gold`, `player.items.<id>`, `shared.<name>`, `state.<key>`, `vars.<name>`; a value is exact or `{ min, max }`.
The effects are named after the call that made them: `showText`, `showNotification`, `showChoices`, `changeMap`, `openGui`, `addItem`,
`removeItem`, `setVariable`, `removeVariable`, `useSkill`, `gold` (with the new `value`), `wait`, `sync` (a shared property), `state`, and the
ones of the map: `createDynamicEvent`, `removeEvent`, `createShape`, `removeShape`, `setMapVariable`, `removeMapVariable`,
`setWeather`, `patchWeather`, `clearWeather`, `setLighting`, `patchLighting`, `clearLighting`, `setDay`, `setNight`,
`transitionLighting`, `playSound`, `stopSound`, `showAnimation`, `showComponentAnimation`, `shakeMap`, `launchProjectile`, `playVisualEffect`.

## Run your own world

The behavior of every name is written once over a port, `ScriptWorld`, that has the shape of the API of RPGJS (`getItem`, `addItem`,
`getVariable`, `showText`, `showChoices`, and a `MapPort` for the map). `createRpgjsWorld({ player, map?, room?, event?, shared?, hook? })`
implements it with the API of RPGJS, and `SimWorld` in memory. A host with its own vocabulary, such as a block editor, implements it
with its own operations, and gets the same behavior.

| Entry | For |
| --- | --- |
| `@rpgjs/script/server` | `provideScripts`, `ScriptService`, `signalBinding`, `createRpgjsWorld` |
| `@rpgjs/script/core` | the interpreter, `SignalRegistry`, the API and `ScriptWorld`: no dependency on the engine |
| `@rpgjs/script/parse` | `parseScript`: the text of a script to its tree |
| `@rpgjs/script/testing` | `checkScript`, `simulate`, `runTests`, `SimWorld` |

### Signals of a module and of Action Battle

A module binds its own hooks with a scope of its own (`scope: "tactical"`), and the tools take the signals it adds:

```ts
checkScript(source, catalog, { signals });                              // a signal of a module is accepted only when given
simulate({ source, signals, emit: { signal: "tactical.defeat", payload } });
runTests(source, tests, catalog, signals);
describeGameApi(signals);
```

`combat.hit` comes from Action Battle:

```ts
import { ScriptService, provideScripts, actionBattleHooks } from "@rpgjs/script/server";

const scripts = new ScriptService();
provideScripts(scripts);
provideActionBattle({ combat: { hooks: actionBattleHooks(scripts) } });
```
