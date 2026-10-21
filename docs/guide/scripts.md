---
title: "Scripts"
description: "Sandboxed scripts that listen to the signals of the game, with @rpgjs/script: a JavaScript subset run by its own interpreter."
---

# Scripts

`@rpgjs/script` lets a game, an editor or an AI agent add gameplay as **text** without giving it the keys of the game. A script is
written in a subset of JavaScript and run by its own interpreter: it is **never** evaluated as JavaScript, so it can only use what
the game exposes, and it is stopped when it uses too much.

A script does not call the game. It **listens** to the signals of the game (a player levels up, an event is activated…) and reacts.

## Where it runs

The server owns the gameplay state, so scripts run on the server: in an MMORPG (Node or Cloudflare) and in a standalone game, where
the server part runs next to the client. Scripts are never sent to players. The interpreter has no dependency on the engine
(`@rpgjs/script/core`), so it also runs in a Worker or a browser, for example to check a script before saving it.

> Verified with `@rpgjs/testing`, which starts the server engine in the test process. A game started with `provideRpg(startServer)`
> was not run with scripts yet.

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
    notify("You found 10 gold");
  });
`
```

Keep the text in a `.ts` module rather than importing a file with `?raw`: the server module is also loaded by `vite.config.ts`
(`rpgjs({ server })`), which does not resolve `?raw`.

A script is `{ id, source }`, or `{ id, tree }` when the tree was already computed from the text (an editor does it once, on its
server, with `parseScript` from `@rpgjs/script/parse`). `version` is optional and names the version.

A script is **refused** when it does not parse, uses a name that does not exist, or listens to a signal the game does not have. The
reason is logged and kept in `service.errors`, and the other scripts run.

## Signals

| Signal | Emitted by | Payload |
| --- | --- | --- |
| `player.joinMap` | `onJoinMap` of the player | `map` (id of the map) |
| `player.leaveMap` | `onLeaveMap` of the player | `map` |
| `player.levelUp` | `onLevelUp` of the player | `gained` (levels gained) |
| `player.dead` | `onDead` of the player | |
| `event.action` | `onAction` of any event | `event.id`, `event.name` |
| `event.touch` | `onPlayerTouch` of any event | `event.id`, `event.name` |

The script acts for **the player of the signal** (`$player`) and, for the event signals, for **that event** (`$event`, `$self`).

> While `player.levelUp` runs, `$player.level` is still the level **before** the gain: RPGJS sends the hook before it sets the
> level. The new level is `$player.level + e.gained`.

A listener is written `on(signal, handler)` or `on(signal, filter, handler)`. The handler receives the payload `e`, which it can
read and cannot change. Listeners **observe**: none can refuse or modify what happened. They run in the order the scripts were
installed, and a listener that fails does not stop the next one.

### The filter

The filter is plain data, never computed, so it is known before anything runs. All of its entries must hold.

```js
on("player.levelUp", {
  where: { gained: { gte: 2 } },
  when: [{ switch: "tournament" }, { stat: "gold", gte: 100 }],
}, (e) => {
  $player.gold += 10 * e.gained;
});
```

