---
title: "Action Battle System"
description: "Use the real-time action battle AI system for RPGJS enemies."
---

# Action Battle System

Advanced real-time action combat AI system for RPGJS.

The AI controller manages **behavior only**. All stats, HP, SP, skills, items, classes, and states are configured with the standard RPGJS API.

Combat happens in real time directly on the map: there is no separate battle scene. Players and enemies keep moving on the same map while they fight.

## Features

- Adventure combat by default: three-hit player combo, charged attack, and dodge invulnerability
- Reuses the standard RPGJS HUD and graphic-bound entity components
- Impact visual preset with particles, animated combat typography, and camera shake
- State machine AI with `Idle`, `Alert`, `Combat`, `Flee`, and `Stunned`
- Multiple enemy types: `Aggressive`, `Defensive`, `Ranged`, `Tank`, `Berserker`
- Attack patterns: `Melee`, `Combo`, `Charged`, `Zone`, `DashAttack`
- Skill support with standard RPGJS skills
- Dodge and counter-attack behaviors
- Group behavior and waypoint patrols
- Knockback driven by weapon configuration
- Hook system with `onBeforeHit` and `onAfterHit`

## Installation

```bash
npm install @rpgjs/action-battle
```

## Enable the module

Register the module on the server:

```ts
import { createServer } from "@rpgjs/server";
import { provideActionBattle } from "@rpgjs/action-battle/server";

export default createServer({
  providers: [
    provideActionBattle({
      animations: {
        attack: "attack"
      }
    })
  ]
});
```

The module also has a client entry point, `provideActionBattle` from `@rpgjs/action-battle/client`, used to configure client-side visuals and UI. See [Recommended composable DX](/combat/action-battle/customization#recommended-composable-dx).

## Quick Start

```ts
import { EventMode, ATK, PDEF, MAXHP, type EventDefinition } from "@rpgjs/server";
import { provideActionBattle, BattleAi, EnemyType } from "@rpgjs/action-battle/server";

function GoblinEnemy(): EventDefinition {
  return {
    name: "Goblin",
    onInit() {
      this.setGraphic("goblin");

      this.hp = 80;
      this.param[MAXHP] = 80;
      this.param[ATK] = 15;
      this.param[PDEF] = 5;

      new BattleAi(this, {
        enemyType: EnemyType.Aggressive
      });
    }
  };
}
```

When you build an object-based event for a map, type the factory as `EventDefinition`.
The returned object only describes the event behavior. Placement data such as `id`, `x`, and `y`
still belongs to the outer `maps[].events` wrapper.

## How a fight starts

There is no explicit call to start a fight. An event with a `BattleAi` engages
the players (or other entities) selected by its `targets` option when they come
within its `visionRange`, and players attack with the action control.
See [Factions and targets](/combat/action-battle/factions-and-multiplayer#factions-and-targets)
and [Player combat](/combat/action-battle/player-combat#player-combat).

## Next steps

- [Player combat](/combat/action-battle/player-combat): combo, charged attack, dash, guard, Studio skills, shortcuts and knockback.
- [Skills and weapons](/combat/action-battle/skills-and-weapons): skill and weapon actions, projectiles, attack profiles and thrown items.
- [Enemies and AI](/combat/action-battle/enemies-and-ai): enemy types, attack patterns, AI configuration, behaviors and debugging.
- [Solo and multiplayer](/combat/action-battle/factions-and-multiplayer): factions, targets, PvP, teams and MMORPG mode.
- [Customization](/combat/action-battle/customization): composable configuration, visuals, UI, extension points, stats and sounds.
