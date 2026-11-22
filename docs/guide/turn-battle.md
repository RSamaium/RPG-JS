---
title: "Turn-based battle"
description: "A turn-based battle system for RPGJS: server-authoritative rules, battle data in the database, and a CanvasEngine battle scene."
---

# Turn-based battle

`@rpgjs/turn-battle` adds turn-based fights to a game: the server owns the rules (turn order, damage, AI, rewards), the client plays a battle scene above the map. It works in standalone RPG mode and in MMORPG mode, solo, in co-op and in player versus player, and other players can watch.

It is built on [`@rpgjs/battle-kit`](./battle-kit.md), the foundation shared by the RPGJS battle systems, and does **not** depend on any other battle system: a game can install it next to [`@rpgjs/tactical-rpg`](./tactical-rpg.md) or alone.

```bash
npm install @rpgjs/turn-battle @rpgjs/battle-kit
```

## Install

```ts
// server
import { provideServerModules } from "@rpgjs/server";
import { provideTurnBattleServer } from "@rpgjs/turn-battle/server";

providers: [provideTurnBattleServer({ /* TurnBattleServerOptions */ }), provideServerModules([])]
```

```ts
// client
import { provideClientModules } from "@rpgjs/client";
import { provideTurnBattleClient } from "@rpgjs/turn-battle/client";

providers: [provideTurnBattleClient({ /* TurnBattleClientOptions */ }), provideClientModules([])]
```

The styles of the battle HUD are part of `@rpgjs/ui-css` (`rpg-ui-turn-battle-*` classes): a game that links the ui-css stylesheet has them, and its theme restyles the battle too.

## Start a battle

The server owns every battle. These functions are server only.

```ts
import { startTurnBattle } from "@rpgjs/turn-battle/server";

const result = await startTurnBattle(player, "goblins");                          // solo, a troop id of the database
await startTurnBattle({ players: [a, b], troop: "dragon" });                      // co-op
await startTurnBattle({ players: [a], versus: [b], spectators: [c] });            // player versus player, watched by c
```

`startTurnBattle` resolves with a `BattleResult` (`outcome`, `exp`, `gold`, `items`, `bonuses`, `turns`, and `winners` in PvP). Before it resolves, the result is written on each player: HP, SP, items spent, EXP, gold and drops (nothing between players).

| Function | Meaning |
|---|---|
| `isInTurnBattle(player)` | The player fights or watches a battle. |
| `getTurnBattle(playerOrId)` | The `TurnBattleHandle` of the battle a player fights in, or of a battle id. |
| `watchTurnBattle(spectator, target)` | Watch the battle of a fighting player (or a battle id); resolves when the spectator leaves, `false` when refused. |
| `stopTurnBattle(player)` | Take a player out of their battle, as a disconnection does. |
| `getLimit`, `setLimit`, `getLimits`, `clearLimits` | The limit gauges, kept on the player between battles. |

### `StartTurnBattleOptions` (third argument, or the group options)