- `where`: conditions on the payload, by dotted path. A value alone means equal. Operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`,
  `in: [...]`, `has: value` (the field is a list that contains it) and `exists: true | false`. A path that is not in the payload
  of the signal, or an operator that does not fit its type (`has` on a number), is refused when the script is installed.
- `when`: conditions on the player, a list.

| Condition | Holds when |
| --- | --- |
| `{ switch: "name" }` | the switch is on (`is: false` for off) |
| `{ variable: "name", gte: 3 }` | the numeric variable matches (a variable never set is 0) |
| `{ item: "id" }` | the player has the item (or give `gte: 2`…) |
| `{ stat: "gold" \| "level", gte: 50 }` | the gold or the level matches |

Comparisons are `eq`, `ne`, `gt`, `gte`, `lt`, `lte`.

## What a script can use

| Name | What it is |
| --- | --- |
| `$player` | `gold` (read, `=` `+=` `-=` `*=`), `level`, `name`, `itemCount(id)`, `hasItem(id)`, `addItem(id, n?)`, `removeItem(id, n?)` |
| `$event` | `id`, `x`, `y` of the event the script runs for |
| `$switch.name`, `$var.name` | the switches (`=` only) and numeric variables (`=` `+=` `-=` `*=` `/=` `%=`) of the player |
| `$self.A` … `$self.F` | switches private to the event |
| `$shared` | properties shared by the players of the map (below) |
| `$hook` | the payload of the signal, as `$hook.map` (`e` is the same data) |
| `$state` | data kept by the script. Assign a whole value: `$state.crafted = { ...$state.crafted, potion: 1 }` |
| `say(text, options?)` | a dialogue, which waits for the player |
| `notify(message, options?)` | a notification |
| `choice(["Yes", "No"])` | asks the player, returns the index, or -1 when the choice is closed |
| `transfer(map, x, y, options?)` | moves the player to a map |
| `wait(seconds)` | pauses the script (60 seconds at most) |
| `random(min, max)` | a whole number, both included |
| `Item("id")` | a reference to an item of the database |

The language is a subset of JavaScript: `const`/`let`, functions and arrow functions, `if`/`for`/`while`, template texts, lists and
objects with the usual methods (`map`, `filter`, `find`, `reduce`, `includes`, `join`…). Not available: `eval`, `Function`,
classes, `import`, `new`, timers, the prototype. **Data that comes from the game is read-only**: copy it (`{ ...x }`, `[...x]`)
before changing the copy.

A script has a budget: steps, 100 iterations per loop, texts of 10 000 characters, lists and objects of 1 000 entries, call depth
20, `$state` of 10 000 characters. A script that goes over is stopped, reported in the console, and the game goes on.

### Shared properties

A script declares what the players of a map share, and every player reads and changes the same value:

```js
shared({ stock: { initial: 3, client: true, persist: false } });

on("event.action", { where: { "event.name": "shop" } }, () => {
  if (!$shared.take("stock", 1)) { notify("Sold out"); return; }
  $player.addItem("Potion", 1);
});
```

They live on the map with `map.setSync`, under the prefix `script_` (`script_stock`), so a script cannot reach another property of
the map. `client: true` sends the value to the clients. `$shared.take(name, amount)` tests and decreases in one step: two players
cannot both take the last one.

## A game to run

`playground/games/scripts` is a small town with a chest, a shop whose stock is shared by the players, and a trap, all written as
scripts (`src/scripts`). Run it with `pnpm --dir playground/games/scripts dev`, walk with the arrow keys, press the action key next
to the chest or the shop, and step on the red block.

## Install scripts while the game runs

```ts
import { ScriptService, provideScripts } from "@rpgjs/script/server"

const scripts = new ScriptService()
// providers: [provideScripts(scripts), provideServerModules([])]

scripts.install({ id: "late", source: `on("player.dead", () => { notify("Careful!"); });` })
scripts.uninstall("late")
```

`inject(ScriptService)` gives the service back. `service.listeners("player.dead")` says who listens, in the order they run, with
their filter.

### Add the signals of a plugin

A plugin that has its own events adds its signals, so that scripts can listen to them and the compiler can check their payload:

```ts
const scripts = new ScriptService({
  signals: { "quests.start": { payload: { questId: { type: "string" } } } },
})

await scripts.emit("quests.start", { questId: "wolves" }, { player, map })
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

`expect` keys are `returns`, `error`, `effects`, `effectsInclude`, `effectsExclude`, `texts`, `notifications`, and paths
`player.gold`, `player.items.<id>`, `shared.<name>`, `state.<key>`, `vars.<name>`; a value is exact or `{ min, max }`.

## Run your own world

The behavior of every name is written once over a port, `ScriptWorld`, that speaks of the game (change the gold, give an item, show
a text). `createRpgjsWorld({ player, map, event?, shared?, hook? })` implements it with the API of RPGJS, and `SimWorld` in memory.
A host with its own vocabulary, such as a block editor, implements it with its own operations, and gets the same behavior.

| Entry | For |
| --- | --- |
| `@rpgjs/script/server` | `provideScripts`, `ScriptService`, `createRpgjsWorld` |
| `@rpgjs/script/core` | the interpreter, `SignalRegistry`, the API and `ScriptWorld`: no dependency on the engine |
| `@rpgjs/script/parse` | `parseScript`: the text of a script to its tree |
| `@rpgjs/script/testing` | `checkScript`, `simulate`, `runTests`, `SimWorld` |
