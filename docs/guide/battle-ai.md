---
title: "Action Battle System"
description: "Use the real-time action battle AI system for RPGJS enemies."
---

# Action Battle System

Advanced real-time action combat AI system for RPGJS.

The AI controller manages **behavior only**. All stats, HP, SP, skills, items, classes, and states are configured with the standard RPGJS API.

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

## Factions and targets

`BattleAi` can target players, other battle events, every combat entity, hostile
factions, or an explicit list of factions.

```ts
new BattleAi(this, {
  faction: "monsters",
  targets: "players"
});
```

Available target selectors:

- `players`: target all players.
- `events`: target action-battle events.
- `all`: target players and action-battle events.
- `hostile`: target entities with a different faction.
- `["guards", "bandits"]`: target only these factions.
- `(context) => boolean`: fully custom target rule.

An allied event can share the player faction and attack only monster groups:

```ts
new BattleAi(this, {
  faction: "players",
  targets: ["monsters", "bandits"]
});
```

Two enemy groups can fight each other:

```ts
new BattleAi(this, {
  faction: "guards",
  targets: ["bandits"]
});
```

You can change faction and targets at runtime:

```ts
const ai = new BattleAi(this, {
  faction: "guards",
  targets: ["bandits"]
});

ai.setFaction("bandits");
ai.setTargets("hostile");
```

Players keep the previous behavior by default: their action attack targets
action-battle events. To enable PvP or teams, set the player target selector and
faction on the server:

```ts
player.actionBattleFaction = "red-team";
player.actionBattleTargets = ["blue-team"];
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

## Adventure player combat

Action Battle now uses the `adventure` preset by default. Press the action
control for a buffered three-hit combo, hold <kbd>E</kbd> and release it for a
charged attack, and use the normal dash control (<kbd>Shift</kbd> by default)
to dodge. Damage, charge duration, cooldowns, and invulnerability remain
server-authoritative.

Use `preset: "classic"` to retain the previous single-attack behavior and UI:

```ts
provideActionBattle({
  preset: "classic"
});
```

Every Adventure mechanic can be tuned independently:

```ts
provideActionBattle({
  combat: {
    player: {
      combo: {
        bufferMs: 140,
        resetMs: 700
      },
      chargedAttack: {
        control: "e",
        minChargeMs: 300,
        maxChargeMs: 900
      },
      dodge: {
        durationMs: 180,
        cooldownMs: 650,
        invincibilityMs: 220
      },
      guard: {
        control: "f",
        parryWindowMs: 140,
        guardDamageReduction: 0.65,
        guardArcDegrees: 120
      },
      softTargeting: {
        range: 112,
        coneDegrees: 110
      }
    }
  }
});
```

Guard is frontal and server-authoritative. A hit received during the opening
parry window is cancelled, staggers the attacker, and opens a short empowered
counterattack window. Soft targeting only adjusts the attack facing inside the
configured cone; it never moves the player or replaces manual direction.

Action Battle does not register another player HUD. Keep using the standard
RPGJS `hud.ce` component so HP, SP, face, and level remain consistent with the
rest of the game.

For enemies, `BattleAi` reuses the regular server `Components.hpBar()` and
merges it into `componentsTop`. That native component is positioned from the
rendered graphic bounds, not only from the entity hitbox, so it remains above
tall or scaled sprites. Generated four-direction Studio spritesheets also
exclude transparent frame padding from those bounds. Customize it through
`presentation.healthBar`:

```ts
new BattleAi(this, {
  presentation: {
    role: "boss",
    healthBar: {
      style: {
        width: 120,
        height: 9,
        fillColor: "#ff355d"
      },
      text: null,
      layout: { marginTop: 4 }
    }
  }
});
```

Set `presentation.healthBar: false` for entities that should not display it.
No additional HUD or custom HP-bar component is registered by Action Battle.

Mobile games can expose the charged attack through `withMobile({ buttons: {
heavy: true } })`; the heavy button dispatches the same authoritative charge
start/release controls as the keyboard.

## Studio skills and keyboard shortcuts

Skills loaded from RPGJS Studio can define their complete Action Battle
presentation and gameplay contract. The client only requests a skill use; the
server verifies that the skill is learned, that SP is available, that its
cooldown has elapsed, and that the selected target is valid.

```ts
{
  id: "fireball",
  _type: "skill",
  key: "1",
  casterAnimation: "mage-cast",
  animation: "fire-impact",
  sound: "fire-cast",
  impactSound: "fire-hit",
  targeting: {
    range: 6
  },
  action: {
    mode: "projectile",
    target: "enemy",
    cooldownMs: 900,
    visual: {
      castFx: "magicBurst",
      trailFx: "torchFire",
      impactFx: "explosionSmall"
    },
    projectile: {
      graphic: "fireball",
      speed: 240,
      scale: 1.2,
      rotateToDirection: true
    }
  }
}
```

`action.visual` controls client-only particle presentation and never changes
server gameplay:

- `castFx` is a short preset attached to the caster.
- `trailFx` is a continuous preset attached to the moving projectile.
- `impactFx` is a short preset attached to the target on impact.

Each field accepts a CanvasEngine built-in or custom FX preset name. Use
`"auto"` to retain Action Battle defaults and `"none"` to disable that phase.
The legacy `visual.fx` field remains supported as an impact alias, but
`impactFx` takes precedence.

`key` accepts the same keyboard names as project input controls. If it is
omitted, learned skills use the numeric slots `1` through `0`. The Adventure
preset reserves its charged-attack and guard keys, so Studio reports `E` and
`F` conflicts without blocking the save.

`targeting.range` is expressed in map tiles. A projectile can override its
travel range in pixels; otherwise Action Battle derives it from the targeting
range and tile width. When `action.mode` is `projectile` and no custom
projectile `type` is supplied, the built-in `action-battle-skill` CanvasEngine
renderer displays `projectile.graphic`, applies `scale`, and optionally rotates
the graphic along its trajectory. Damage and the impact animation/sound occur
only when the authoritative projectile collides.

Area masks use `#` for affected tiles and `.` for empty tiles. Studio exposes
this as a visual grid and canonicalizes legacy binary masks by treating `1` as
affected and `0` as empty.

