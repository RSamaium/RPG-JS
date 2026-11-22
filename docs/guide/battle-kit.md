---
title: "Battle kit"
description: "The foundation shared by the RPGJS battle systems: battle sessions, hooks, players, screen, controls, sound cues and presentation pieces."
---

# Battle kit

`@rpgjs/battle-kit` is the foundation shared by the battle systems of RPGJS: [`@rpgjs/turn-battle`](./turn-battle.md), [`@rpgjs/tactical-rpg`](./tactical-rpg.md), and the one you write. It holds what every battle shown in its own scene has to do the same way, whatever its rules, so that the battle systems take the same options and hooks and behave alike in standalone RPG mode and in MMORPG mode.

```bash
npm install @rpgjs/battle-kit
```

Peer dependencies: `@rpgjs/common`, `@rpgjs/client`, `@rpgjs/server`, `canvasengine`, `@canvasengine/presets`, `pixi.js`, `pixi-filters`.

## Three entry points

| Import | Content | Runtime |
|---|---|---|
| `@rpgjs/battle-kit/server` | battle sessions, participants, hooks of the game modules, database records, reading and writing a player | server |
| `@rpgjs/battle-kit` | screen (GUIs hidden during a battle), controls, sound cues, client hooks, effect presets and screen impacts, plus everything of `pure` | client |
| `@rpgjs/battle-kit/pure` | presentation clock, Visual Effect playback, floating-number motion, element colours, aim | none: safe in Node, tests and servers |

## Server: sessions and participants

The server owns every battle. `BattleSessions` is the registry of the running battles of one battle system: it answers the questions every battle system answers the same way.

```ts
import { BattleSessions, battleParticipants, isBattleGroup, type BattleHandleBase } from "@rpgjs/battle-kit/server";

const battles = new BattleSessions<MyHandle>("MyBattle");

export async function startMyBattle(a: RpgPlayer | MyGroupOptions) {
  const group = isBattleGroup(a) ? a : { players: [a] };
  const { players, versus, everyone, spectators } = battleParticipants("MyBattle", group); // same map, no duplicates
  const release = battles.reserve(everyone);                                              // throws when one is busy
  try {
    const session = createSession(players, versus);   // a BattleSession: handle, plays, leave, watch, closed
    battles.open(session, everyone);
    return await session.result;
  } finally {
    release();
  }
}

export const isInMyBattle = (player: RpgPlayer) => battles.isIn(player);
export const watchMyBattle = (spectator: RpgPlayer, target: RpgPlayer | string) => battles.watch(spectator, target);
export const stopMyBattle = (player: RpgPlayer) => battles.stop(player);
// in the server module: player.onDisconnected(player) { battles.disconnect(player) }
```

| Piece | Meaning |
|---|---|
| `BattleSessions` | `reserve`, `open`, `close`, `seat` / `release` (spectators), `isIn`, `get(playerOrId)`, `watch`, `stop`, `disconnect`. |
| `BattleHandleBase` | What every battle handle gives the hooks: `id`, `player`, `players`, `versus`, `spectators()`. |
| `battleParticipants(label, group)` / `isBattleGroup` | Checks who takes part (`players`, `versus`, `spectators`): no duplicates, one side per player, everyone on the leader's map. |
| `sameBattleMap(a, b)` | Are two players in the same room? A spectator watches from the map of the battle. |
| `battlePlayerName(player, index, fallback)` | The name a battle shows (never the id of a guest). |

## Server: hooks, database, players

```ts
import { BattleServerHooks, databaseRecord, readBattlePlayer, writeBattlePlayer } from "@rpgjs/battle-kit/server";

const hooks = new BattleServerHooks<MyServerHooks>("myBattle", options.hooks); // `myBattle: { … }` in game modules
if (await hooks.vetoed(player, "onCommand", player, battle, env)) return;
const damageHooks = hooks.functions(player, "onDamage");                     // synchronous rule hooks

const skill = databaseRecord<MySkill>(player, "fire");                        // plain object, decorated class included

const me = readBattlePlayer(player);  // hp, sp, params (equipment and states included), skills, items, equipments, graphic
writeBattlePlayer(player, { hp: 40, sp: 3, usedItems: { potion: 1 }, exp: 120, gold: 30 }, "MyBattle");
```

A battle system declares its hooks under its own key (`turnBattle`, `tactical`): a game module implements them with `defineModule<RpgServer>({ myBattle: { … } })`, and the `hooks` option of the battle system takes them too.

## Client: screen, controls, cues, hooks

