---
title: "Tactical RPG"
description: "Grid-based tactical battles: data, server and client options, hooks, objectives and plugins."
---

# Tactical RPG

`@rpgjs/tactical-rpg` adds grid-based tactical battles to an RPGJS game: units move on a grid, act in phases, use skills with areas, and fight for an objective. The server owns the rules; the client draws the grid on the map and the HUD over it. It works in standalone RPG mode and in MMORPG mode, solo, in co-op and in player versus player, and other players can watch.

It is **independent of the turn-based battle**: it does not import it and does not need it. Both are built on [`@rpgjs/battle-kit`](./battle-kit.md), the foundation shared by the RPGJS battle systems, so they take the same options and hooks.

```bash
npm install @rpgjs/tactical-rpg @rpgjs/battle-kit
```

Peer dependencies: `@rpgjs/client`, `@rpgjs/common`, `@rpgjs/server`, `@rpgjs/battle-kit`, `canvasengine`, `@canvasengine/presets`.

## Plug the module

```ts
// server
import { provideTacticalServer } from "@rpgjs/tactical-rpg/server";
providers: [provideTacticalServer({ enemyDelay: 1200 }), provideServerModules([])]

// client
import { provideTacticalClient } from "@rpgjs/tactical-rpg/client";
providers: [provideTacticalClient({ keepGuis: ["chat"] }), provideClientModules([])]
```

The styles of the HUD are part of `@rpgjs/ui-css` (`rpg-ui-tactical-*` classes): a game that links the ui-css stylesheet has them, and its theme restyles the HUD too.

## Data

Data lives in the RPGJS database. The native fields are shared with every battle system (`name`, `description`, `spCost` and `power` of a skill, `hpValue` and `spValue` of an item); the `tactical` field carries what only a tactical battle needs. Helpers add the `_type` and type the record: `tacticalSkill` and `tacticalItem` make ordinary RPGJS skills and items (players learn and carry them), `tacticalUnit`, `tacticalRole` and `tacticalEncounter` the records of the tactical battle.

```ts
import { tacticalEncounter, tacticalSkill, tacticalUnit } from "@rpgjs/tactical-rpg/server";

export const database = {
  nova: tacticalSkill({ name: "Nova", spCost: 14, power: 30, tactical: { range: 3, shape: "square", visual: "fire", color: 0xff995d } }),
  kael: tacticalUnit({ name: "Kael", tactical: { role: "warrior", battler: "hero", stats: { hp: 120, sp: 20, power: 24, range: 1, move: 3 }, skills: ["nova"] } }),
  sentinel: tacticalUnit({ name: "Sentinel", tactical: { role: "archer", battler: "guard", stats: { hp: 60, sp: 0, power: 12, range: 3, move: 2 } } }),
  potion: tacticalItem({ name: "Potion", hpValue: 40 }),
  sanctuary: tacticalEncounter({
    name: "Sanctuary",
    tactical: { allies: [{ hero: true, x: 3, y: 5 }, { unit: "kael", x: 4, y: 5 }], enemies: [{ unit: "sentinel", x: 4, y: 1 }] },
  }),
};
```

### Skill

Native fields: `spCost` (SP cost) and `power` (damage or healing power). The `tactical` field:

| Field | Meaning |
|---|---|
| `range` | Reach, in cells. |
| `shape` | Area shape around the target. |
| `mask` | Area drawn as rows of text: a character other than `.`, space or `0` is a hit cell, the target is the middle. Wins over `shape`. |
| `visual`, `color` | Built-in look and accent colour (`0xrrggbb`). |
| `uses` | Uses per battle (default 1). |
| `effect`, `castEffect`, `impactEffect` | Visual Effects (see [battle kit](./battle-kit.md)): one effect from the caster to the target, or a cast and an impact effect. They replace `visual`. |

### Unit (`tactical`)

