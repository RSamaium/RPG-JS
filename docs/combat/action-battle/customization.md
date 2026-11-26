---
title: "Customization"
description: "Composable configuration, visuals, UI, extension points, stats and sounds for Action Battle."
---

# Customization

Action Battle is configured by responsibility (`combat`, `visual`, `ui`, `ai`, `skills`) and can be extended with plugins. Stats use the standard RPGJS API.

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