Use `action.target` to select `enemy`, `ally`, `self`, or `any`. Ranged ally
skills and area shapes enter the targeting overlay; a single-target enemy
projectile can use the soft target in front of the player.

`animations` is optional. If you omit it, attacks keep using the default
`attack` animation and no extra hurt, death, or skill-cast animation is played.

Adventure attacks lock movement and facing through their active frames by
default, then allow movement or dodge to cancel recovery. Control locks are
leased independently, so a hurt, guard, dodge, or follow-up attack cannot let
an older timer restore stale animation or direction flags.

```ts
provideActionBattle({
  attack: {
    lockMovement: true,
    lockDurationMs: 350,
    showPreview: true,
    previewDurationMs: 180,
    previewColor: 0xfff3b0,
    previewAccentColor: 0xffffff
  }
});
```

Set `lockMovement` to `false` if you want players to keep moving while
attacking. The client stops local predicted movement as soon as the action
input is pressed and shows a short slash preview by default. Disable
`showPreview` when you provide your own client-side attack effect.

For precise attack-by-attack control, use the profile's `control` block:

```ts
provideActionBattle({
  attack: {
    profile: {
      startupMs: 55,
      activeMs: 100,
      recoveryMs: 180,
      control: {
        movementLock: "active",
        directionLock: "active",
        moveCancelsRecovery: true,
        dodgeCancelsRecovery: true,
        inputBufferMs: 160
      }
    }
  }
});
```

The `impact` visual preset adds CanvasEngine particles, anchored floating
damage typography, screen shake, and a short render-only hit-stop.
Accessibility controls can disable these independently without changing server
combat:

```ts
provideActionBattle({
  visual: "impact",
  feedback: {
    hitStop: true,
    hitStopMs: 32,
    heavyHitStopMs: 52,
    parryHitStopMs: 68,
    flashes: true,
    screenShake: true,
    damageNumbers: true
  }
});
```

## Recommended composable DX

New action-battle configuration is grouped by responsibility:

- `combat` owns gameplay rules: player attack profile, damage, knockback, and hit hooks.
- `visual` owns temporary combat feedback: sprite animations, flashes, damage text, CanvasEngine effects, and previews.
- `ui` owns client components: action bar, targeting overlay, attack preview, and custom GUI or sprite components.
- `ai` owns reusable AI behavior functions.
- `skills.targeting` owns action targeting metadata for skills.

Use the same `visual` preset on the server and client when your project splits
configuration by runtime. The server still decides when authoritative hit, hurt,
skill, and enemy attack feedback should happen, but it sends one compact
action-battle client visual event. The client resolves that visual locally and
groups the flash, hit text, sound, component animation, or sprite animation.

This keeps gameplay authority on the server while avoiding several visual
packets for one combat moment. The client also triggers local input feedback
such as the attack preview.

```ts
// config.server.ts
import {
  createActionBattleVisual,
  provideActionBattle
} from "@rpgjs/action-battle/server";

export default provideActionBattle({
  combat: {
    attack: {
      lockMovement: true,
      lockDurationMs: 280,
      profile: {
        startupMs: 70,
        activeMs: 110,
        recoveryMs: 160,
        hitPolicy: "oncePerTarget"
      }
    },
    hooks: {
      afterHit(result) {
        console.log(`Damage: ${result.damage}`);
      }
    }
  },

  visual: createActionBattleVisual("fx"),

  ai: {
    behaviors: {
      aggressive({ hpPercent }) {
        return {
          mode: hpPercent !== null && hpPercent < 0.25 ? "retreat" : "assault",
          attackCooldown: 850
        };
      }
    }
  }
});
```

```ts
// config.client.ts
import {
  createActionBattleUi,
  createActionBattleVisual,
  provideActionBattle
} from "@rpgjs/action-battle/client";

export default provideActionBattle({
  visual: createActionBattleVisual("fx"),
  ui: createActionBattleUi({
    hotbar: false,
    targeting: true,
    attackPreview: true
  })
});
```

If your game installs action-battle as a combined module, you can import the
same helpers from `@rpgjs/action-battle`.

### Visual composition

`createActionBattleVisual()` accepts a preset or a map of visual parts. A visual
part is a function receiving the current combat context and helper methods.

```ts
import { createActionBattleVisual } from "@rpgjs/action-battle/server";

const combatVisual = createActionBattleVisual({
  attack({ entity }, fx) {
    fx.graphic(entity, "attack");
  },
  hit({ target, damage }, fx) {
    fx.flash(target, { tint: "red", duration: 120 });
    fx.damageText(target, `-${damage}`);
    fx.component(target, "action-battle-hit-fx", {
      name: "hitSpark",
      scale: 0.8,
      zIndex: 1000
    });
  },
  hurt({ target }, fx) {
    fx.graphic(target, "hurt");
  },
  preview({ entity }, fx) {
    fx.preview(entity, { durationMs: 180 });
  }
});
```

