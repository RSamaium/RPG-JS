---
title: "Battle kit"
description: "Shared presentation pieces for battle systems: effect presets, screen impacts, floating numbers, colours, a presentation clock and Visual Effect playback."
---

# Battle kit

`@rpgjs/battle-kit` gathers what every battle system needs to *show* a fight. It is independent of the rules: it is used by `@rpgjs/turn-battle` and `@rpgjs/tactical-rpg`, and you can use it to build your own battle scene.

```bash
npm install @rpgjs/battle-kit
```

Peer dependencies: `canvasengine`, `@canvasengine/presets`, `pixi.js`, `pixi-filters`.

## Two entry points

| Import | Content | Runtime needed |
|---|---|---|
| `@rpgjs/battle-kit/pure` | clock, colours, floating-number motion, aim, Visual Effect records and timeline | none: safe in Node, tests and servers |
| `@rpgjs/battle-kit` | everything above, plus `FxPlayer` and `ScreenEffects` | Pixi and CanvasEngine (client only) |

## Presentation clock

`Clock` runs tweens and waits on a time you can scale, freeze (hit-stop) or flush. You drive it from your render loop.

```ts
import { Clock, ease } from "@rpgjs/battle-kit/pure";

const clock = new Clock();
clock.speed = 2;                                        // twice as fast
await clock.wait(500);                                  // 500 ms of battle time
await clock.tween(300, (t) => (sprite.alpha = t), ease.outCubic);
clock.tick(deltaMs);                                    // call it every frame
clock.freeze(80);                                       // hit-stop for 80 real ms
clock.flush();                                          // finish everything pending now
```

## Colours, floating numbers, aim

- `elementColor(element)` returns the CSS colour of an element (`ELEMENT_COLORS` lists them); `toCss(number)` and `toHex(css)` convert between a Pixi number and CSS.
- `popupMotion(age)`, `digitMotion(age, index)` and `popupLift(age, chars)` give the motion of floating damage and heal numbers at a given age in ms.
- `aim(from, to)` returns `{ flip, rotation }` to orient a directional preset towards a point.

## Visual Effects

A Visual Effect is one CanvasEngine FX preset (a built-in `base` name or a `preset` object), with sounds placed on its timeline and the moment (`hitAt`) the target is hit.

```ts
import { playableVisualEffect, runVisualEffect } from "@rpgjs/battle-kit/pure";

const effect = playableVisualEffect(record);            // undefined when the record shows nothing
if (effect) {
  const playback = runVisualEffect(effect, {
    spawn: (loop) => fx.playEffect(effect, from, to, { loop }),   // returns what stops the particles
    wait: (ms) => clock.wait(ms),
    sound: (id, volume) => audio.play(id, volume),                // volume from 0 to 1, optional
    onHit: () => applyDamage(),                                   // called once, at hitAt
  });
  await playback.done;
}
```

- `playableVisualEffect(record)` reads a record of your database: `base`, `preset`, `settings`, `duration`, `hitAt`, `loop`, `sounds`.
- `visualEffectTimeline(effect)` lists the sounds, the hit and the end in order, when you schedule them yourself.
- `skillVisualEffects(visual, lookup)` reads the effects a skill shows: `effect`, or with `split: true` a `castEffect` on the caster and an `impactEffect` on each target. `lookup(id)` returns the database record of an effect id (its `_type` must be `"visualEffect"` when set).
- `visualEffectsOf(source)` copies the effects a source has, to spread on a battle beat.
- `resolveTargetSpace(preset, target)` maps the `pathSpace: "target"` and `at: "target"` keys of a preset to pixels. It is temporary until CanvasEngine supports a target natively ([CanvasEngine#88](https://github.com/RSamaium/CanvasEngine/issues/88)).

## Client: FxPlayer and ScreenEffects

```ts
import { FxPlayer, ScreenEffects } from "@rpgjs/battle-kit";

const fx = new FxPlayer({ maxParticles: 2000 });
container.addChild(fx.layer);                           // the layer the effects are drawn in
const stop = fx.play("fireball", x, y, { color: "#ff6600", scale: 1.5 });
fx.aimed("slash", from, to);                            // flips and rotates towards the target
fx.update(dtMs);                                        // every frame

const screen = new ScreenEffects();
screen.attach(stageContainer);
screen.shakeScreen(6);
screen.shockwaveAt(x, y);
screen.update(dtMs);
```

`FxPlayer.has(name)` tells whether a preset name exists, and `FxPlayer.preset(name, options)` builds one. Options are `color`, `scale`, `intensity`, `lifetime`, `flip`, `rotation` and `loop`.
