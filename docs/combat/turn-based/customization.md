---
title: "Customization"
description: "Server options, server hooks, client options, texts, controls and client hooks of the turn-based battle."
---

# Customization

The server options and hooks change the rules; the client options and hooks change only what is shown. The server owns the outcome either way.

## Server options (`TurnBattleServerOptions`)

Given to `provideTurnBattleServer(options)`:

| Option | Meaning |
|---|---|
| `skills`, `items`, `enemies`, `troops`, `summons` | Extra battle data by id, used before the database. |
| `hero(player, ctx)` | How the player's own character looks and fights (`battler`, limit, fallback stats). `ctx` is a `PartyContext`: `players`, `index`, `side`, `pvp`. |
| `party(player, ctx)` | Companions fighting next to the player, owned and commanded by the player. |
| `turnTimer` | Seconds to pick a command before guarding automatically. Default: 30 as soon as more than one player fights (co-op and player versus player), none in solo. `false` disables it. |
| `nativeStats` | Read HP/SP and parameters from the `RpgPlayer` (default). Set `false` to use `hero().stats` (`DEFAULT_HERO_STATS` when it gives none). |
| `formulas` | `"native"` (default: the map's `damagePhysic`, `damageSkill`, `damageCritical`, `damageGuard` when it has them), `"plugin"` (always the plugin's, `defaultFormulas`) or an object overriding some of them. |
| `battlers` | Battler id of units whose record has none: `{ ally, enemy }`. |
| `adapt` | Turns a record of another source into the shape the plugin reads, per kind (`enemy`, `troop`, `skill`, `item`, `weapon`, `summon`, `command`). Called with the raw record, its id and `lookup(id)` to read another record. |
| `ai` | Named AI functions for enemies. `defaultAi` is the default brain, to fall back on. |
| `weights` | Weights of the commands the default AI picks. |
| `hooks` | `TurnBattleServerHooks` declared without a module. |
| `commands` | Custom commands (`turnBattleCommand`), given to units with `commands: [...]`. They run on the server; the texts they show over a target are i18n keys (`act.text(target, "turnBattle.steal.fail")`). |
| `runTrigger(player, call)` | Runs what a skill does besides the battle (`cast`, `impact`, `defeat`) for the player who used it, once the action is sent to players. Errors are logged and the battle goes on. |
| `enemyCondition(player, condition)` | Tells whether a troop member that has a `condition` fights this time. |

```ts
import { DEFAULT_HERO_STATS, provideTurnBattleServer, turnBattleCommand } from "@rpgjs/turn-battle/server";

provideTurnBattleServer({
  turnTimer: 20,
  battlers: { ally: "hero", enemy: "slime" },
  hero: (player, ctx) => ({ battler: ctx.pvp ? "duelist" : "hero", stats: DEFAULT_HERO_STATS }),
  // One companion in solo, none in a group battle
  party: (player, ctx) => (ctx.players.length > 1 ? [] : [/* CombatantDef */]),
  commands: {
    steal: turnBattleCommand({
      label: "Steal", icon: "✋", scope: "enemy", melee: true,
      resolve({ target, rng, act }) {
        const loot = act.lootOf(target!);
        if (!loot || !rng.chance(0.6)) return act.text(target!, "turnBattle.steal.fail");
        act.give(loot);
        act.text(target!, "turnBattle.steal.success", { item: loot.name });
      },
    }),
  },
});
```

## Server hooks

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

Given to `provideTurnBattleClient(options)`:

| Option | Meaning |
|---|---|
| `battlers` | Battle hints per battler id (`BattlerHints`: facing, scale, impact frames, animation names, portrait), overriding the `battle` field of the RPGJS spritesheet. Battlers are ordinary spritesheets. |
| `resolveBattler(id)` | Builds the spritesheet of a battler the engine does not hold. Return `undefined` to leave it to the engine. |
| `backdrops` | Backgrounds by troop `background` id (`default` otherwise): painted layers and ambient particles. |
| `resolveBackdrop(id)` | Builds a background that `backdrops` does not hold. |
| `fx` | Extra effect recipes by skill `fx` id (`FxFn`). `builtinFx` holds the plugin's recipes, `burst(color, options)` builds a particle burst. |
| `sounds` | Maps battle cues (`cursor`, `confirm`, `back`, `attack`, `cast`, `hit`, `crit`, `hurt`, `break`, `heal`, `ko`, `limit`, `victory`, `dash`) to a sound id, `false` (silence) or a function `(engine, volume) => void`. Without it, small synthesized sounds are used. |
| `muted` | Starts with the sounds off. |
| `hideGuis` / `keepGuis` / `onBattleShown()` | How the battle shares the screen with the GUIs of the game, as in every RPGJS battle system (`BattleScreenOptions`): by default every GUI but the battle and the built-in dialogs is hidden; `keepGuis` keeps some (a chat); `onBattleShown` adapts a GUI of your own and returns what restores it. |
| `hooks` | `TurnBattleClientHooks` declared without a module. |

A battler is an RPGJS spritesheet registered like any other (`defineModule<RpgClient>({ spritesheets: [...] })`) and referenced by id; its battle hints sit in a `battle` field of the spritesheet, or in the `battlers` option. A spritesheet of the map works as is (`Presets.RMSpritesheet`, with `stand` and `walk`): without an `idle` texture, the battler stands facing its side, and the battle animations it lacks (`attack`, `hurt`, `dead`…) use that pose. Give it battle textures (`idle`, `attack`, `skill`, `hurt`, `dead`, `victory`) or map them with `battle.anims` for a livelier fight. A battler whose spritesheet is not registered, or whose image does not load, does not block the battle: the error is logged in the console and nothing is drawn for that battler (its name, HP and the HUD stay).

```ts
provideTurnBattleClient({
  keepGuis: ["chat"],
  sounds: { victory: "fanfare", cursor: false },
});
```

## Texts

The texts of the battle are `turnBattle.*` keys of the RPGJS i18n service (`TURN_BATTLE_I18N` holds the English and French defaults, exported by both entries). The client shows the menus, HUD, `aria-label`s and errors with them; the server uses `turnBattle.player` and `turnBattle.hero` for a player or hero without a name. Texts with values are one key filled with params (`turnBattle.spCost`: `"{cost} MP"`), so a translation can order the words its own way. A game overrides them, or adds a language, with the `i18n` of its own module:

```ts
defineModule<RpgClient>({ i18n: { en: { "turnBattle.attack": "Strike" }, de: { "turnBattle.attack": "Angriff" } } });
```

## Controls

The battle uses the keyboard controls of the game (`keyboardControls` of the client config: `up`, `down`, `left`, `right`, `action`, `escape`, and `tabNext` to change the speed) and the gamepad mapping of the built-in GUIs: A confirms, B or Start goes back, the d-pad or the stick moves through the menu, R changes the speed. Every command also has a button for touch screens. The help line of the menu (`turnBattle.keys`) names no key, since the keys are configurable.

## Client hooks

Under the `turnBattle` key (`TurnBattleClientHooks`): `onStart(scene, view)`, `onPlay(beat, scene, steps)`, `onEnd(result)`. `onPlay` runs before each beat: use `steps` (the default choreography cut into steps: `announce`, `charge`, `strike`, `fall`, `returnHome`…) to play it your way and return `false`; otherwise the default choreography plays. The hooks change what is shown, never the outcome: the server owns the rules.

## Not included

Multiplayer lobbies, launching a battle from a link, random encounters, map battle zones and the media-based battlers of Studio are not part of this package: they are game-level features built on `startTurnBattle` and `watchTurnBattle`. [Start a battle](/combat/turn-based/starting-battles) shows how to build random encounters, zones and challenges with them.