Available presets:

```ts
visual: createActionBattleVisual("classic") // sprite animation + flash + hit text
visual: createActionBattleVisual("fx")      // classic + CanvasEngine Fx hit spark
visual: createActionBattleVisual("impact")  // contextual typography, particles + camera shake
visual: createActionBattleVisual("none")    // no built-in visual feedback
```

The `impact` preset selects an official CanvasEngine preset from the combat
context: `hitSpark` for normal hits, `slashSpark` for combo finishers,
`impactBurst` for charged or critical attacks, `magicBurst` for skills, and
`healPulse` for healing. Its world-space damage popup changes font size, color,
outline, movement, and duration for the same contexts. The built-in component
animations are registered as `action-battle-hit-fx` and
`action-battle-damage`.

A skill or weapon action can override its impact presentation with serializable
metadata:

```ts
const Fire = {
  id: "fire",
  name: "Fire",
  _type: "skill",
  action: {
    target: "enemy",
    mode: "instant",
    visual: {
      fx: "magicBurst",
      color: "#ffd166",
      accentColor: "#a62c21",
      scale: 1.2
    }
  }
};
```

These hints only affect the client presentation. Damage, SP consumption,
targeting, and hit resolution remain server-authoritative. You can also call
any component animation registered by your own client modules with
`fx.component(entity, id, params)`.

Action-battle visual composition runs through the general
[Client Visuals](/guide/client-visuals) mechanism for server-triggered combat
feedback. Use direct server visual APIs for isolated one-off effects, and use
`visual` here when you want action-battle to group combat presentation on the
client.

The legacy `animations` option still works for sprite animation names and
temporary graphics. New orchestration should go through `visual`, while
`animations` remains useful as the data source used by
`fx.graphic(entity, "attack")`, `fx.graphic(entity, "hurt")`, and
`fx.graphic(entity, "castSkill")`.

### Composable UI

Action Battle uses RPGJS's generic, server-authoritative hotbar. Enable it on
the server with `ui.hotbar`; targeting and attack-preview components remain
client-owned and replaceable.

```ts
import { provideActionBattle } from "@rpgjs/action-battle/server";

export default provideActionBattle({
  ui: {
    hotbar: {
      enabled: true,
      autoOpen: true,
      capacity: player => Math.min(10, 3 + player.level),
      lockedSlotHint: (_player, slot) => `Unlocks at level ${slot - 2}`
    }
  }
});
```

The client can still customize targeting and preview presentation:

```ts
import {
  ActionBattleUi,
  createActionBattleUi,
  provideActionBattle
} from "@rpgjs/action-battle/client";

export default provideActionBattle({
  ui: createActionBattleUi({
    targeting: {
      enabled: true,
      component: ActionBattleUi.TargetingOverlay,
      showGrid: true
    },
    attackPreview: {
      enabled: true,
      component: ActionBattleUi.AttackPreview
    },
    gui: [
      { id: "my-combat-panel", component: MyCombatPanel }
    ],
    spriteComponents: {
      front: [MySpriteOverlay],
      back: [MyShadow]
    }
  })
});
```

The generic hotbar uses LT/RT to cycle through visible slots and LB to open
the radial selector. Projects with a custom gamepad layout can override the
standard Gamepad API button indexes:

```ts
export default {
  gamepadControls: {
    hotbarPreviousButton: 6,
    hotbarNextButton: 7,
    hotbarUseButton: 2,
    hotbarWheelButton: 4
  }
};
```

Number keys use their assigned slot immediately. On a standard gamepad, LT/RT
change the active slot and X uses it. Instant skills soft-target in front of
the player; melee area skills keep the manual targeting confirmation.

Shortcuts are accepted:

```ts
ui: { hotbar: false }
ui: createActionBattleUi({ targeting: false, attackPreview: false })
```

### Compatibility

The legacy `attack`, `systems.combat`, `systems.ai`, and `skills.getTargeting`
options are still supported. New code should prefer `combat`, `ai`, and
`skills.targeting` so each part of the action-battle module stays independently
replaceable.

### Attack profile model

Use `attack.profile` to describe the timing model of a player attack in one
typed object. A profile separates the attack into startup, active, and recovery
phases so combat systems can share the same vocabulary.

```ts
provideActionBattle({
  attack: {
    profile: {
      id: "iron-sword",
      startupMs: 80,
      activeMs: 120,
      recoveryMs: 180,
      cooldownMs: 380,
      movementLock: true,
      directionLock: true,
      animationKey: "attack",
      hitPolicy: "oncePerTarget",
      reaction: {
        invincibilityMs: 250,
        hitstunMs: 150,
        staggerPower: 1
      },
      hitboxes: {
        right: { offsetX: 18, offsetY: -18, width: 42, height: 36 }
      }
    },
    lockDurationMs: 380
  }
});
```

The default profile mirrors the legacy attack lock: no startup, a short active
window, and recovery that totals `350ms`. The player attack runtime uses
`startupMs` before creating the hitbox, `activeMs` to keep the hitbox active,
and `totalDurationMs` for movement and direction locks.

