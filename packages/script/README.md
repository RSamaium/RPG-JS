# @rpgjs/script

Sandboxed scripts for RPGJS v5. A script is text in a JavaScript subset; it is run by its own interpreter, never as
JavaScript, so a script can only use what the game exposes. A script does not call the game: it **listens** to the signals of the
game (a player levels up, an event is activated…) and reacts.

This package is under construction. Today it holds the interpreter, the API of scripts (`$player`, `$event`, `$switch`, `$var`,
`$shared`, `$state`, `say`, `notify`, `choice`, `transfer`, `random`…) and the tools to check, simulate and test a script in an
in-memory world. The signals, the filters and the server plugin that connects them to the hooks of RPGJS are added next.

| Entry | Role |
| --- | --- |
| `@rpgjs/script/core` | the interpreter and the API of scripts, with no dependency on the engine: runs in Node, a Worker and a browser |
| `@rpgjs/script/parse` | the text of a script to the tree the interpreter walks (`parseScript`) |
| `@rpgjs/script/testing` | check, simulate and test scripts without the game |
| `@rpgjs/script/server` | plug scripts into the server of a game (not filled yet) |

```ts
import { parseScript } from "@rpgjs/script/parse";
import { simulate } from "@rpgjs/script/testing";

const source = "export function f() { $player.gold += 5; return $player.gold; }";
const result = await simulate({ source, call: { fn: "f" }, world: { player: { gold: 10 } } });
// result.value === 15, result.effects lists what the script did
```
