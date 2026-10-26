// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { blinkEffect, createEffectRunner, shakeEffect, type EffectOutput, type EffectRunnerOptions } from "./effects";

const output = (): EffectOutput => ({ offsetX: 0, offsetY: 0, alpha: 1 });

describe("built-in effects", () => {
  it("shake oscillates horizontally and fades out", () => {
    const at = (progress: number) => {
      const out = output();
      shakeEffect.update(progress, { intensity: 10, frequency: 1 }, out);
      return out;
    };
    expect(at(0)).toMatchObject({ offsetX: 0, offsetY: 0, alpha: 1 });
    expect(at(0.25).offsetX).toBeCloseTo(10 * 0.75, 5);
    expect(at(0.75).offsetX).toBeCloseTo(-10 * 0.25, 5);
    expect(Math.abs(at(1).offsetX)).toBeLessThan(1e-9);
  });

  it("blink dips the alpha and comes back", () => {
    const at = (progress: number, strength?: number) => {
      const out = output();
      blinkEffect.update(progress, strength === undefined ? {} : { strength }, out);
      return out.alpha;
    };
    expect(at(0)).toBe(1);
    expect(at(0.5)).toBeCloseTo(0.4, 5);
    expect(at(0.5, 1)).toBeCloseTo(0, 5);
    expect(at(0.5, 7)).toBeCloseTo(0, 5); // strength is clamped
    expect(at(1)).toBeCloseTo(1, 5);
  });

  it("ignores params of the wrong type", () => {
    const out = output();
    shakeEffect.update(0.25, { intensity: "big" }, out);
    expect(out.offsetX).toBeCloseTo(3 * Math.sin(0.25 * 6 * Math.PI * 2) * 0.75, 5);
  });
});

function setup(targets: string[] = ["elements/a"]) {
  const applied: Array<[string, EffectOutput | null]> = [];
  const options: EffectRunnerOptions = {
    exists: (key) => targets.includes(key),
    apply: (key, out) => applied.push([key, out && { ...out }]),
    onWarning: vi.fn(),
  };
  return { runner: createEffectRunner(options), applied, options };
}

describe("effect runner", () => {
  it("applies an effect each tick, and restores the target when it ends", async () => {
    const { runner, applied } = setup();
    const handle = runner.play("elements/a", "blink", { duration: 100, strength: 1 });
    expect(runner.running).toBe(1);

    runner.tick(50);
    expect(applied.at(-1)![1]!.alpha).toBeCloseTo(0, 5);
    runner.tick(50);
    expect(applied.at(-1)).toEqual(["elements/a", null]);
    expect(runner.running).toBe(0);
    await expect(handle.finished).resolves.toBe("completed");
  });

  it("uses the default duration of the effect unless a duration is given", async () => {
    const { runner } = setup();
    const handle = runner.play("elements/a", "shake");
    runner.tick(299);
    expect(runner.running).toBe(1);
    runner.tick(1);
    await expect(handle.finished).resolves.toBe("completed");
  });

  it("is deterministic: time only moves when tick is called", () => {
    const first = setup();
    const second = setup();
    for (const { runner } of [first, second]) {
      runner.play("elements/a", "shake", { intensity: 5 });
      runner.tick(16);
      runner.tick(16);
    }
    expect(first.applied).toEqual(second.applied);
  });

  it("combines effects on the same target: offsets add up, alphas multiply", () => {
    const { runner, applied } = setup();
    runner.register("push", { duration: 100, update: (_p, _params, out) => ((out.offsetX += 4), (out.alpha *= 0.5)) });
    runner.play("elements/a", "push");
    runner.play("elements/a", "push");
    applied.length = 0;
    runner.tick(10);
    expect(applied.at(-1)![1]).toEqual({ offsetX: 8, offsetY: 0, alpha: 0.25 });
  });

  it("keeps targets apart", () => {
    const { runner, applied } = setup(["elements/a", "elements/b"]);
    runner.play("elements/a", "shake", { duration: 50 });
    runner.play("elements/b", "shake", { duration: 500 });
    applied.length = 0;
    runner.tick(50);
    expect(applied.find(([key]) => key === "elements/a")![1]).toBeNull();
    expect(applied.find(([key]) => key === "elements/b")![1]).not.toBeNull();
  });

  it("cancel stops the effect and restores the target; cancelling twice is harmless", async () => {
    const { runner, applied } = setup();
    const handle = runner.play("elements/a", "shake");
    handle.cancel();
    handle.cancel();
    expect(applied.at(-1)).toEqual(["elements/a", null]);
    expect(runner.running).toBe(0);
    await expect(handle.finished).resolves.toBe("cancelled");
  });

  it("clear cancels everything, or one target", async () => {
    const { runner } = setup(["elements/a", "elements/b"]);
    const a = runner.play("elements/a", "shake");
    const b = runner.play("elements/b", "shake");
    runner.clear("elements/a");
    expect(runner.running).toBe(1);
    await expect(a.finished).resolves.toBe("cancelled");
    runner.clear();
    await expect(b.finished).resolves.toBe("cancelled");
  });

  it("never throws: an unknown effect or target ends at once with a status", async () => {
    const { runner, options } = setup();
    await expect(runner.play("elements/a", "nope").finished).resolves.toBe("unknown-effect");
    expect(options.onWarning).toHaveBeenCalledWith('Unknown effect "nope"');
    await expect(runner.play("elements/zzz", "shake").finished).resolves.toBe("target-missing");
    expect(runner.running).toBe(0);
  });

  it("ends the effects of a target that disappears", async () => {
    const { runner } = setup();
    const handle = runner.play("elements/a", "shake");
    runner.targetRemoved("elements/a");
    await expect(handle.finished).resolves.toBe("target-removed");
    expect(runner.running).toBe(0);
  });

  it("accepts effects registered later, and a tick with nothing running does nothing", () => {
    const { runner, applied } = setup();
    runner.tick(1000);
    expect(applied).toEqual([]);
    runner.register("custom", { duration: 10, update: () => undefined });
    runner.play("elements/a", "custom");
    expect(runner.running).toBe(1);
  });
});
