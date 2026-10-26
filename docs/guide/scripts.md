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
| `player.joinRoom` | `onJoinRoom` of the player, in every kind of room | `kind` (`"map"`, or the kind of the gameplay room), `id` |
| `player.leaveRoom` | `onLeaveRoom` of the player | `kind`, `id` |
| `player.joinMap` | `onJoinMap` of the player, in a map | `map` (id of the map) |
| `player.leaveMap` | `onLeaveMap` of the player, in a map | `map` |
| `player.inShape` | `onInShape` of the player: enters a zone of the map | `shape.name`, `shape.x`, `shape.y`, `shape.width`, `shape.height` |
| `player.outShape` | `onOutShape` of the player: leaves a zone | the same |
| `player.levelUp` | `onLevelUp` of the player | `gained` (levels gained), `level` (the level after the gain) |
| `player.dead` | `onDead` of the player | |
| `event.action` | `onAction` of any event | `event.id`, `event.name` |
| `event.touch` | `onPlayerTouch` of any event | `event.id`, `event.name` |

The script acts for **the player of the signal** (`$player`) and, for the event signals, for **that event** (`$event`). The signals of
the player fire in every kind of room, a map or not; `event.action` and `event.touch` only exist in a map, since events do. The zones
of `player.inShape` are the ones of the game and the ones scripts make.

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
| `getItem(id)` | a copy `{ id, name, quantity }` of an item of the inventory, or `undefined` |
| `hasItem(id)`, `addItem(id, nb?)`, `removeItem(id, nb?)` | a player who has fewer items loses what they have, one who has none loses nothing |
| `getVariable(key)`, `setVariable(key, value)`, `hasVariable(key)`, `removeVariable(key)` | the variables of the player. A value is a text, a number, true/false, null or plain data of at most 2 000 characters, and is copied |
| `showText(text, options?)` | a dialogue, which waits for the player. Options: `position` (`top`, `middle`, `bottom`), `speaker`, `fullWidth`, `autoClose`, `typewriterEffect` |
| `showChoices(text, choices)` | 2 to 8 choices `{ text, value }`; gives the choice picked, or `null` when the player closes it |
| `showNotification(message, options?)` | a notification. Options: `type` (`info`, `warn`, `error`), `time` |
| `changeMap(map, { x, y }?)` | moves the player to a map |

RPGJS has variables, not switches: a flag is a variable (`$player.setVariable("tournament", true)`). A private switch of an event is
a variable of the player named after the event (`$event.id + "_opened"`), as the chest of the playground does.

### Where the script is: `$room`, `$event`

- `$room`: `kind` (`"map"` for a map, otherwise the kind of the gameplay room) and `id` of the room the script runs in.
- `$event`: `id`, `name`, `x`, `y` of the event the script runs for (empty and 0 when there is none).

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
| `createDynamicEvent(options)` | makes an event and gives its id. Plain data: `id` (letters, digits, `_`, `.`, `-`), `x` and `y`, and optionally `name`, `graphic` (the id of a graphic), `hitbox: { width, height }`, `through`. It is a real event: it listens to `event.action` and `event.touch` like the others, and has no look beyond its graphic |
| `getEvent(id)`, `getEvents()` | copies `{ id, name, x, y }` of the events of the map, the ones of the game too |
| `removeEvent(id)` | removes an event **a script made**; an event of the game stays and it gives `false` |
| `getPlayers()` | `{ id, name }` of the players on the map |

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

### Helpers

| Name | What it is |
| --- | --- |
| `wait(seconds)` | pauses the script (60 seconds at most) |
| `random(min, max)` | a whole number, both included |
| `Item("id")` | a reference to an item of the database, checked when the script is saved |
| `$hook` | the payload of the signal, as `$hook.map` (`e` is the same data) |

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
checkScript(source)                     // { ok, diagnostics with lines, listeners, permissions, shared… }

await simulate({
  source,
  emit: { signal: "player.levelUp", payload: { gained: 3 } },
  world: { player: { gold: 10 } },
})                                      // { effects, state, listeners: which ran and why the others did not }

await runTests(source, [
  { name: "levels up", emit: { signal: "player.levelUp", payload: { gained: 3 } }, expect: { "player.gold": 40 } },
])
```

The world of a simulation is a map called `start` by default; `world: { room: { id: "battle-1", kind: "battle" } }` makes it a room
that is not a map, `events` and `shapes` put the events and the zones of the game on the map.

`expect` keys are `returns`, `error`, `effects`, `effectsInclude`, `effectsExclude`, `texts`, `notifications`, and paths
`player.gold`, `player.items.<id>`, `shared.<name>`, `state.<key>`, `vars.<name>`; a value is exact or `{ min, max }`.
The effects are named after the call that made them: `showText`, `showNotification`, `showChoices`, `changeMap`, `addItem`,
`removeItem`, `setVariable`, `removeVariable`, `gold` (with the new `value`), `wait`, `sync` (a shared property), `state`, and the
ones of the map: `createDynamicEvent`, `removeEvent`, `createShape`, `removeShape`, `setMapVariable`, `removeMapVariable`,
`setWeather`, `patchWeather`, `clearWeather`, `setLighting`, `patchLighting`, `clearLighting`, `setDay`, `setNight`,
`transitionLighting`, `playSound`, `stopSound`, `showAnimation`, `showComponentAnimation`, `shakeMap`.

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
