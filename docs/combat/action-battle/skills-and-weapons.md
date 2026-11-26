---
title: "Skills and weapons"
description: "Skill and weapon actions, projectiles, attack profiles and thrown items in Action Battle."
---

# Skills and weapons

Skills, weapons and items can all declare an action that Action Battle executes on the map: melee hits, projectiles, areas and thrown items.

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

### `player.useSkill()` follows the action

On a map where action-battle is enabled, `player.useSkill(id, target?)` runs a
skill that has an `action` with the action-battle rules: SP cost, cooldown,
projectile, damage formula, factions, states and hit reactions. Without a
target, it aims at the nearest enemy within the reach of the action
(`action.range`, otherwise the skill targeting range), whatever the player
faces, and turns the player toward it; with none in reach, it is used straight
ahead. (A skill key pressed by the player keeps the soft targeting in front of
the player.)
A skill without `action` keeps the native RPGJS rule. This is what a hotbar
skill, your own server code and the scripts (`$player.useSkill`) call, so they
all hit the same way:

```ts
// Server code: launches the fireball projectile toward the slime
player.useSkill("fireball", slime);
```

```js
// A script: same rules, the target is the id of an event or a player
on("event.action", () => {
  $player.useSkill("fireball", { target: $event.id });
});
```

The use is refused (it throws, a script gets `false`) when the skill is not
learned, too expensive or cooling down. Another battle system can plug into
`player.useSkill` the same way with `registerSkillUseHandler` from
`@rpgjs/server`.

### Play an effect of the game at cast

`skills.playEffect` plays the effect of a skill or a combat item when it is
cast (server only), for an action with a `visual` or a projectile. It receives
the attacker, the first target, the skill or item, its `action` and its
`visual`. Return `false` (or nothing) when it played nothing: the `castFx` and
`impactFx` particles stay. Return `true` or a result when it played something:
those particles are turned off, and the result can

- delay the hit of an instant or melee action without `onUse` with
  `hitDelayMs`, so the damage lands when the effect reaches the target;
- give a projectile its path and its look with `projectile` (merged into
  `action.projectile`: `type`, `trajectory`, `pattern`, `params`...);
- replace the `area` of the action (a bomb that explodes where it ends).

```ts
provideActionBattle({
  skills: {
    playEffect: ({ attacker, target, visual }) => {
      if (!visual.effect) return false;
      attacker.getCurrentMap()?.playVisualEffect(
        { x: attacker.x(), y: attacker.y() },
        visual.effect,
        { target: target ? { x: target.x(), y: target.y() } : undefined },
      );
      return { hitDelayMs: 300 };
    },
  },
});
```

`visual.effect` names the effect of the game (with `visual.split`,
`castEffect` plays on the caster and `impactEffect` on the target). The Studio
preset (`createStudioActionBattlePreset`) plays the Visual Effects and the
Projectiles of the Studio database this way.

### Ranged weapons and projectile behaviors

A weapon whose `action.mode` is `projectile` turns the basic attack into a
shot: instead of swinging a hitbox, the attacker releases the projectile at the
end of the attack `startupMs`, so the release matches the draw of the bow.
Soft targeting then looks for a target up to `action.range`, and the shot aims
straight at it; besides enemies, it also picks scenery that declares
`onProjectileHit`, such as a switch. A ranged weapon keeps the timing of its own
`attackProfile`: the melee combo steps do not apply to it. This runs on the
server for players and enemies alike.

To play a bow animation, resolve the `attack` animation from the equipment,
with the same function on the server and on the client. `LPCSpritesheetPreset`
provides a `shoot` animation:

```ts
const attack = (entity) =>
  entity.equipments().some((item) => item.id() === "bow") ? "shoot" : "attack";

provideActionBattle({ animations: { attack } });
```

```ts
const Bow = {
  id: "bow",
  _type: "weapon" as const,
  attackProfile: { startupMs: 180, activeMs: 60, recoveryMs: 220 },
  action: {
    target: "enemy",
    range: 320,
    mode: "projectile",
    projectile: {
      type: "arrow",
      trajectory: { type: "arc", range: 320, speed: 460, height: 38 },
      landing: { radius: 12 },
      linger: { ms: 2500 }
    }
  }
};
```

The look of the `arrow` type is declared on the client with
[`projectiles.looks`](/guide/projectiles#standard-look).

`action.projectile` accepts the behaviors of the
[projectile system](/guide/projectiles#behaviors): `trajectory`, `landing`,
`linger`, `pierce`, `wall`, `collide` and `delay` (a wind-up in ms, for skills
that are not tied to an attack profile). An `arc` lands on the target of the
action.

Action Battle projectiles collide with:

- the targets allowed by `action.target`, which take the action effect;
- walls, which stop them (or follow `projectile.wall`);
- events that declare `onProjectileHit` without being combatants, such as a
  switch or a bush: they react through their own hook and take no damage.

Other events and allies are flown through.

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

## Attack profile model

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

## Thrown items in the hotbar

An item that declares an `action`, like a skill, is thrown from the hotbar
through the combat flow instead of `useItem()`. It is removed from the inventory
when it is thrown, unless it is `consumable: false`.

```ts
export const Bomb = {
  id: "bomb",
  name: "Bomb",
  icon: "bomb",
  _type: "item",
  action: {
    mode: "projectile",
    projectile: {
      type: "bomb",
      trajectory: { type: "arc", range: 220, duration: 0.55, height: 56 },
      linger: { ms: 1100 }
    },
    // Explodes where it lands: every target in the circle is hit,
    // with less damage and knockback toward the edge.
    area: { radius: 56, animation: "explosion" }
  }
};

export const Boomerang = {
  id: "boomerang",
  name: "Boomerang",
  icon: "boomerang",
  _type: "item",
  consumable: false,
  action: {
    mode: "projectile",
    cooldownMs: 700,
    projectile: {
      type: "boomerang",
      trajectory: { type: "return", speed: 320, range: 190 },
      pierce: true,
      wall: "return"
    }
  }
};
```

```ts
player.addItem(Bomb, 10);
player.assignHotbarSlot(0, { type: "item", id: "bomb" });
```

- When the client sends a point with the hotbar action
  (`engine.processAction("action-battle:use-hotbar", { slot, target })`), the
  item is aimed at it and an `arc` lands on it when it is in range. Otherwise
  it is thrown in the facing direction.
- `action.projectile` accepts every projectile behavior: `trajectory`,
  `collide`, `pierce`, `wall` and `linger`. See [Projectiles](/guide/projectiles).
- `action.area` uses `map.queryArea()` and hits each target through the combat
  flow (stats, knockback, hit-stop, damage numbers). With a projectile, it is
  applied where the projectile ends instead of on contact. Set
  `falloff: false` for full damage everywhere and `hitsUser: true` for a bomb
  that also catches its thrower.
- Events that react to projectiles with `onProjectileHit` (a switch, a bush)
  are hit by these items too, without damage.
- Items without `action` keep the regular hotbar behavior.

Physical damage reads the attack of the equipped weapon (`ATK` comes from the
equipment), so give the thrower a weapon or a damage formula that suits your
game.

## Use skills for attacks

```ts
import { type SkillObject } from "@rpgjs/server";

// Registered in the database of a server module: `database: { slash }`
export const slash: SkillObject = {
  name: "Slash",
  spCost: 5,
  power: 25,
  hitRate: 0.95
};

onInit() {
  this.hp = 100;
  this.sp = 50;
  this.learnSkill("slash");

  new BattleAi(this, {
    attackSkill: "slash"
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
