---
title: "Turn-based battle"
description: "A turn-based battle system for RPGJS: server-authoritative rules, battle data in the database, and a CanvasEngine battle scene."
---

# Turn-based battle

`@rpgjs/turn-battle` adds turn-based fights to a game: the server owns the rules (turn order, damage, AI, rewards), the client plays a battle scene above the map. It works solo, in co-op and in player versus player, and other players can watch.

It depends on [`@rpgjs/battle-kit`](./battle-kit.md) for the effects of the scene and does **not** depend on any other battle system.

```bash
npm install @rpgjs/turn-battle @rpgjs/battle-kit
```

## Install

```ts
// server
import { provideServerModules } from "@rpgjs/server";
import { provideTurnBattleServer } from "@rpgjs/turn-battle/server";

providers: [provideTurnBattleServer({ /* TurnBattleServerOptions */ })]
```

```ts
// client
import { provideClientModules } from "@rpgjs/client";
import { provideTurnBattleClient } from "@rpgjs/turn-battle/client";

providers: [provideTurnBattleClient({ /* TurnBattleClientOptions */ })]
```

## Start a battle

```ts
import { startBattle } from "@rpgjs/turn-battle/server";

const result = await startBattle(player, "goblins");                   // solo, a troop id of the database
await startBattle({ players: [a, b], troop: "dragon" });               // co-op
await startBattle({ players: [a], versus: [b] });                      // player versus player
```

`startBattle` resolves with a `BattleResult` (`outcome`, `exp`, `gold`, `items`, `bonuses`, `turns`). Other server functions: `isInBattle(player)`, `getBattle(playerOrId)`, `watchBattle(spectator, target)`, and the limit gauge helpers `getLimit`, `setLimit`, `getLimits`, `clearLimits`.

### `StartBattleOptions` (second argument, or the group options)