| Field | Purpose |
|---|---|
| `id` | Stable name for this attack profile. |
| `startupMs` | Wind-up time before the attack should become active. |
| `activeMs` | Duration of the intended hit window. |
| `recoveryMs` | Time after the active window before the action fully recovers. |
| `cooldownMs` | Minimum delay before the same profile should be reused. |
| `movementLock` | Whether the attack should lock movement. |
| `directionLock` | Whether the attack should lock facing direction. |
| `animationKey` | Animation key from `animations`, usually `attack`. |
| `hitPolicy` | `oncePerTarget` blocks duplicate hits during one attack; `allowRepeatHits` allows repeated hits. |
| `reaction.invincibilityMs` | Temporary invincibility after this hit connects. |
| `reaction.hitstunMs` | Stun duration requested by this hit. |
| `reaction.staggerPower` | Stagger value compared against enemy `poise`. |
| `hitboxes` | Optional hitbox overrides for this profile. |

Weapons can override the player attack profile from their database entry:

```ts
const Dagger = {
  id: "dagger",
  name: "Dagger",
  _type: "weapon" as const,
  atk: 8,
  knockbackForce: 20,
  attackProfile: {
    id: "dagger",
    startupMs: 40,
    activeMs: 70,
    recoveryMs: 110
  }
};
```

## Skill and weapon actions

Skills and weapons can define an `action` block for action-battle selection,
while their effect stays automatic by default.
`BattleAi` evaluates every learned skill and uses `attackSkill` as a priority
hint. A skill that is cooling down, too expensive, out of range, or unable to
cover the target does not block a normal attack. Player hotbar skills, enemy
skills, and configured equipped weapons use the same executor, so `onUse`
receives the same context in every case.

```ts
const Fireball = {
  id: "fireball",
  name: "Fireball",
  _type: "skill" as const,
  spCost: 10,
  power: 40,
  hitRate: 0.95,
  action: {
    target: "enemy",
    range: 300,
    mode: "projectile",
    projectile: {
      type: "fireball",
      speed: 220,
      range: 300,
      spreadDegrees: 8
    }
  }
};
```

With no `onUse`, action-battle applies the standard RPGJS skill effect:
SP cost, hit rate, states, and damage formulas. For weapons, the default effect
is a physical hit using the equipped weapon stats and action-battle hit hooks.
`action.target` can be `"enemy"`, `"ally"`, `"self"`, or `"any"`; enemy
resolution uses the attacker's action-battle faction and `targets` selector.
Projectile direction uses the same generic projectile options as
`map.projectiles.emit()`, including `spreadDegrees` and `accuracy`.

Use `onUse(user, target, ctx)` only when the action needs custom logic:

```ts
const PoisonArrow = {
  id: "poison-arrow",
  _type: "skill" as const,
  spCost: 12,
  power: 20,
  action: {
    target: "enemy",
    range: 320,
    mode: "projectile",
    projectile: {
      type: "arrow",
      speed: 260,
      range: 320
    }
  },
  onUse(user, target, ctx) {
    ctx.projectile({
      type: "arrow",
      speed: 260,
      range: 320,
      onImpact({ target }) {
        ctx.defaultEffect(target);
        target?.addState?.("poison");
      }
    });
  }
};
```

For full custom actions, skip `ctx.defaultEffect()`:

```ts
const Heal = {
  id: "heal",
  _type: "skill" as const,
  spCost: 8,
  action: {
    target: "ally",
    range: 180,
    mode: "instant"
  },
  onUse(user, target, ctx) {
    ctx.heal(target, 35);
  }
};
```

Weapons use the same model:

```ts
const Claw = {
  id: "claw",
  _type: "weapon" as const,
  action: {
    target: "enemy",
    range: 45,
    mode: "instant"
  },
  onUse(user, target, ctx) {
    ctx.defaultEffect(target);
  }
};
```

## Plugin-first extension points

Action battle is structured as replaceable systems. You can keep the default
Zelda-like sword attack and only replace the pieces your game needs.

```ts
import { provideActionBattle } from "@rpgjs/action-battle/server";

export default provideActionBattle({
  combat: {
    attack: {
      lockMovement: true,
      lockDurationMs: 280,
      hitboxes: {
        right: { offsetX: 18, offsetY: -18, width: 42, height: 36 }
      }
    },
    damage({ attacker, target, skill }) {
      const raw = target.applyDamage(attacker, skill);
      return {
        damage: raw.damage,
        defeated: target.hp <= 0,
        raw
      };
    },
    hooks: {
      beforeHit(context) {
        return context;
      },
      afterHit(result) {
        console.log(`Damage: ${result.damage}`);
      }
    }
  },
  ai: {
    behaviors: {
      slime({ hpPercent }) {
        return {
          mode: hpPercent !== null && hpPercent < 0.25 ? "retreat" : "assault",
          attackCooldown: 900
        };
      }
    }
  }
});
```

The public extension contracts are exported from `@rpgjs/action-battle/server`:
`ActionBattleCombatSystem`, `ActionBattleAiBehavior`,
`ActionBattleHitHooks`, and `ActionBattleHitResult`.

For data-driven enemies, use `createActionEnemy()`:

```ts
import { createActionEnemy, EnemyType } from "@rpgjs/action-battle/server";

const enemyPresets = {
  slime: {
    enemyType: EnemyType.Aggressive,
    behaviorKey: "slime",
    stats(event) {
      event.hp = 40;
    }
  }
};

createActionEnemy(this, "slime", enemyPresets);
```

