import { signal } from "@signe/reactive";
import { describe, expect, test } from "vitest";
import { RpgCommonMap } from "./Map";

class TestMap extends RpgCommonMap<any> {
  players = signal<Record<string, any>>({});
  events = signal<Record<string, any>>({});
}

function createMap(hitboxes: any[], size = { width: 320, height: 320 }, events: Record<string, any> = {}) {
  const map = new TestMap();
  map.data.set({ ...size, hitboxes });
  map.events.set(events);
  map.loadPhysic();
  return map;
}

const overlaps = (a: { x: number; y: number }, box: { x: number; y: number; width: number; height: number }, size = 32) =>
  a.x < box.x + box.width && a.x + size > box.x && a.y < box.y + box.height && a.y + size > box.y;

describe("map.findSpawnPosition", () => {
  test("returns the preferred position when it is free", () => {
    const map = createMap([]);
    expect(map.findSpawnPosition({ preferred: { x: 144, y: 144 } })).toEqual({ x: 144, y: 144 });
  });

  test("moves away from an occupied center deterministically", () => {
    const rock = { id: "rock", x: 128, y: 128, width: 64, height: 64 };
    const map = createMap([rock]);

    const spawn = map.findSpawnPosition({ preferred: { x: 144, y: 144 } });
    const again = map.findSpawnPosition({ preferred: { x: 144, y: 144 } });

    expect(spawn).not.toBeNull();
    expect(again).toEqual(spawn);
    expect(overlaps(spawn!, rock)).toBe(false);
    expect(Math.hypot(spawn!.x - 144, spawn!.y - 144)).toBeLessThanOrEqual(64);
  });

  test("keeps the hitbox inside the map near edges", () => {
    const map = createMap([]);
    const spawn = map.findSpawnPosition({ preferred: { x: 310, y: -10 } });
    expect(spawn).not.toBeNull();
    expect(spawn!.x + 32).toBeLessThanOrEqual(320);
    expect(spawn!.y).toBeGreaterThanOrEqual(0);
  });

  test("finds the free cell of a narrow passage and requires clearance to move", () => {
    // Walls everywhere on the middle row except a 36px gap from x = 160 to 196
    const walls = [
      { id: "left", x: 0, y: 128, width: 160, height: 32 },
      { id: "right", x: 196, y: 128, width: 124, height: 32 },
    ];
    const map = createMap(walls);

    const spawn = map.findSpawnPosition({ preferred: { x: 150, y: 128 }, step: 2, maxDistance: 32 });

    expect(spawn).not.toBeNull();
    expect(spawn!.y).toBe(128);
    expect(spawn!.x).toBeGreaterThanOrEqual(160);
    expect(spawn!.x + 32).toBeLessThanOrEqual(196);
    expect(walls.some((wall) => overlaps(spawn!, wall))).toBe(false);
  });

  test("returns null on a fully blocked map instead of placing the character in a collider", () => {
    const map = createMap([{ id: "all", x: 0, y: 0, width: 320, height: 320 }]);
    expect(map.findSpawnPosition({ preferred: { x: 144, y: 144 }, maxDistance: 1000 })).toBeNull();
  });

  test("respects hitbox z ranges, blocking events and ignored ids", () => {
    const water = { id: "water", x: 128, y: 128, width: 64, height: 64, z: 0, zHeight: 32 };
    const npc = {
      id: "npc",
      x: signal(144),
      y: signal(144),
      z: signal(0),
      hitbox: signal({ w: 32, h: 32 }),
      _removeTransition: signal(false),
    };

    const map = createMap([water]);
    expect(map.findSpawnPosition({ preferred: { x: 144, y: 144 }, z: 32 })).toEqual({ x: 144, y: 144 });
    expect(map.findSpawnPosition({ preferred: { x: 144, y: 144 }, z: 0 })).not.toEqual({ x: 144, y: 144 });

    const withNpc = createMap([], undefined, { npc });
    expect(withNpc.findSpawnPosition({ preferred: { x: 144, y: 144 } })).not.toEqual({ x: 144, y: 144 });
    expect(withNpc.findSpawnPosition({ preferred: { x: 144, y: 144 }, ignoreIds: ["npc"] })).toEqual({ x: 144, y: 144 });
  });
});