| Field | Meaning |
|---|---|
| `role` | `warrior`, `archer`, `mage`, or the id of a `tacticalRole`. |
| `battler` | Spritesheet id with `stand-<dir>` and `walk-<dir>` textures (see `walkingSheet`). |
| `portrait`, `tint` | Portrait image id and tint. |
| `stats` | `hp`, `sp`, `power`, `range`, `move`. |
| `skills` | Skill ids. |
| `items` | Items carried: id → count. |
| `params` | Parameters under RPGJS names; the map's damage formulas are used when present. |

### Item

Native fields: `hpValue`, `spValue` restored to a unit next to the user. The `tactical` field may give an `effect`: a Visual Effect played from the user to that unit.

### Role (`tactical`)

`attack`: `melee` (charge), `ranged` (arrow) or `magic` (bolt); `glyph` (one-character badge, default ◆); `color`.

### Encounter (`tactical`)

| Field | Meaning |
|---|---|
| `allies`, `enemies` | Placements: `unit` (or `hero: true`), `x`, `y`, `seat` (index of the commanding player, coop and PvP), `invincible` (keeps one hit point). |
| `chapter`, `intro` | Texts shown at the start. |
| `board` | Grid size and position; `origin` (map pixels) defaults to around the player. |
| `rules` | What the heroes may do (everything by default). |
| `turnSeconds` | Seconds a side has to play its phase when several players are in the battle (0: no limit). |
| `objective` / `goal` | What the heroes must do to win. Built-in types: `eliminate` (default), `boss` (`enemy`: index of the chief), `survive` (`turns`), `reach` (`cell`). |

### The hero of a player

A `hero: true` placement is the hero of a player of the battle (`seat`: the index of the player in its side, the first one by default). It is read from the `RpgPlayer`: its name, HP and SP, its parameters (equipment and states included, used by the damage formulas of the map), the skills it knows that have a `tactical` field, and the items of its inventory that restore HP or SP. Its role comes from the `hero` server option, else from the `tactical.role` of the class of the player (`warrior` otherwise); its battler is the graphic of the player.

When the battle ends, its HP, SP and the items it spent are written back on the player (never in PvP, never for a player who left). A seat that no player takes leaves its hero out.

## Starting a battle (server)

The server owns every battle. These functions are server only.

```ts
import { startTacticalBattle } from "@rpgjs/tactical-rpg/server";

const result = await startTacticalBattle(player, "sanctuary", { origin: { x: 320, y: 240 } });
```

| Function | Meaning |
|---|---|
| `startTacticalBattle(player, encounter, { origin })` | One player. `encounter` is an id or a record. Resolves with the `TacticalResult` when the battle ends. |
| `startTacticalBattle({ players, encounter, spectators, versus, origin })` | Co-op (several players on the allied side); `versus` makes it PvP against the enemy side (no AI); `spectators` watch from the start. Every player must be on the leader's map. |
| `watchTacticalBattle(spectator, target)` | Watch a running battle; resolves `false` when refused (see `onSpectate`). |
| `stopTacticalBattle(player)` | Take a player out of their battle, as a disconnection does. |
| `isInTacticalBattle(player)`, `getTacticalBattle(playerOrBattleId)` | Test, or get the running `TacticalBattleHandle`. |

## Server options (`provideTacticalServer`)

| Option | Default | Meaning |
|---|---|---|
| `units`, `skills`, `items`, `roles`, `encounters` | — | Data kept outside the RPGJS database (the database is read otherwise). |
| `ai` | attack the weakest target in range, else close in | Enemy AI (`TacticalAi`). |
| `enemyDelay` | `1650` | Delay between two enemy actions, in ms. |
| `turnSeconds` | `60` | Seconds a side has to play its phase with several players; `0`: no limit. An encounter's own value wins. |
| `hidePlayer` | `true` | Hide the player's map sprite during the battle. |
| `hero(player, { side, seat })` | — | How the hero of a player fights: `role`, `battler`, `stats.range`, `stats.move`… (see above). |
| `hooks` | — | Hooks declared without a module. |