When the action targets a normal event with no `BattleAi`, the server lets the
event handle `onAction` and does not create the combat hitbox. Enemy events
with `BattleAi` still trigger the A-RPG attack.

## Configure stats with the standard RPGJS API

The AI uses the event's existing data.

### Health and resources

```ts
this.hp = 100;
this.param[MAXHP] = 100;
this.sp = 50;
this.param[MAXSP] = 50;
```

### Parameters

```ts
import { ATK, PDEF, SDEF } from "@rpgjs/server";

this.param[ATK] = 20;
this.param[PDEF] = 10;
this.param[SDEF] = 8;
```

### Skills

```ts
import { Fireball, Heal } from "./database/skills";

this.learnSkill(Fireball);
this.learnSkill(Heal);
```

### Items and equipment

```ts
import { Sword, Shield, Potion } from "./database/items";

this.addItem(Potion, 3);
this.equip(Sword);
this.equip(Shield);
```

### Classes

```ts
import { WarriorClass } from "./database/classes";

this.setClass(WarriorClass);
```

### States

```ts
import { PoisonState } from "./database/states";

this.addState(PoisonState);
```

## AI configuration

All AI options are optional:

```ts
new BattleAi(event, {
  enemyType: EnemyType.Aggressive,
  attackSkill: Fireball,
  attackCooldown: 1000,
  visionRange: 150,
  attackRange: 60,
  dodgeChance: 0.2,
  dodgeCooldown: 2000,
  fleeThreshold: 0.2,
  attackPatterns: [
    AttackPattern.Melee,
    AttackPattern.Combo,
    AttackPattern.DashAttack
  ],
  attackProfiles: {
    charged: {
      startupMs: 900,
      activeMs: 140,
      recoveryMs: 300,
      reaction: {
        hitstunMs: 240,
        staggerPower: 2
      }
    }
  },
  poise: 1,
  hitstunMs: 150,
  invincibilityMs: 250,
  patrolWaypoints: [
    { x: 100, y: 100 },
    { x: 300, y: 100 }
  ],
  groupBehavior: true,
  animations: {
    attack: {
      animationName: "walk",
      graphic: "goblin_attack",
      repeat: 1
    },
    hurt: {
      animationName: "walk",
      graphic: "goblin_hurt",
      repeat: 1
    },
    die: {
      animationName: "walk",
      graphic: "goblin_die",
      repeat: 1,
      delayMs: 700
    }
  },
  rewards: {
    exp: 50,
    gold: 25,
    items: [{ itemId: "health_potion", amount: 1, chance: 30 }],
    showNotification: true
  },
  onDefeated: ({ event, attacker }) => {
    const name = attacker?.name?.() ?? "Unknown";
    console.log(`${event.name} was defeated by ${name}!`);
  }
});
```

Per-enemy `animations` override the global `provideActionBattle()` animations.
Use a string for a simple animation name, an object to temporarily switch
graphics, or a resolver function for data-driven events. Return `null` or
`undefined` from a resolver to skip the animation.

`attackProfiles` lets enemies telegraph attacks with `startupMs`, keep hitboxes
active for `activeMs`, and apply hit reactions. `poise` controls interruption:
an incoming hit only stuns the enemy when its `reaction.staggerPower` is greater
than or equal to the enemy's `poise`.

`rewards` are awarded once to the player who lands the killing blow. On defeat,
Action Battle calls `event.remove({ reason: "defeated", transition })`. The
server removes collision immediately while clients keep the sprite long enough
to play its Studio `die` animation and a configurable CanvasEngine death effect.
Use `presentation.death` to tune the effect, scale, shake, and duration, or set
it to `false` for immediate removal. The legacy `onDefeated(event, attacker)`
signature remains supported for two-argument callbacks.

When combat spritesheets come from RPGJS Studio media fields, convert the media
ids with `createStudioActionBattleAnimations()`. Studio-generated combat
spritesheets are played with `setGraphicAnimation("attack", graphic, 1)` by
default:

```ts
import { provideActionBattle } from "@rpgjs/action-battle/server";
import { createStudioActionBattleAnimations } from "@rpgjs/studio/server";

export default provideActionBattle({
  animations: createStudioActionBattleAnimations()
});
```

Without arguments, the helper reads the Studio project animations attached to
the player at runtime by `provideStudioGame()`. You can still pass a static
object when you want to override the media ids manually. Animation values may be
media ids or media objects returned by the Studio game API.

Studio four-direction attack spritesheets play in `350ms` by default so their
visual timing matches the default Adventure attack profile without changing the
walk animation speed. A media record may override this client-side presentation
with `metadata.attackDurationMs`; gameplay startup, active, and recovery windows
remain server-authoritative and independent.

For Studio enemies, the runtime reads `enemy.animations` automatically when an
enemy is created from the Studio database. The supported Studio fields are
`attack`, `hurt`, `die`, `castSpell`, `guard`, `parry`, and `stagger`;
`castSkill` is also accepted when you configure action-battle directly.
`stagger` falls back to the Studio `hurt` animation. These values are resolved
on the server and sent to the client as plain animation data, so media IDs
remain usable without transferring resolver functions.

## Combat sounds and dynamic music

Action Battle can play local action cues and crossfade the current map BGM into
a looping battle track:

```ts
provideActionBattle({
  audio: {
    attack: ["sword-swing-1", "sword-swing-2"],
    skill: "magic-cast",
    hit: "blade-hit",
    hurt: "hero-hurt",
    die: "enemy-die",
    music: {
      battle: "battle-theme",
      volume: 0.8,
      fadeInMs: 600,
      fadeOutMs: 900,
      exitDelayMs: 1500
    }
  }
});
```

A cue accepts one sound id, several variants, or
`{ id, volume, cooldownMs }`. Basic attacks are predicted locally and suppress
the matching authoritative cue for 250ms. A skill's own `sound` field takes
priority over the generic skill cue. Cue cooldowns prevent repeated area hits
from producing an unusable wall of sound.

Combat threat is authoritative on the server and isolated per player. Alert,
combat, fleeing, and stunned enemies keep that player in combat. On equal
priority the currently selected enemy stays stable; bosses default to priority
`100` and ordinary enemies to `0`. Configure an enemy-specific track with:

```ts
new BattleAi(event, {
  presentation: {
    role: "boss",
    music: {
      battle: "boss-theme",
      priority: 120
    }
  }
});
```

Track precedence is enemy, map, project/default, then silence. The ambient sound
layer is never stopped. With RPGJS Studio, use the combined preset on both
client and server:

```ts
import { provideActionBattle } from "@rpgjs/action-battle";
import { createStudioActionBattlePreset } from "@rpgjs/studio";

provideActionBattle(createStudioActionBattlePreset());
```

Studio reads project `combatAudio`, map `combatMusic`, and enemy `combatMusic`
plus `combatMusicPriority`. `createStudioActionBattleAudio(config)` can provide
the same settings statically before these fields are available in a project.
Studio media ids are resolved lazily; resolving a new effect does not stop
music that is already playing.

The Adventure AI director limits how many enemies attack one target
simultaneously. Other enemies keep repositioning instead of stacking the same
attack:

```ts
provideActionBattle({
  ai: {
    director: {
      maxConcurrentAttackers: 1,
      slotDurationMs: 1200
    }
  }
});
```

## Composable AI behaviors

Action Battle has three AI layers. They all run on the server and end in the
same authoritative runtime for movement, attacks, skills, cooldowns, hit
reactions, and rewards.

- **Presets** are the fastest path for common enemies.
- **Simplified behaviors** are readable rule lists that return intentions.
- **Behavior trees** are the advanced API for bosses and custom enemy logic.

### Presets

Use a built-in preset and override only what changes:

```ts
import { BattleAi, AttackPattern } from "@rpgjs/action-battle/server";

new BattleAi(event, {
  preset: "aggressive",
  attackRange: 56,
  attackPatterns: [AttackPattern.Melee, AttackPattern.DashAttack],
  rewards: { exp: 12, gold: 4 }
});
```

Built-in presets are `aggressive`, `defensive`, `ranged`, `tank`, and
`berserker`. A preset is only behavior configuration. Stats still come from the
event itself.

Register project presets through `provideActionBattle()`:

```ts
import {
  AttackPattern,
  chase,
  flee,
  ifHpBelow,
  ifTargetInRange,
  provideActionBattle,
  useAttack
} from "@rpgjs/action-battle/server";

export default provideActionBattle({
  ai: {
    presets: {
      slime: {
        preset: "aggressive",
        attackCooldown: 900,
        attackPatterns: [AttackPattern.Melee],
        simpleBehavior: {
          when: [
            ifHpBelow(0.25, flee()),
            ifTargetInRange(useAttack(AttackPattern.Melee))
          ],
          otherwise: chase()
        }
      }
    }
  }
});
```

Then instantiate enemies from the preset:

```ts
new BattleAi(event, { preset: "slime" });
```

Presets are composable. A project preset can extend a built-in preset or another
project preset with `preset: "name"`. Local options passed to `new BattleAi()`
override the preset values.

### Simplified behaviors

Use `simpleBehavior` when you want expressive rules without writing a full
behavior tree. Each rule checks a condition and returns an intent:

```ts
import {
  AttackPattern,
  BattleAi,
  action,
  chase,
  flee,
  ifDistanceLessThan,
  ifHpBelow,
  ifTargetInRange,
  keepDistance,
  useAttack
} from "@rpgjs/action-battle/server";

new BattleAi(event, {
  preset: "ranged",
  simpleBehavior: {
    when: [
      ifHpBelow(0.3, flee()),
      ifDistanceLessThan(80, keepDistance(120)),
      ifTargetInRange(useAttack(AttackPattern.Zone), 115)
    ],
    otherwise: chase()
  }
});
```

Common condition helpers:

| Helper | Meaning |
|---|---|
| `ifHpBelow(ratio, intent)` | Run an intent when enemy HP is below a ratio. |
| `ifTargetVisible(intent)` | Run an intent when the AI currently has a target. |
| `ifTargetInRange(intent, range?)` | Run an intent when the target is within a range. |
| `ifDistanceLessThan(distance, intent)` | Run an intent when the target is too close. |

Common intention helpers:

| Helper | Runtime behavior |
|---|---|
| `chase()` / `moveToTarget()` | Move toward the current target. |
| `flee()` / `fleeFromTarget()` | Flee from the current target. |
| `keepDistance(distance, tolerance?)` | Retreat or approach until the target is near the desired distance. |
| `useAttack(pattern?)` | Use a configured attack pattern when cooldown and range allow it. |
| `useSkill(skill)` | Cast a skill against the current target when cooldown and range allow it. |
| `faceTarget()` | Face the current target. |
| `patrol()` | Continue the configured patrol route. |
| `idle()` | Stop movement for this AI tick. |

