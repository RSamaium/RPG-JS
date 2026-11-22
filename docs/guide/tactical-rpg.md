---
title: "Tactical RPG"
description: "Grid-based tactical battles: data, server and client options, hooks, objectives and plugins."
---

# Tactical RPG

`@rpgjs/tactical-rpg` adds grid-based tactical battles to an RPGJS game: units move on a grid, act in phases, use skills with areas, and fight for an objective. It is **independent of the turn-based battle**: it does not import it and does not need it. The only shared package is [`@rpgjs/battle-kit`](./battle-kit.md), used for effects.

```bash
npm install @rpgjs/tactical-rpg @rpgjs/battle-kit
```

Peer dependencies: `@rpgjs/client`, `@rpgjs/common`, `@rpgjs/server`, `@rpgjs/battle-kit`, `canvasengine`, `@canvasengine/presets`.

## Plug the module

```ts
// server
import { provideTacticalServer } from "@rpgjs/tactical-rpg/server";
provideServerModules([provideTacticalServer({ enemyDelay: 1200 })]);

// client
import { provideTacticalClient } from "@rpgjs/tactical-rpg/client";
provideClientModules([provideTacticalClient({ title: "Sanctuary" })]);
```

Both functions return a module to give to your `provideServerModules` / `provideClientModules` call.

## Data

Data lives in the RPGJS database. Helpers add the `_type` and type the record: `tacticalUnit`, `tacticalSkill`, `tacticalItem`, `tacticalRole`, `tacticalEncounter`.

```ts
import { tacticalEncounter, tacticalSkill, tacticalUnit } from "@rpgjs/tactical-rpg/server";

export const database = {
  nova: tacticalSkill({ name: "Nova", battle: { cost: 14, power: 30, range: 3, shape: "square", visual: "fire", color: 0xff995d } }),
  kael: tacticalUnit({ name: "Kael", battle: { role: "warrior", battler: "hero", stats: { hp: 120, mp: 20, power: 24, range: 1, move: 3 }, skills: ["nova"] } }),
  sentinel: tacticalUnit({ name: "Sentinel", battle: { role: "archer", battler: "guard", stats: { hp: 60, mp: 0, power: 12, range: 3, move: 2 } } }),
  sanctuary: tacticalEncounter({ name: "Sanctuary", battle: { allies: [{ unit: "kael", x: 4, y: 5 }], enemies: [{ unit: "sentinel", x: 4, y: 1 }] } }),
};
```

### Skill (`battle`)

| Field | Meaning |
|---|---|
| `cost` | MP cost. |
| `power` | Damage or healing power. |
| `range` | Reach, in cells. |
| `shape` | Area shape around the target. |
| `mask` | Area drawn as rows of text: a character other than `.`, space or `0` is a hit cell, the target is the middle. Wins over `shape`. |
| `visual`, `color` | Built-in look and accent colour (`0xrrggbb`). |
| `uses` | Uses per battle (default 1). |
| `effect`, `castEffect`, `impactEffect` | Visual Effects (see [battle kit](./battle-kit.md)): one effect from the caster to the target, or a cast and an impact effect. They replace `visual`. |

### Unit (`battle`)

| Field | Meaning |
|---|---|
| `role` | `warrior`, `archer`, `mage`, or the id of a `tacticalRole`. |
| `battler` | Spritesheet id with `stand-<dir>` and `walk-<dir>` textures (see `walkingSheet`). |
| `portrait`, `tint` | Portrait image id and tint. |
| `stats` | `hp`, `mp`, `power`, `range`, `move`. |
| `skills` | Skill ids. |
| `items` | Items carried: id → count. |
| `params` | Parameters under RPGJS names; the map's damage formulas are used when present. |

### Item (`battle`)

`hp`, `mp` restored to a unit next to the user; `effect`: a Visual Effect played from the user to that unit.

### Role (`battle`)

`attack`: `melee` (charge), `ranged` (arrow) or `magic` (bolt); `glyph` (one-character badge, default ◆); `color`.

### Encounter (`battle`)