| Option | Meaning |
|---|---|
| `seed` | Seed of the random numbers, for a reproducible battle. |
| `bgm` / `victoryBgm` / `background` | Music, victory music and backdrop used when the troop has none (the troop's own value wins). |
| `party` | Replaces the configured companions for this battle (solo). |
| `heroes` | Fight with these `HeroDef` allies instead of the player's hero and companions (solo). Each needs `name`, `battler`, `stats`. |
| `heroesByPlayer` | Heroes of some players of a group battle, by player id. |
| `turnTimer` | Overrides the `turnTimer` server option for this battle. |

Group battles (`GroupBattleOptions`) add `players`, `troop`, `versus`, `background`, `bgm` and `spectators` (players watching from the start).

## Battle data in the database

Battle data lives in the RPGJS database like any other game data. Native fields (`name`, `description`, `spCost`, `power`, `hpValue`, `spValue`) are reused; the `battle` field carries what RPGJS has no notion of.

```ts
defineModule<RpgServer>({
  database: {
    fire: { name: "Fire", spCost: 18, power: 105, battle: { kind: "magical", scope: "allEnemies", element: "fire" } },
    potion: { name: "Potion", hpValue: 150, consumable: true, _type: "item", battle: { scope: "ally" } },
    goblin: { _type: "enemy", name: "Goblin", battle: { battler: "goblin", stats: { /* ... */ }, rewards: { /* ... */ } } },
    goblins: { _type: "troop", battle: { enemies: ["goblin", "goblin"] } },
  },
});
```

Record kinds: skills (default), `item`, `enemy`, `troop`, `weapon`, `summon` and `command`. The fields of each `battle` object are typed and commented in `SkillBattleData`, `ItemBattleData`, `WeaponBattleData`, `EnemyBattleData`, `SummonBattleData` and `TroopBattleData`.

## Server options (`TurnBattleServerOptions`)

| Option | Meaning |
|---|---|
| `skills`, `items`, `enemies`, `troops`, `summons` | Extra battle data by id, used before the database. |
| `hero(player, ctx)` | How the player's own character looks and fights (`battler`, limit, fallback stats). `ctx` is a `PartyContext`: `players`, `index`, `side`, `pvp`. |
| `party(player, ctx)` | Companions fighting next to the player, owned and commanded by the player. |
| `turnTimer` | Seconds to pick a command before guarding automatically. Default: 30 in co-op, none in solo. `false` disables it. |
| `nativeStats` | Read HP/SP and parameters from the `RpgPlayer` (default). Set `false` to use `hero().stats`. |
| `formulas` | `"native"` (default: the map's `damagePhysic`, `damageSkill`, `damageCritical`, `damageGuard` when it has them), `"plugin"` (always the plugin's) or an object overriding some of them. |
| `battlers` | Battler id of units whose record has none: `{ ally, enemy }`. |
| `adapt` | Turns a record of another source into the shape the plugin reads, per kind (`enemy`, `troop`, `skill`, `item`, `weapon`, `summon`, `command`). Called with the raw record, its id and `lookup(id)` to read another record. |
| `ai` | Named AI functions for enemies. |
| `weights` | Weights of the commands the default AI picks. |
| `hooks` | `TurnBattleServerHooks` declared without a module. |
| `commands` | Custom commands (see `battleCommand`), given to units with `commands: [...]`. |
| `runTrigger(player, call)` | Runs what a skill does besides the battle (`cast`, `impact`, `defeat`) for the player who used it, once the action is sent to players. Errors are logged and the battle goes on. |
| `enemyCondition(player, condition)` | Tells whether a troop member that has a `condition` fights this time. |
| `playerLabel` | Label of a co-op player without a name. |

### Server hooks

Implemented in any module as `battle: { ... }` (`TurnBattleServerHooks`):

| Hook | Meaning |
|---|---|
| `onStart(player, battle)` | A battle starts. |
| `onCommand(player, battle, env)` | A hero command; return `false` to refuse. |
| `onEnd(player, battle, result)` | The battle ends. |
| `onSpectate(spectator, battle)` | A player wants to watch; return `false` to refuse. |
| `onTurnStart`, `onChooseAction`, `onDamage`, `onAction` | Rule hooks (synchronous), for example `onDamage({ target, amount })` returning a new amount. |

`BattleHandle` gives hooks the battle `id`, `player`, `players`, `versus`, `spectators()`, `troop` and `state()`.

## Client options (`TurnBattleClientOptions`)

| Option | Meaning |
|---|---|
| `battlers` | Battle hints per battler id (`BattlerHints`: facing, scale, impact frames, animation names, portrait), overriding the `battle` field of the RPGJS spritesheet. Battlers are ordinary spritesheets. |
| `resolveBattler(id)` | Builds the spritesheet of a battler the engine does not hold. Return `undefined` to leave it to the engine. |
| `backdrops` | Backgrounds by troop `background` id (`default` otherwise): painted layers and ambient particles. |
| `resolveBackdrop(id)` | Builds a background that `backdrops` does not hold. |
| `fx` | Extra effect recipes by skill `fx` id. |
| `texts` | Overrides UI texts (keys of `TEXTS_BY_LOCALE`) over the catalog of the game's language. |
| `hideGuis` | Map GUIs hidden while a battle is shown (default `hud`, `rpg-hotbar`, `rpg-notification`). Restored afterwards. |
| `sounds` | Maps battle cues (`cursor`, `confirm`, `back`, `attack`, `cast`, `hit`, `crit`, `hurt`, `break`, `heal`, `ko`, `limit`, `victory`, `dash`) to a sound id, `false` (silence) or a function `(engine, volume) => void`. Without it, small synthesized sounds are used. |
| `muted` | Starts with the sounds off. |
| `onBattleShown()` | Called when a battle is shown, to adapt the rest of the interface (for instance a chat reduced to a pill). Return a function that restores it when the battle ends. |

### Client hooks

`battle: { onStart(scene, view), onBeat(beat, scene, steps), onEnd(result) }` (`TurnBattleClientHooks`). `onBeat` runs before each beat: use `steps` (the default choreography cut into steps: `announce`, `charge`, `strike`, `fall`, `returnHome`…) to play it your way, or return `false` to play it entirely yourself.

## Not included

Multiplayer lobbies, launching a battle from a link, random encounters, map battle zones and the media-based battlers of Studio are not part of this package: they are game-level features built on `startBattle` and `watchBattle`.
