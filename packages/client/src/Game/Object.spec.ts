import { beforeEach, describe, expect, test, vi } from "vitest";
import { signal } from "canvasengine";
import {
  appendFramePayload,
  mergeFreshFramePayload,
  multiplyGraphicDisplayScale,
  RpgClientObject,
  withGraphicDisplayScale,
} from "./Object";
import { RpgClientEvent } from "./Event";
import { RpgClientPlayer } from "./Player";

const injected = vi.hoisted(() => ({
  engine: {} as any,
}));

vi.mock("../RpgClientEngine", () => ({
  RpgClientEngine: class RpgClientEngine {},
}));

vi.mock("../core/inject", () => ({
  inject: () => injected.engine,
}));

function createObject(prototype: object = RpgClientObject.prototype) {
  const object = Object.create(prototype) as RpgClientObject;
  object.id = "object-1";
  object.x = signal(10) as any;
  object.y = signal(20) as any;
  object.animationName = signal("stand");
  object.graphics = signal(["hero"]) as any;
  object.animationCurrentIndex = signal(0);
  object.animationIsPlaying = signal(false);
  object.hitbox = signal({ w: 32, h: 32 }) as any;
  return object;
}

describe("RpgClientObject animations", () => {
  beforeEach(() => {
    injected.engine = {};
  });

  test("accepts a single frame payload without requiring iterable spread", () => {
    expect(
      appendFramePayload({ stale: true }, { x: 10, y: 20, ts: 1 }),
    ).toEqual([{ x: 10, y: 20, ts: 1 }]);
  });

  test("drops stale movement frames that arrive after a newer frame was applied", () => {
    expect(
      mergeFreshFramePayload(
        [],
        [{ x: 733, y: 551, ts: 200 }],
        300,
      ),
    ).toEqual([]);
  });

  test("keeps instance scale outside the spritesheet transform scale", () => {
    expect(withGraphicDisplayScale({ id: "hero" }, 0.5)).toEqual({
      id: "hero",
      displayScale: [0.5, 0.5],
    });
  });

  test("combines media and instance display scales", () => {
    expect(multiplyGraphicDisplayScale(0.5, 2)).toEqual([1, 1]);
    expect(withGraphicDisplayScale({ id: "hero", displayScale: 0.5 }, { x: 2, y: 3 })).toEqual({
      id: "hero",
      displayScale: [1, 1.5],
    });
  });

  test("updates the client-side hitbox signal", () => {
    const object = createObject();

    object.setHitbox(56, 50);

    expect(object.hitbox()).toEqual({ w: 56, h: 50 });
  });

  test.each([
    ["player", RpgClientPlayer.prototype],
    ["event", RpgClientEvent.prototype],
  ])("updates the client-side %s physics body", (_kind, prototype) => {
    const updateHitbox = vi.fn();
    injected.engine = {
      sceneMap: {
        updateHitbox,
      },
    };
    const object = createObject(prototype);

    object.setHitbox(56, 50);

    expect(object.hitbox()).toEqual({ w: 56, h: 50 });
    expect(updateHitbox).toHaveBeenCalledWith("object-1", 10, 20, 56, 50);
  });

  test("marks temporary animation as finished before restoring locomotion animation", async () => {
    const object = createObject();
    const animationChanges: Array<{ name: string; isPlaying: boolean }> = [];

    (object.animationName as any).observable.subscribe((name) => {
      animationChanges.push({
        name,
        isPlaying: object.animationIsPlaying(),
      });
    });

    const done = object.setAnimation("attack", 1, { timeoutMs: 10000 });
    object.animationCurrentIndex.set(1);

    await done;

    expect(object.animationName()).toBe("stand");
    expect(object.animationIsPlaying()).toBe(false);
    expect(animationChanges).toContainEqual({
      name: "stand",
      isPlaying: false,
    });
  });
});
