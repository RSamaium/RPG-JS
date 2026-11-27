---
title: "Enemies and AI"
description: "Configure enemy types, attack patterns and composable AI behaviors for Action Battle."
---

# Enemies and AI

Enemies are events with a `BattleAi`. The AI controller manages behavior only; stats come from the standard RPGJS API.

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

## Enemy attack cadence

Enemy attacks separate preparation (`startupMs`), the active phase
(`activeMs`) and recovery (`recoveryMs`). The enemy stops moving and keeps
its attack direction during these phases. The telegraph runs during preparation;
the attack animation then plays one complete cycle over active + recovery time.
The client receives this duration as `animationDefaults.durationMs`; damage
and action locks remain authoritative on the server, in both RPG and MMORPG.

A new attack waits for the global `attackCooldown`, the selected profile's
`cooldownMs`, and its complete phase duration. Combo strikes wait for their
profile's duration and cooldown before continuing; the global cooldown separates
attack sequences. Profile overrides allow faster or slower enemies without
depending on sprite names or image dimensions.

Default timings, in milliseconds:

| Pattern | Preparation | Active | Recovery | Minimum interval |
| --- | ---: | ---: | ---: | ---: |
| melee | 250 | 120 | 350 | 1100 |
| combo | 140 | 80 | 200 | 500 |
| charged | 800 | 140 | 500 | 1900 |
| zone | 450 | 180 | 420 | 1500 |
| dashAttack | 250 | 120 | 350 | 1200 |

Override these values through `BattleAi` options, for example
`attackProfiles: { melee: { startupMs: 180, recoveryMs: 250, cooldownMs: 800 } }`.
Without a client animation mapping, combat timings and damage still work.
Remote characters use the synchronized walk/stand state; local players retain
input-driven locomotion while temporary attack animations finish.

When `attackPatterns` is explicitly configured, archetype decisions choose only
from that list. If an archetype suggests no permitted pattern, the configured
list is retained. This prevents generic aggressive behavior from introducing a
combo or dash that the enemy designer disabled.

The elapsed-time playback correction also requires the companion CanvasEngine
sprite scheduler fix (raw and reset-envelope ticks). Publish that patch and
update the consumer's CanvasEngine lockfile alongside these RPGJS changes.

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
Global animation resolvers are also evaluated on the server for player skill
casts that do not supply animation overrides. This uses the caster's configured
Studio animations in both standalone and MMORPG games.

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