| Field | Meaning |
|---|---|
| `allies`, `enemies` | Placements: `unit`, `x`, `y`, `seat` (index of the commanding player, coop and PvP), `invincible` (keeps one hit point). |
| `chapter`, `intro` | Texts shown at the start. |
| `board` | Grid size and position; `origin` (map pixels) defaults to around the player. |
| `rules` | What the heroes may do (everything by default). |
| `turnSeconds` | Seconds a side has to play its phase when several players are in the battle (0: no limit). |
| `objective` / `goal` | What the heroes must do to win. Built-in types: `eliminate` (default), `boss` (`enemy`: index of the chief), `survive` (`turns`), `reach` (`cell`). |

## Starting a battle (server)

```ts
import { startTactical, stopTactical, watchTactical, isInTactical, getTactical } from "@rpgjs/tactical-rpg/server";

const result = await startTactical(player, "sanctuary", { origin: { x: 320, y: 240 } });
```

- `startTactical(player, encounter, { origin })`: one player. `encounter` is an id or a record. Resolves with the result when the battle ends.
- `startTactical({ players, encounter, spectators, versus, origin })`: coop (several players on the allied side), `versus` makes it PvP against the enemy side (no AI), `spectators` watch from the start.
- `watchTactical(spectator, target)`: watch a running battle; resolves `false` when refused (see `onSpectate`).
- `stopTactical(player)`, `isInTactical(player)`, `getTactical(playerOrBattleId)`: stop, test, or get the running `TacticalHandle`.

## Server options (`provideTacticalServer`)

| Option | Default | Meaning |
|---|---|---|
| `units`, `skills`, `items`, `roles`, `encounters` | — | Data kept outside the RPGJS database (the database is read otherwise). |
| `ai` | attack the weakest target in range, else close in | Enemy AI (`TacticalAi`). |
| `enemyDelay` | `1650` | Delay between two enemy actions, in ms. |
| `turnSeconds` | `60` | Seconds a side has to play its phase with several players; `0`: no limit. An encounter's own value wins. |
| `hidePlayer` | `true` | Hide the player's map sprite during the battle. |
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
| `onEnd(player, battle, result)` | The battle ends. |
| `onDamage`, `onJudge`, `onAction`, `onMove`, `onDefeat`, `onPhase` | Synchronous rule hooks; they also receive `player` and `battle`. `onDamage` returns the final amount, `onJudge` returns the winning side to end the battle. |

New objective types: `registerObjectiveType(id, { judge(state, objective) })` returns `"ally"` or `"enemy"` when decided. Built-in types cannot be replaced; `unregisterObjectiveType(id)` removes yours.

## Client options (`provideTacticalClient`)

| Option | Meaning |
|---|---|
| `title`, `subtitle` | HUD branding (default: the `t.title` and `t.subtitle` texts). |
| `texts` | Override texts by key (see `messages`). |
| `hideGuis` | GUIs hidden during a battle. By default every GUI but the battle's and the ones that take the keyboard (dialog, menu, shop…). |
| `keepGuis` | GUIs that stay visible during a battle (for example a chat panel). Ignored when `hideGuis` is set. |
| `onBattleScene` | Called when the battle scene starts; return a function called when it ends. Use it to reduce or move your own GUI. |
| `sounds` | Sound ids for the cues `select`, `confirm`, `hit`, `back`. Without one, a short tone is synthesized. |
| `muted`, `reducedMotion` | Start muted or with reduced motion. |
| `hooks` | Client hooks declared without a module. |

## Client hooks

```ts
defineModule<RpgClient>({
  tactical: {
    onStart(state) {},
    onEvent(event, state, stage) {
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

`stage` gives `fx` (battle-kit `FxPlayer`), `screen` (`ScreenEffects`), `popup(text, x, y, { color, big })`, `world(cell)` (cell centre in map pixels) and `unit(id)` (reactive view of a unit).

## Not included

The package contains the rules, AI, HUD and battlefield. Wiring to a particular game stays in that game: reading the battle data from your own tools, a multiplayer lobby, launching a battle from a link, signals for scripts.
