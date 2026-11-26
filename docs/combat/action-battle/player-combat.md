---
title: "Player combat"
description: "Adventure combat, Studio skills, shortcuts and knockback from the player's side."
---

# Player combat

This page covers what the player controls in an action battle: the Adventure combo, charged attack, dodge and guard, Studio skill shortcuts, basic attacks and knockback.

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

Cast and impact FX finish naturally after their last particle disappears; the
combat renderer does not impose a fixed timeout. Use finite, non-looping presets
for these two phases, and looping presets for projectile trails. This lifecycle
runs on the client in both standalone and multiplayer games and does not delay
server damage, cooldowns, or subsequent actions. Custom component animations can
still use `displayDuration` when an explicit cutoff is intended.

In Studio, the active actor's animation overrides take precedence over its linked
character spritesheet animations. The server synchronizes the resolved animation
references to the client, so predicted attacks and server-triggered casts use the
same actor presentation in standalone and multiplayer games. Project animations
are only a client fallback before actor data arrives. Skill impact animations
remain independent of the actor's casting animation.

`key` accepts the same keyboard names as project input controls. If it is
omitted, learned skills use the numeric slots `1` through `0`. The Adventure
preset reserves its charged-attack and guard keys, so Studio reports `E` and
`F` conflicts without blocking the save.

For instant skills, a zero range uses the player's configured soft-targeting
distance to select a nearby enemy in front of the caster. Positive ranges remain
explicit limits. This fallback only applies to targets selected by the server;
manually submitted target tiles still obey the configured range. Impact animations
play on enemies actually affected by the skill.

`targeting.range` is expressed in map tiles. A projectile can override its
travel range in pixels; otherwise Action Battle derives it from the targeting
range and tile width. When `action.mode` is `projectile`, the projectile is
drawn by the [standard projectile component](/guide/projectiles#standard-look)
unless a component is registered for its `type`: it displays
`projectile.graphic`, applies `scale`, optionally rotates the graphic along its
trajectory, and takes every other look option (shape, trail, shadow, impact)
from the client look registered for that `type`. Damage and the impact animation/sound occur only when
the authoritative projectile collides.

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
