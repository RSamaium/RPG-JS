import { describe, expect, it } from "vitest";
import { Clock, playableVisualEffect, runVisualEffect, visualEffectTimeline, type PlayableVisualEffect } from "./pure";

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

/** Advances the clock in 10 ms frames up to `ms`, letting the promises run after each frame. */
async function advance(clock: Clock, ms: number) {
  for (let t = 0; t < ms; t += 10) {
    clock.tick(10);
    await flush();
  }
}

function play(effect: PlayableVisualEffect, once = false) {
  const clock = new Clock();
  const events: string[] = [];
  let spawned: boolean | undefined;
  let stops = 0;
  const playback = runVisualEffect(effect, {
    spawn: (loop) => {
      spawned = loop;
      events.push(`spawn@${clock.now}`);
      return () => stops++;
    },
    wait: (ms) => clock.wait(ms),
    sound: (id, volume) => events.push(`${id}:${volume}@${clock.now}`),
    onHit: () => events.push(`hit@${clock.now}`),
    once,
  });
  return { clock, events, playback, spawned: () => spawned, stops: () => stops };
}

const fireball: PlayableVisualEffect = {
  base: "fireball",
  duration: 900,
  hitAt: 500,
  sounds: [
    { sound: "whoosh", start: 0, volume: 50 },
    { sound: "boom", start: 500 },
    { sound: "crackle", start: 700, volume: 100 },
  ],
};

describe("Visual Effects played by the battles", () => {
  describe("playableVisualEffect", () => {
    it("keeps what plays an effect and leaves out its name, category and prompt", () => {
      const effect = playableVisualEffect({
        _id: "fx1",
        name: "Fireball",
        category: "projectile",
        prompt: "a fireball",
        base: "fireball",
        settings: { color: "#ff0000", intensity: 2, sizeScale: "big" },
        duration: 1200,
        hitAt: 600,
        loop: false,
        sounds: [{ sound: "s1", start: 100, volume: 40 }, { sound: { _id: "s2" }, start: -5 }, { start: 3 }],
      });

      expect(effect).toEqual({
        base: "fireball",
        settings: { color: "#ff0000", intensity: 2 },
        duration: 1200,
        hitAt: 600,
        sounds: [{ sound: "s1", start: 100, volume: 40 }, { sound: "s2", start: 0 }],
      });
    });

    it("shows nothing without a preset nor a base preset", () => {
      expect(playableVisualEffect({ name: "Empty", preset: { emitters: [] } })).toBeUndefined();
      expect(playableVisualEffect(undefined)).toBeUndefined();
      expect(playableVisualEffect("fireball")).toBeUndefined();
    });

    it("keeps its own preset, a default length, and the hit within the effect", () => {
      const preset = { duration: 400, emitters: [{ burst: 3 }] };

      expect(playableVisualEffect({ preset, hitAt: 5000 })).toEqual({ preset, duration: 1000, hitAt: 1000 });
      expect(playableVisualEffect({ base: "aura", duration: 800, loop: true })).toEqual({ base: "aura", duration: 800, hitAt: 0, loop: true });
    });
  });

  it("lists the sounds at their start, the hit and the end, in order", () => {
    expect(visualEffectTimeline(fireball)).toEqual([
      { at: 0, type: "sound", sound: "whoosh", volume: 0.5 },
      { at: 500, type: "sound", sound: "boom", volume: 0.8 },
      { at: 500, type: "hit" },
      { at: 700, type: "sound", sound: "crackle", volume: 1 },
      { at: 900, type: "end" },
    ]);
  });

  it("spawns the preset at once, plays each sound at its start and hits at hitAt", async () => {
    const { clock, events, playback, spawned } = play(fireball);
    let hit = false;
    let done = false;
    void playback.hit.then(() => (hit = true));
    void playback.done.then(() => (done = true));
    await flush();

    expect(spawned()).toBe(false);
    expect(events).toEqual(["spawn@0", "whoosh:0.5@0"]);
    await advance(clock, 490);
    expect(hit).toBe(false);
    await advance(clock, 20);
    expect(hit).toBe(true);
    expect(events).toEqual(["spawn@0", "whoosh:0.5@0", "boom:0.8@500", "hit@500"]);
    await advance(clock, 400);
    expect(events.at(-1)).toBe("crackle:1@700");
    expect(done).toBe(true);
    expect(playback).toMatchObject({ hitAt: 500, duration: 900 });
  });

  it("follows the clock of the scene: a frozen clock (hit-stop) delays the hit", async () => {
    const { clock, playback } = play({ base: "slash", duration: 300, hitAt: 100 });
    let hit = false;
    void playback.hit.then(() => (hit = true));
    clock.freeze(200);
    await advance(clock, 200);
    expect(hit).toBe(false);
    await advance(clock, 110);
    expect(hit).toBe(true);
  });

  it("loops an aura: its sounds come back at each turn, the hit once, until it is stopped", async () => {
    const { clock, events, playback, spawned, stops } = play({ base: "aura", duration: 200, hitAt: 50, loop: true, sounds: [{ sound: "hum", start: 0 }] });
    let done = false;
    void playback.done.then(() => (done = true));
    await advance(clock, 650);

    expect(spawned()).toBe(true);
    expect(events.filter((e) => e.startsWith("hum")).length).toBe(4);
    expect(events.filter((e) => e.startsWith("hit")).length).toBe(1);
    expect(done).toBe(false);
    playback.stop();
    await flush();
    expect(done).toBe(true);
    expect(stops()).toBe(1);
    await advance(clock, 400);
    expect(events.filter((e) => e.startsWith("hum")).length).toBe(4);
  });

  it("plays a looping effect once when asked (a skill)", async () => {
    const { clock, events, playback, spawned } = play({ base: "aura", duration: 200, hitAt: 50, loop: true, sounds: [{ sound: "hum", start: 0 }] }, true);
    let done = false;
    void playback.done.then(() => (done = true));
    await advance(clock, 450);

    expect(spawned()).toBe(false);
    expect(events.filter((e) => e.startsWith("hum")).length).toBe(1);
    expect(done).toBe(true);
  });

  it("stopped before its hit: the sounds to come are not played, the hit resolves without calling onHit", async () => {
    const { clock, events, playback } = play(fireball);
    let hit = false;
    void playback.hit.then(() => (hit = true));
    await flush();
    await advance(clock, 100);
    playback.stop();
    await flush();
    expect(hit).toBe(true);
    await advance(clock, 900);
    expect(events).toEqual(["spawn@0", "whoosh:0.5@0"]);
  });
});