| Option | Meaning |
|---|---|
| `seed` | Seed of the random numbers, for a reproducible battle. |
| `bgm` / `victoryBgm` / `background` | Music, victory music and backdrop used when the troop has none (the troop's own value wins). |
| `party` | Replaces the configured companions for this battle (solo). |
| `heroes` | Fight with these `HeroDef` allies instead of the player's hero and companions (solo). Each needs `name`, `battler`, `stats`. |
| `heroesByPlayer` | Heroes of some players of a group battle, by player id. |
| `turnTimer` | Overrides the `turnTimer` server option for this battle. |

Group battles (`TurnBattleGroupOptions`) add `players`, `troop`, `versus`, `spectators`, `background` and `bgm`. Every player must be on the leader's map: a battle lives in the room of its map.

## Battle data in the database

Battle data lives in the RPGJS database like any other game data. The native fields (`name`, `description`, `spCost`, `power`, `hpValue`, `spValue`, `gain`…) are shared with every battle system; the `turnBattle` field carries what only a turn-based battle needs.

```ts
import { turnBattleEnemy, turnBattleItem, turnBattleSkill, turnBattleTroop } from "@rpgjs/turn-battle/server";

defineModule<RpgServer>({
  database: {
    fire: turnBattleSkill({ name: "Fire", spCost: 18, power: 105, turnBattle: { kind: "magical", scope: "allEnemies", element: "fire" } }),
    potion: turnBattleItem({ name: "Potion", hpValue: 150, consumable: true, turnBattle: { scope: "ally" } }),
    goblin: turnBattleEnemy({ name: "Goblin", gain: { exp: 24 }, turnBattle: { battler: "goblin", stats: { /* ... */ } } }),
    goblins: turnBattleTroop({ turnBattle: { enemies: ["goblin", "goblin"] } }),
  },
});
```

Record kinds: skills (default), `item`, `enemy`, `troop`, `weapon`, `summon` and `command`. The fields of each `turnBattle` object are typed and commented in `SkillBattleData`, `ItemBattleData`, `WeaponBattleData`, `EnemyBattleData`, `SummonBattleData` and `TroopBattleData`. A tactical battle reads the `tactical` field of the same records, so one skill can serve both.

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
| `commands` | Custom commands (see `turnBattleCommand`), given to units with `commands: [...]`. |
| `runTrigger(player, call)` | Runs what a skill does besides the battle (`cast`, `impact`, `defeat`) for the player who used it, once the action is sent to players. Errors are logged and the battle goes on. |
| `enemyCondition(player, condition)` | Tells whether a troop member that has a `condition` fights this time. |

### Server hooks

Implemented in any module under the `turnBattle` key (`TurnBattleServerHooks`), or given in the `hooks` option:

```ts
defineModule<RpgServer>({
  turnBattle: {
    onCommand(player, battle, env) { return env.command.type !== "escape"; },
    onDamage({ amount }) { return amount * 2; },
  },
});
```

| Hook | Meaning |
|---|---|
| `onStart(player, battle)` | A battle starts, for each fighting player. |
| `onCommand(player, battle, env)` | A hero command; return `false` to refuse. |
| `onEnd(player, battle, result)` | The battle ends, after the result is written on the player. |
| `onSpectate(spectator, battle)` | A player wants to watch; return `false` to refuse. |
| `onTurnStart`, `onChooseAction`, `onDamage`, `onAction` | Rule hooks (synchronous), for example `onDamage({ target, amount })` returning a new amount. |

`TurnBattleHandle` gives hooks the battle `id`, `player`, `players`, `versus`, `spectators()`, `troop` and `state()`.

## Client options (`TurnBattleClientOptions`)

| Option | Meaning |
|---|---|
| `battlers` | Battle hints per battler id (`BattlerHints`: facing, scale, impact frames, animation names, portrait), overriding the `battle` field of the RPGJS spritesheet. Battlers are ordinary spritesheets. |
| `resolveBattler(id)` | Builds the spritesheet of a battler the engine does not hold. Return `undefined` to leave it to the engine. |
| `backdrops` | Backgrounds by troop `background` id (`default` otherwise): painted layers and ambient particles. |
| `resolveBackdrop(id)` | Builds a background that `backdrops` does not hold. |
| `fx` | Extra effect recipes by skill `fx` id. |
| `sounds` | Maps battle cues (`cursor`, `confirm`, `back`, `attack`, `cast`, `hit`, `crit`, `hurt`, `break`, `heal`, `ko`, `limit`, `victory`, `dash`) to a sound id, `false` (silence) or a function `(engine, volume) => void`. Without it, small synthesized sounds are used. |
| `muted` | Starts with the sounds off. |
| `hideGuis` / `keepGuis` / `onBattleShown()` | How the battle shares the screen with the GUIs of the game, as in every RPGJS battle system (`BattleScreenOptions`): by default every GUI but the battle and the built-in dialogs is hidden; `keepGuis` keeps some (a chat); `onBattleShown` adapts a GUI of your own and returns what restores it. |
| `hooks` | `TurnBattleClientHooks` declared without a module. |

### Texts

The texts of the battle are `turnBattle.*` keys of the RPGJS i18n service (`TURN_BATTLE_I18N` holds the English and French defaults). A game overrides them, or adds a language, with the `i18n` of its own module:

```ts
defineModule<RpgClient>({ i18n: { en: { "turnBattle.attack": "Strike" }, de: { "turnBattle.attack": "Angriff" } } });
```

### Controls

The battle uses the keyboard controls of the game (`keyboardControls` of the client config: `up`, `down`, `left`, `right`, `action`, `escape`) and the gamepad mapping of the built-in GUIs: A confirms, B or Start goes back, the d-pad or the stick moves through the menu, R changes the speed. Every command also has a button for touch screens.

### Client hooks

Under the `turnBattle` key (`TurnBattleClientHooks`): `onStart(scene, view)`, `onPlay(beat, scene, steps)`, `onEnd(result)`. `onPlay` runs before each beat: use `steps` (the default choreography cut into steps: `announce`, `charge`, `strike`, `fall`, `returnHome`…) to play it your way and return `false`; otherwise the default choreography plays. The hooks change what is shown, never the outcome: the server owns the rules.

## Not included

Multiplayer lobbies, launching a battle from a link, random encounters, map battle zones and the media-based battlers of Studio are not part of this package: they are game-level features built on `startTurnBattle` and `watchTurnBattle`.
