import { describe, expect, it } from "vitest";
import { createEncounter } from "./fixture";
import { transition } from "../core/rules";
import { Choreography, actionTiming, itemTiming, type Stage } from "../client/choreography";
import type { BattleEvent, BattleState } from "../core/types";

/** Records what the choreography asks the stage (kit player, screen, numbers) to do. */
function fakeStage() {
  const calls: { t: number; kind: string; name: string; from?: { x: number; y: number }; to?: { x: number; y: number } }[] = [];
  let now = 0;
  const screen = {
    hitstop: 0,
    update(dt: number) {
      now += dt;
      screen.hitstop = Math.max(0, screen.hitstop - dt);
    },
    freeze: (ms: number) => (screen.hitstop = Math.max(screen.hitstop, ms)),
    shakeScreen: () => calls.push({ t: now, kind: "shake", name: "" }),
    zoomBlurAt: () => {},
    shockwaveAt: () => calls.push({ t: now, kind: "shockwave", name: "" }),
    chromatic: () => {},
  };
  const stage: Stage = {
    fx: {
      update: () => {},
      play: (name) => (calls.push({ t: now, kind: "play", name }), () => {}),
      aimed: (name) => (calls.push({ t: now, kind: "aimed", name }), () => {}),
      playEffect: (effect, from, to) => (calls.push({ t: now, kind: "effect", name: effect.effect ?? "", from, to }), () => {}),
    },
    screen,
    popup: (text) => calls.push({ t: now, kind: "popup", name: text }),
    sound: (id, volume) => calls.push({ t: now, kind: "sound", name: `${id}:${volume}` }),
  };
  return { stage, calls };
}

/** Play an event for `seconds` of 16 ms frames. */
function run(event: BattleEvent, before: BattleState, after: BattleState, reduced = false, seconds = 1.6, custom = false) {
  const { stage, calls } = fakeStage();
  const choreo = new Choreography(stage, () => reduced);
  const animation = { event, before, custom };
  let clock = 0;
  for (let t = 0; t <= seconds * 1000; t += 16) clock = choreo.frame(1000 + t, animation, after);
  return { calls, clock, choreo };
}

const started = () => transition(createEncounter(), { type: "start" }, "ally").state;