## Server hooks

Any game module can implement `tactical` hooks (`defineModule<RpgServer>({ tactical: { ... } })`), or pass them in `hooks`.

| Hook | Use |
|---|---|
| `onSetup(player, battle, state)` | Change the state (units, rules, objective) before the first display. |
| `onStart(player, battle)` | A battle starts. |
| `onCommand(player, battle, env)` | Return `false` to refuse a command. |
| `onChooseAction({ state, unit, suggested, battle })` | Replace the AI's command; a refused command falls back to `suggested`. |
| `onSpectate(spectator, battle)` | Return `false` to refuse a spectator. |
| `onEnd(player, battle, result)` | The battle ends, after the outcome of the heroes is written on the players. |
| `onDamage`, `onJudge`, `onAction`, `onMove`, `onDefeat`, `onPhase` | Synchronous rule hooks; they also receive `player` and `battle`. `onDamage` returns the final amount, `onJudge` returns the winning side to end the battle. |

New objective types: `registerObjectiveType(id, { judge(state, objective) })` returns `"ally"` or `"enemy"` when decided. Built-in types cannot be replaced; `unregisterObjectiveType(id)` removes yours.

## Client options (`provideTacticalClient`)

| Option | Meaning |
|---|---|
| `hideGuis` / `keepGuis` / `onBattleShown()` | How the battle shares the screen with the GUIs of the game, as in every RPGJS battle system (`BattleScreenOptions`): by default every GUI but the battle and the built-in dialogs is hidden; `keepGuis` keeps some (a chat panel); `onBattleShown` adapts a GUI of your own and returns what restores it. |
| `sounds` | The cues `select`, `confirm`, `hit`, `back`: a sound id, `false` (silence) or a function `(engine, volume) => void`. Without one, a short tone is synthesized. |
| `muted`, `reducedMotion` | Start muted or with reduced motion. |
| `hooks` | Client hooks declared without a module. |

### Texts

The texts of the HUD are `tactical.*` keys of the RPGJS i18n service (`TACTICAL_I18N` holds the English and French defaults). A game overrides them, or adds a language, with the `i18n` of its own module:

```ts
defineModule<RpgClient>({ i18n: { en: { "tactical.title": "Sanctuary", "tactical.victory": "Glory!" } } });
```

### Controls

The HUD uses the keyboard controls of the game (`keyboardControls` of the client config) and the gamepad mapping of the built-in GUIs: A confirms (held during the opposing turn: fast-forward), B or Start goes back, the d-pad or the stick moves the cursor, R selects the next unit, Y ends the phase. The keys `e` (end the phase) and `1`–`4` (entries of the action menu) are shortcuts. While the player writes in a text field (the chat), the keys are left to it. Every command also has a button for touch screens.

## Client hooks

```ts
defineModule<RpgClient>({
  tactical: {
    onStart(state) {},
    onPlay(event, state, stage) {
      if (event.kind !== "skill" || event.skillId !== "meteor") return;
      const at = stage.world(state.units.find((u) => u.id === event.targetId)!);
      stage.fx.play("meteorImpact", at.x, at.y);
      stage.screen.shakeScreen(14, 600);
      return false; // played here: skip the default effects
    },
    onEnd(state) {},
  },
});
```

`onPlay` runs before each event: return `false` to play its effects yourself (the units still move). `stage` gives `fx` (battle-kit `FxPlayer`), `screen` (`ScreenEffects`), `popup(text, x, y, { color, big })`, `world(cell)` (cell centre in map pixels) and `unit(id)` (reactive view of a unit). The hooks change what is shown, never the outcome: the server owns the rules.

## Not included

The package contains the rules, AI, HUD and battlefield. Wiring to a particular game stays in that game: reading the battle data from your own tools, a multiplayer lobby, launching a battle from a link, signals for scripts.
