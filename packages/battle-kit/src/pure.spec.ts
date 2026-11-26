import { describe, expect, it } from "vitest";
import { Clock, aim, digitMotion, elementColor, popupLift, popupMotion } from "./pure";
import { toCss, toHex } from "./colors";

describe("battle kit (pure parts)", () => {
  it("runs tweens and waits on a scalable clock, with freeze and flush", async () => {
    const clock = new Clock();
    const seen: number[] = [];
    const tween = clock.tween(100, (t) => seen.push(t));
    let waited = false;
    void clock.wait(150).then(() => (waited = true));
    clock.speed = 2;
    clock.tick(30); // 60 ms of battle time
    clock.freeze(40);
    expect(clock.tick(40)).toBe(0); // frozen
    clock.tick(30);
    await tween;
    expect(seen.at(-1)).toBe(1);
    clock.tick(50);
    await Promise.resolve();
    expect(waited).toBe(true);
    const pending = clock.wait(1000);
    clock.flush();
    await expect(pending).resolves.toBeUndefined();
  });

  it("aims directional presets and converts colours", () => {
    expect(aim({ x: 0, y: 0 }, { x: 10, y: 0 })).toEqual({ flip: false, rotation: 0 });
    expect(aim({ x: 10, y: 0 }, { x: 0, y: 0 }).flip).toBe(true);
    expect(aim({ x: 0, y: 0 }, { x: 10, y: 10 }).rotation).toBeCloseTo(Math.PI / 4);
    expect(elementColor("fire")).toBe("#ff7a2a");
    expect(elementColor("unknown")).toBe(elementColor());
    expect(toCss(0x0a0b0c)).toBe("#0a0b0c");
    expect(toHex("#ff7a2a")).toBe(0xff7a2a);
  });

  it("animates floating numbers: pop, bounce, lift and fade", () => {
    expect(popupMotion(0).scale).toBeCloseTo(0.6);
    expect(popupMotion(120).scale).toBeCloseTo(1.3);
    expect(popupMotion(500)).toMatchObject({ alpha: 1, done: false });
    expect(popupMotion(1000).alpha).toBeLessThan(1);
    expect(popupMotion(1200).done).toBe(true);
    expect(digitMotion(0, 1).alpha).toBe(0); // the second digit waits its turn
    expect(digitMotion(400, 1)).toMatchObject({ alpha: 1 });
    expect(digitMotion(400, 1).y).toBeCloseTo(0);
    expect(popupLift(2000, 3).done).toBe(true);
  });
});