### Behavior trees

Use `behaviorTree` when you need explicit tree control. A tree node returns
`success`, `failure`, or `running`, optionally with an intent or decision.

```ts
import {
  AttackPattern,
  BattleAi,
  action,
  chase,
  condition,
  flee,
  hpBelow,
  selector,
  sequence,
  targetInRange,
  useAttack
} from "@rpgjs/action-battle/server";

new BattleAi(event, {
  preset: "tank",
  attackRange: 60,
  attackCooldown: 1200,
  poise: 2,
  behaviorTree: selector([
    sequence([
      condition(hpBelow(0.18)),
      action(flee())
    ]),
    sequence([
      condition(targetInRange(60)),
      action(useAttack(AttackPattern.Charged))
    ]),
    action(chase())
  ])
});
```

The built-in tree helpers are intentionally small:

| Helper | Purpose |
|---|---|
| `selector([...])` | Try children in order and return the first non-failure result. |
| `sequence([...])` | Run children in order and fail as soon as one child fails. |
| `condition(predicate)` | Convert a predicate into a tree node. |
| `action(intent)` | Convert an intent into a tree action. |
| `decision(fnOrObject)` | Return low-level AI decisions such as `mode`, cooldowns, or attack patterns. |
| `defineAiTree(input)` | Wrap a tree function or node. |
| `defineAiBehavior({ when, otherwise })` | Compile simplified behavior rules to a tree. |

### Dynamic behavior and memory

Intent functions receive the AI context and can use `memory` for per-enemy
state:

```ts
import { BattleAi, useAttack } from "@rpgjs/action-battle/server";

new BattleAi(event, {
  simpleBehavior: {
    otherwise: ({ memory }) => {
      memory.comboStep = (memory.comboStep ?? 0) + 1;
      return useAttack(memory.comboStep % 3 === 0 ? "charged" : "melee");
    }
  }
});
```

The context includes:

| Field | Description |
|---|---|
| `event` / `self.event` | The controlled `RpgEvent`. |
| `target` | The current `RpgPlayer` target, or `null`. |
| `targetInfo` | Target distance, visibility, and attack-range status. |
| `state` / `self.state` | Current `AiState`. |
| `enemyType` / `self.enemyType` | Current `EnemyType`. |
| `hpPercent` / `self.hpPercent` | Current HP ratio, or `null` if max HP is unavailable. |
| `memory` | Mutable per-AI storage for custom behavior state. |

### Boss phases and delayed sequences

Phase helpers keep scripted behavior in the existing behavior-tree runtime.
Their state is stored per AI instance in `memory`, so a preset can safely be
shared by several enemies:

```ts
import {
  AttackPattern,
  BattleAi,
  callAction,
  chase,
  phase,
  selector,
  sequenceWithDelay,
  setSpeed,
  teleportNearTarget,
  useAttack,
  visual,
  wait
} from "@rpgjs/action-battle/server";

new BattleAi(event, {
  behaviorTree: selector([
    phase("rage", 0.6, sequenceWithDelay("rage-sequence", [
      visual({ kind: "bubble", text: "!", durationMs: 700 }),
      wait(700),
      setSpeed(5),
      teleportNearTarget({ distance: 160 }),
      callAction("summon-wave", { count: 3 })
    ])),
    action(useAttack(AttackPattern.Melee)),
    action(chase())
  ])
});
```

`phase(key, hpRatio, action)` completes once after HP falls below the ratio.
`once(key, action)` provides the same one-time behavior without an HP
condition. `cooldown(key, ms, action)` starts its cooldown only after the
wrapped action succeeds. `sequenceWithDelay(key, steps)` advances across AI
ticks, and `wait(ms)` uses the authoritative server clock without creating
client-owned gameplay timers.

Use `run(callback)` when project logic is local to the tree. For reusable or
module-provided behavior, register a named action:

```ts
provideActionBattle({
  ai: {
    actions: {
      "summon-wave": ({ event, target, memory }, payload) => {
        const count = Number(payload?.count ?? 1);
        // Use normal RPGJS server APIs here.
      }
    }
  }
});
```

`callAction()` returns failure when its name is not registered, allowing a
selector to continue to a fallback branch.

### Server-driven AI visuals

`visual()` sends a JSON-shaped cue through the existing Action Battle client
visual packet. The server decides when it happens; the client handler only
renders it:

```ts
// Server
visual({
  kind: "ground-marker",
  durationMs: 900,
  position: { x: 320, y: 240 }
});

// Client
provideActionBattle({
  ai: {
    visuals: {
      "ground-marker"({ visual }, fx) {
        fx.component(
          "boss-ground-marker",
          visual.position as { x: number; y: number },
          { durationMs: visual.durationMs }
        );
      }
    }
  }
});
```

Unknown visual kinds are ignored. Keep cue payloads serializable and use
`once()` or `cooldown()` around cues selected by a tree branch so they are not
sent on every 100 ms AI tick. Visual handlers must never apply damage, change
stats, select targets, or otherwise own gameplay state.

### Movement and server actions

The advanced intent helpers are thin wrappers over the controlled event:

| Helper | Runtime behavior |
|---|---|
| `setSpeed(value)` | Set the event's synchronized speed; non-consuming by default. |
| `moveToPoint({ x, y })` | Use RPGJS `moveTo()` with the AI movement throttle. |
| `holdPosition()` | Stop the current movement. |
| `teleportTo({ x, y })` | Use RPGJS `teleport()` at a fixed position. |
| `teleportNearTarget({ distance, angleDegrees? })` | Compute a position around the current target on the server, then teleport. |
| `run(callback)` | Execute project logic directly with the current tree context. |
| `callAction(name, payload?)` | Execute a reusable action from `ai.actions`. |

Teleport helpers deliberately use the normal RPGJS teleport primitive and do
not search for a collision-free position. Projects that need safe placement
should resolve it in `run()` or a registered action before calling
`teleportTo()`.

### Sample project

`samples/sample-dev` contains four AI demo enemies on `center-map`:

- `Preset Rusher` uses a named preset.
- `Simple Kiter` uses `simpleBehavior` and distance control.
- `Tree Elite` uses a direct `behaviorTree`.
- `Phase Boss` uses delayed phases, generic visuals, speed changes,
  teleportation, and a registered action.

## Enemy types

Enemy types affect behavior, not stats:

| Type | Attack Speed | Dodge | Behavior |
|---|---|---|---|
| Aggressive | Fast | Low | Rushes player |
| Defensive | Slow | High | Counter-attacks |
| Ranged | Medium | Medium | Keeps distance |
| Tank | Slow | None | Stands ground |
| Berserker | Variable | Low | Faster when hurt |

## Attack patterns

| Pattern | Description |
|---|---|
| Melee | Single attack |
| Combo | 2-3 rapid attacks |
| Charged | Wind-up, stronger attack |
| Zone | 360° area attack |
| DashAttack | Rush toward target then attack |

## Use skills for attacks

```ts
import { Skill } from "@rpgjs/database";

@Skill({
  name: "Slash",
  spCost: 5,
  power: 25,
  hitRate: 0.95
})
export class Slash {}

onInit() {
  this.hp = 100;
  this.sp = 50;
  this.learnSkill(Slash);

  new BattleAi(this, {
    attackSkill: Slash
  });
}
```

All skills learned by the enemy are candidates. `attackSkill` makes one skill
the preferred opener without excluding the others. Melee skills require contact,
projectiles use their configured travel range, and instant area skills use
`targeting.range` plus `aoeMask`. While no action is ready, the enemy approaches,
retreats, or strafes toward the useful range of its next action.

Self-targeted healing and support skills are used automatically below 60% HP.
Ally-targeted skills are outside the current automatic planner.

## Debug enemy decisions

Decision tracing is disabled by default. Enable it on the authoritative server
and optionally filter one enemy or a set of categories:

```ts
import { AiDebug } from "@rpgjs/action-battle/server";

AiDebug.enabled = true;
AiDebug.filterEventId = "dark-mage-1";
AiDebug.categories = ["decision", "movement"];
```

`decision` logs include the distance, global cooldown, evaluated skills,
effective ranges, rejection reasons, and the selected attack or repositioning
request. Common rejection reasons are `cooldown`, `insufficientSp`,
`outOfRange`, `invalidTarget`, `maskMiss`, and `notUseful`.

For increasing levels of control, start with learned skills only, add
`attackSkill` for an explicit priority, use `defineActionBattleAiPreset()` for
reusable typed defaults, then use `behaviorKey` or a behavior tree for fully
custom decisions.

## Examples

### Basic enemy

```ts
import { type EventDefinition, ATK, MAXHP } from "@rpgjs/server";

function Goblin(): EventDefinition {
  return {
    name: "Goblin",
    onInit() {
      this.setGraphic("goblin");
      this.hp = 50;
      this.param[MAXHP] = 50;
      this.param[ATK] = 10;

      new BattleAi(this);
    }
  };
}
```

### Mage with skills

```ts
import { ATK, MAXHP, MAXSP, type EventDefinition } from "@rpgjs/server";

function DarkMage(): EventDefinition {
  return {
    name: "Dark Mage",
    onInit() {
      this.setGraphic("mage");
      this.hp = 60;
      this.sp = 100;
      this.param[MAXHP] = 60;
      this.param[MAXSP] = 100;
      this.param[ATK] = 25;

      this.learnSkill(Fireball);

      new BattleAi(this, {
        enemyType: EnemyType.Ranged,
        attackSkill: Fireball,
        visionRange: 200
      });
    }
  };
}
```

### Patrol guard

```ts
import { ATK, MAXHP, type EventDefinition } from "@rpgjs/server";

function PatrolGuard(): EventDefinition {
  return {
    name: "Guard",
    onInit() {
      this.setGraphic("guard");
      this.hp = 80;
      this.param[MAXHP] = 80;
      this.param[ATK] = 15;

      new BattleAi(this, {
        enemyType: EnemyType.Defensive,
        patrolWaypoints: [
          { x: 100, y: 150 },
          { x: 300, y: 150 },
          { x: 300, y: 350 },
          { x: 100, y: 350 }
        ]
      });
    }
  };
}
```

## Player combat

The module handles player attacks via the `action` input:

```ts
// Player presses action key -> attack animation + hitbox
// Hitbox detects enemy -> applyPlayerHitToEvent(player, event)
// Damage uses RPGJS formula: target.applyDamage(attacker)
```

## Knockback system

Knockback force is driven by the equipped weapon's `knockbackForce` property:

```ts
const Warhammer = {
  id: "warhammer",
  name: "War Hammer",
  atk: 30,
  knockbackForce: 100,
  _type: "weapon" as const
};
```