```ts
import { BattleClientHooks, BattleCues, battleControls, hideGuisDuringBattle, synthTone, type BattleScreenOptions } from "@rpgjs/battle-kit";

// The screen options every battle system takes: hideGuis, keepGuis, onBattleShown.
const restore = hideGuisDuringBattle(MY_BATTLE_GUI, options);

// The controls of the battle GUI: keyboard controls of the game, gamepad mapping of the RPGJS GUIs.
const controls = signal(battleControls(engine, { up, down, action: confirm, escape: back, extra: { endTurn: { bind: "e", button: 3, keyDown: endTurn } } }));

// Sound cues: the sound the game gives, or a synthesized one.
const cues = new BattleCues({ cursor: (v) => synthTone(880, 0.04, { gain: 0.05 * v }) });
cues.configure(engine, { sounds: options.sounds });
cues.play("cursor");

const clientHooks = new BattleClientHooks<MyClientHooks>("myBattle", options.hooks);
const replaced = await clientHooks.replaced("onPlay", event, scene); // a hook returned false
```

`battleControls` gives the root of the battle GUI its CanvasEngine `controls` (`<DOMContainer controls={controls}>`): A confirms, B or Start goes back, the d-pad or the stick moves, L/R are `tabPrev` / `tabNext`. A built-in dialog shown over the battle (`modalGuiShown()`) or a text field the player writes in (`typingInTextField()`) keeps the keys.

The texts of a battle system go through the RPGJS i18n service: register the defaults with the `i18n` of the module, under keys named after the system (`myBattle.*`), and read them with `engine.t(key, params)`. The styles of its HUD belong in `@rpgjs/ui-css` (`rpg-ui-<system>-*` classes), with stories in its Storybook.

## Presentation

### Presentation clock

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

### Visual Effects

A Visual Effect of a battle is the particle effect of the core (`map.playVisualEffect`, see `VisualEffectOptions` of `@rpgjs/common`) played inside a battle scene, with the moment its target is hit. It uses the same vocabulary: a built-in `effect` name or a resolved `preset`, the tuning `color`, `intensity`, `sizeScale`, `speedScale`, and `sounds` whose `volume` goes from 0 to 1 and `start` is in ms.

```ts
import { runVisualEffect, type PlayableVisualEffect } from "@rpgjs/battle-kit/pure";

const fireball: PlayableVisualEffect = { effect: "fireball", color: "#ff6a00", duration: 900, hitAt: 500, sounds: [{ sound: "boom", start: 500 }] };
const playback = runVisualEffect(fireball, {
  spawn: (loop) => fx.playEffect(fireball, from, to, { loop }), // returns what stops the particles
  wait: (ms) => clock.wait(ms),
  sound: (id, volume) => cues.playSound(id, volume),
  onHit: () => showDamage(),                                    // called once, at hitAt
});
await playback.done;
```

- `effectCues(effect)` lists the sounds, the hit and the end in order, when you schedule them yourself.
- `visualEffectsOf(source)` copies the effects a source has (`effect`, or a `castEffect` and an `impactEffect`), to spread on a battle beat.

### Effect presets and screen impacts (client)

A battle scene is not made of map objects, so it plays its particles with `FxPlayer` (the runtime of the `<Fx>` component) in a layer of its own. The emitters that go to the target (`pathSpace: "target"`, `at: "target"`) are aimed by CanvasEngine.

```ts
import { FxPlayer, ScreenEffects } from "@rpgjs/battle-kit";

const fx = new FxPlayer({ maxParticles: 2000 });
container.addChild(fx.layer);
fx.play("fireball", x, y, { color: "#ff6600", scale: 1.5 });
fx.aimed("swordSlash", from, to);                       // flips and rotates towards the target
fx.playEffect(fireball, from, to);                      // a PlayableVisualEffect
fx.update(dtMs);                                        // every frame

const screen = new ScreenEffects();
screen.attach(stageContainer);
screen.shakeScreen(6);
screen.shockwaveAt(x, y);
screen.update(dtMs);
```

`FxPlayer.has(name)` tells whether a preset name exists, and `FxPlayer.preset(name, options)` builds one. Options are `color`, `scale`, `intensity`, `lifetime`, `flip`, `rotation` and `loop`.

### Colours, floating numbers, aim

- `elementColor(element)` returns the CSS colour of an element (`ELEMENT_COLORS` lists them); `toCss(number)` and `toHex(css)` convert between a Pixi number and CSS.
- `popupMotion(age)`, `digitMotion(age, index)` and `popupLift(age, chars)` give the motion of floating damage and heal numbers at a given age in ms.
- `aim(from, to)` returns `{ flip, rotation }` to orient a directional preset towards a point.