describe("tactical choreography", () => {
  /** Nothing of the kit of the turn-based battle is played: no preset, no shake, no ripple. */
  const kit = (calls: { kind: string }[]) => calls.filter((c) => c.kind === "play" || c.kind === "aimed" || c.kind === "shake" || c.kind === "shockwave");

  it("shows nothing over a move: the character walks, as on the map", () => {
    const before = started();
    const { calls } = run({ kind: "move", unitId: "ally-warrior", path: [{ x: 4, y: 4 }, { x: 4, y: 3 }] }, before, before);
    expect(calls).toEqual([]);
  });

  it("shows an attack as the map does: the number and the knock-out, the unit hit flashes and is pushed back, without any effect of the turn-based battle", () => {
    const before = started();
    const warrior = before.units.find((u) => u.id === "ally-warrior")!;
    const foe = before.units.find((u) => u.team === "enemy")!;
    const event: BattleEvent = { kind: "attack", unitId: warrior.id, targetId: foe.id, hits: [{ unitId: foe.id, damage: 99, killed: true }] };
    const { stage, calls } = fakeStage();
    const choreo = new Choreography(stage, () => false);
    let pushed = false;
    let flashed = false;
    for (let t = 0; t <= 1600; t += 16) {
      choreo.frame(1000 + t, { event, before }, before);
      const fx = choreo.unitFx(foe.id);
      pushed ||= fx.dx !== 0 || fx.dy !== 0;
      flashed ||= fx.flash > 0;
    }

    const number = calls.find((c) => c.kind === "popup" && c.name === "99")!;
    expect(number.t).toBeGreaterThanOrEqual(500 - 16);
    expect(calls.some((c) => c.name === "K.O.")).toBe(true);
    expect(pushed).toBe(true);
    expect(flashed).toBe(true);
    expect(kit(calls)).toEqual([]);
    expect(calls.every((c) => c.kind === "popup")).toBe(true);
  });

  it("shows a shield sign over a unit that guards", () => {
    const before = started();
    const { calls } = run({ kind: "guard", unitId: "ally-warrior" }, before, before);
    expect(calls.map((c) => [c.kind, c.name])).toEqual([["popup", "⛨"]]);
  });

  it("shows only the numbers for a skill that names no Visual Effect", () => {
    const before = started();
    const mage = before.units.find((u) => u.role === "mage" && u.team === "ally")!;
    const foe = before.units.find((u) => u.team === "enemy")!;
    const event: BattleEvent = { kind: "skill", unitId: mage.id, targetId: foe.id, skillId: "ember-nova", hits: [{ unitId: foe.id, damage: 30, killed: false }] };
    const { calls } = run(event, before, before);
    expect(calls.map((c) => [c.kind, c.name])).toEqual([["popup", "30"]]);
  });

  describe("Visual Effects of the skills", () => {
    /** The mage casts `ember-nova` on a foe, the skill carrying the given effects. */
    const cast = (effects: Record<string, unknown>, seconds = 2.5) => {
      const before = started();
      before.skills["ember-nova"] = { ...before.skills["ember-nova"], ...effects };
      const mage = before.units.find((u) => u.role === "mage" && u.team === "ally")!;
      const foe = before.units.find((u) => u.team === "enemy")!;
      const event: BattleEvent = { kind: "skill", unitId: mage.id, targetId: foe.id, skillId: "ember-nova", hits: [{ unitId: foe.id, damage: 30, killed: false }] };
      return { ...run(event, before, before, false, seconds), mage, foe };
    };
    const bolt = { effect: "fireball", duration: 1400, hitAt: 1000, sounds: [{ sound: "whoosh", start: 0, volume: 0.5 }, { sound: "boom", start: 1000, volume: 0.8 }] };

    it("plays the effect from the caster to the target instead of the look of the skill, and the hits land at its hitAt", () => {
      const { calls } = cast({ effect: bolt });
      const effect = calls.find((c) => c.kind === "effect")!;
      const number = calls.find((c) => c.kind === "popup" && c.name === "30")!;

      expect(effect.name).toBe("fireball");
      expect(effect.from!.x).not.toBe(effect.to!.x);
      expect(calls.some((c) => c.name === "summonSigil" || c.name === "meteorImpact" || c.name === "hitSpark")).toBe(false);
      // The hits wait for the effect: 1 s after it started (the event clock runs on 16 ms frames)
      expect(number.t - effect.t).toBeGreaterThanOrEqual(1000 - 16);
      expect(number.t - effect.t).toBeLessThan(1100);
      expect(calls.some((c) => c.kind === "shockwave")).toBe(false); // no ripple on the screen
    });

    it("plays the sounds of the effect at their start", () => {
      const { calls } = cast({ effect: bolt });
      const effect = calls.find((c) => c.kind === "effect")!;
      const sounds = calls.filter((c) => c.kind === "sound");

      expect(sounds.map((c) => c.name)).toEqual(["whoosh:0.5", "boom:0.8"]);
      expect(sounds[0].t).toBe(effect.t);
      expect(sounds[1].t - effect.t).toBeGreaterThanOrEqual(1000 - 16);
    });

    it("split: the effect of the cast on the caster, then the effect of the impact on each unit hit, the hits at its hitAt", () => {
      const { calls } = cast({ castEffect: { effect: "chargeOrb", duration: 600, hitAt: 400 }, impactEffect: { effect: "explosionSmall", duration: 500, hitAt: 200 } });
      const charge = calls.find((c) => c.kind === "effect" && c.name === "chargeOrb")!;
      const blast = calls.find((c) => c.kind === "effect" && c.name === "explosionSmall")!;
      const number = calls.find((c) => c.kind === "popup" && c.name === "30")!;

      // The impact starts once the cast is over (600 ms): the animation, then the impact, never both at once
      expect(blast.t - charge.t).toBeGreaterThanOrEqual(600 - 16);
      expect(blast.from).toEqual(blast.to);
      expect(number.t - blast.t).toBeGreaterThanOrEqual(200 - 16);
      expect(calls.some((c) => c.name === "summonSigil" || c.name === "fireball")).toBe(false);
    });

    it("split: the part without an effect shows nothing more", () => {
      const { calls } = cast({ castEffect: { effect: "chargeOrb", duration: 600, hitAt: 300 } });

      expect(calls.filter((c) => c.kind === "effect").map((c) => c.name)).toEqual(["chargeOrb"]);
      expect(calls.some((c) => c.kind === "play" || c.kind === "aimed")).toBe(false);
    });

    it("lengthens the action for a long effect, and keeps the default timing without one", () => {
      expect(actionTiming()).toEqual({ release: 0.5, impact: 0.5, end: 1.5 });
      const before = started();
      const plain = before.skills["ember-nova"];
      expect(actionTiming(plain)).toEqual({ release: 0.5, impact: 0.55, end: 1.5 });
      expect(actionTiming({ ...plain, effect: { ...bolt, duration: 2400 } })).toMatchObject({ impact: 1.08, end: 2.48 });
      expect(actionTiming({ ...plain, castEffect: { effect: "a", duration: 600, hitAt: 400 }, impactEffect: { effect: "b", duration: 500, hitAt: 200 } }).impact).toBeCloseTo(0.8);
    });
  });

  describe("Visual Effects of the items", () => {
    /** The warrior uses `herb` on the mage, the item carrying the given effect. */
    const use = (effect?: Record<string, unknown>, seconds = 2.5) => {
      const before = started();
      before.items = { ...before.items, herb: { id: "herb", name: "Herb", hp: 40, sp: 0, ...(effect ? { effect } : {}) } as BattleState["items"][string] };
      const warrior = before.units.find((u) => u.id === "ally-warrior")!;
      const mage = before.units.find((u) => u.role === "mage" && u.team === "ally")!;
      const event: BattleEvent = { kind: "item", unitId: warrior.id, targetId: mage.id, itemId: "herb", heals: [{ unitId: mage.id, hp: 40, sp: 0 }] };
      return run(event, before, before, false, seconds);
    };
    const sparkle = { effect: "healPulse", duration: 1200, hitAt: 800, sounds: [{ sound: "chime", start: 0, volume: 0.5 }] };

    it("plays the effect from the user to the unit it heals instead of the green burst, the numbers at its hitAt, with its sounds", () => {
      const { calls } = use(sparkle);
      const effect = calls.find((c) => c.kind === "effect")!;
      const number = calls.find((c) => c.kind === "popup" && c.name === "+40")!;

      expect(effect.name).toBe("healPulse");
      expect(effect.from).not.toEqual(effect.to);
      expect(calls.some((c) => c.name === "magicBurst")).toBe(false);
      expect(number.t - effect.t).toBeGreaterThanOrEqual(800 - 16);
      expect(number.t - effect.t).toBeLessThan(900);
      expect(calls.filter((c) => c.kind === "sound").map((c) => c.name)).toEqual(["chime:0.5"]);
    });

    it("shows only the numbers, at the usual time, without an effect", () => {
      const { calls } = use();
      const number = calls.find((c) => c.kind === "popup" && c.name === "+40")!;

      expect(calls.every((c) => c.kind === "popup")).toBe(true);
      expect(number.t).toBeGreaterThanOrEqual(350 - 16);
      expect(number.t).toBeLessThan(400);
    });

    it("lengthens the action for a long effect", () => {
      expect(itemTiming()).toEqual({ release: 0.15, impact: 0.35, end: 1.5 });
      expect(itemTiming({ effect: { ...sparkle, duration: 2400 } })).toMatchObject({ release: 0.08, impact: 0.88, end: 2.48 });
    });
  });

  it("does not push a unit back with reduced motion: it only flashes", () => {
    const before = started();
    const warrior = before.units.find((u) => u.id === "ally-warrior")!;
    const foe = before.units.find((u) => u.team === "enemy")!;
    const event: BattleEvent = { kind: "attack", unitId: warrior.id, targetId: foe.id, hits: [{ unitId: foe.id, damage: 5, killed: false }] };
    const { stage } = fakeStage();
    const choreo = new Choreography(stage, () => true);
    let pushed = false;
    let flashed = false;
    for (let t = 0; t <= 1600; t += 16) {
      choreo.frame(1000 + t, { event, before }, before);
      const fx = choreo.unitFx(foe.id);
      pushed ||= fx.dx !== 0 || fx.dy !== 0;
      flashed ||= fx.flash > 0;
    }
    expect(pushed).toBe(false);
    expect(flashed).toBe(true);
  });
  it("plays nothing when a client onEvent hook took the event over", () => {
    const before = started();
    const warrior = before.units.find((u) => u.id === "ally-warrior")!;
    const target = before.units.find((u) => u.id === "enemy-warrior")!;
    target.y = warrior.y - 1;
    target.x = warrior.x;
    const out = transition(before, { type: "attack", unitId: warrior.id, targetId: target.id }, "ally");
    expect(run(out.event, before, out.state).calls.length).toBeGreaterThan(0);
    expect(run(out.event, before, out.state, false, 1.6, true).calls).toEqual([]);
  });
});
