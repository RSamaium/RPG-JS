# @rpgjs/script

Sandboxed scripts for RPGJS v5. A script is text in a JavaScript subset; it is run by its own interpreter, never as
JavaScript, so a script can only use what the game exposes. A script does not call the game: it **listens** to the signals of the
game (a player levels up, an event is activated…) and reacts.

This package is under construction. Today it holds the interpreter, the registry of listeners, the API of scripts (`$player`, `$event`, `$switch`, `$var`,
`$shared`, `$state`, `say`, `notify`, `choice`, `transfer`, `random`…) and the tools to check, simulate and test a script in an
in-memory world. The server plugin that connects the registry to the hooks of RPGJS is added next.

| Entry | Role |
| --- | --- |
| `@rpgjs/script/core` | the interpreter and the API of scripts, with no dependency on the engine: runs in Node, a Worker and a browser |
| `@rpgjs/script/parse` | the text of a script to the tree the interpreter walks (`parseScript`) |
| `@rpgjs/script/testing` | check, simulate and test scripts without the game |
| `@rpgjs/script/server` | `createRpgjsWorld`: the world of a script on a real RPGJS player, event and map (the plugin that binds the hooks is not there yet) |

```ts
import { parseScript } from "@rpgjs/script/parse";
import { simulate } from "@rpgjs/script/testing";

const source = "export function f() { $player.gold += 5; return $player.gold; }";
const result = await simulate({ source, call: { fn: "f" }, world: { player: { gold: 10 } } });
// result.value === 15, result.effects lists what the script did
```

## Listening to a signal

A script listens with `on(signal, filter?, handler)`. The handler receives the payload of the signal, which it can read and
cannot change: listeners **observe**, they never refuse or modify what happened. They run in the order the scripts were installed.

```js
on("skill.cast", { where: { "skill.tags": { has: "fire" }, power: { gte: 5 } }, when: [{ switch: "tournament" }] }, (e) => {
  $player.gold += e.power;
});
```

The filter is plain data, never computed, so who listens to what is known before anything runs:

- `where`: conditions on the payload, by dotted path. A value alone means equal; operators are `eq`, `ne`, `gt`, `gte`, `lt`,
  `lte`, `in: [...]`, `has: value` (the field is a list that contains it) and `exists: true | false`. All must hold.
- `when`: conditions on the player, a list that must all hold: `{ switch, is? }`, `{ variable, <comparison> }`,
  `{ item, <comparison> }` (the player has it, by default) and `{ stat: "gold" | "level", <comparison> }`.

An API that declares its signals (`signals` of the `ApiDescription`) makes the compiler refuse an unknown signal and a path that is
not in its payload, and says what is available. `SignalRegistry` (`@rpgjs/script/core`) installs, uninstalls and emits;
`simulate({ source, emit: { signal, payload } })` (`@rpgjs/script/testing`) says which listeners a signal reached and why the
others did not run.

## The world of a script

A script never calls the engine. What it asks for goes through a port, `ScriptWorld`, that speaks of the game: change the gold, give
an item, show a text, ask a choice. Each environment says how:

- `createRpgjsWorld({ player, map, event?, shared?, hook? })` (`@rpgjs/script/server`) does it with the API of RPGJS. Shared
  properties (`shared({ ... })`) live on the map with `map.setSync`, under the prefix `script_`; a player who has none of an item
  loses nothing when a script removes it; the gold never goes below 0.
- `SimWorld` (`@rpgjs/script/testing`) does it in memory and records every effect, so a test can say what a script did.
- A host with its own vocabulary (a block editor, for example) maps each operation to it.
