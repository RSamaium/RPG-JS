import { signal } from "@signe/reactive";
import { describe, expect, test } from "vitest";
import { EntityState, testCollision } from "@rpgjs/physic";
import { RpgCommonMap } from "./Map";

class TestMap extends RpgCommonMap<any> {
  players = signal<Record<string, any>>({});
  events = signal<Record<string, any>>({});
}

describe("RpgCommonMap static hitboxes", () => {
  test("loads point hitboxes as polygons even when bounds are present", () => {
    const map = new TestMap();
    map.data.set({
      width: 200,
      height: 200,
      hitboxes: [
        {
          id: "triangle",
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          points: [
            [0, 0],
            [100, 0],
            [0, 100],
          ],
        },
      ],
    });

    map.loadPhysic();

    const triangle = map.physic.getEntityByUUID("triangle");
    const probe = map.physic.createEntity({
      uuid: "probe",
      position: { x: 90, y: 90 },
      width: 8,
      height: 8,
      mass: 1,
      state: EntityState.Dynamic,
    });

    expect(triangle).toBeDefined();
    expect(testCollision(triangle!, probe)).toBeNull();
  });

  test("updates existing event physics bodies from synced hitbox signals", () => {
    const map = new TestMap();
    const event = {
      id: "wide-event",
      x: signal(100),
      y: signal(120),
      z: signal(0),
      hitbox: signal({ w: 32, h: 32 }),
      _removeTransition: signal(false),
    };

    map.data.set({
      width: 200,
      height: 200,
      hitboxes: [],
    });
    map.events.set({
      "wide-event": event,
    });
    map.loadPhysic();

    expect(map.getBody("wide-event")?.width).toBe(32);
    expect(map.getBody("wide-event")?.height).toBe(32);

    event.hitbox.set({ w: 56, h: 50 });

    expect(map.getBody("wide-event")?.width).toBe(56);
    expect(map.getBody("wide-event")?.height).toBe(50);
  });

  test("loads event physics bodies from Studio width and height hitbox data", () => {
    const map = new TestMap();
    const event = {
      id: "studio-event",
      x: signal(100),
      y: signal(120),
      z: signal(0),
      hitbox: signal({ width: 56, height: 50 }),
      _removeTransition: signal(false),
    };

    map.data.set({
      width: 200,
      height: 200,
      hitboxes: [],
    });
    map.events.set({
      "studio-event": event,
    });
    map.loadPhysic();

    expect(map.getBody("studio-event")?.width).toBe(56);
    expect(map.getBody("studio-event")?.height).toBe(50);
  });

  test.each([
    { name: "blocks characters inside the hitbox z range", hitboxZ: { z: 0, zHeight: 32 }, characterZ: 0, blocked: true },
    { name: "lets characters above the hitbox z range pass", hitboxZ: { z: 0, zHeight: 32 }, characterZ: 32, blocked: false },
    { name: "lets characters below the hitbox z range pass", hitboxZ: { z: 64, zHeight: 32 }, characterZ: 0, blocked: false },
    { name: "blocks characters at every z without a hitbox z range", hitboxZ: {}, characterZ: 96, blocked: true },
  ])("$name", ({ hitboxZ, characterZ, blocked }) => {
    const map = new TestMap();
    const character = {
      id: "character",
      x: signal(100),
      y: signal(100),
      z: signal(characterZ),
      hitbox: signal({ w: 32, h: 32 }),
      _removeTransition: signal(false),
    };

    map.data.set({
      width: 200,
      height: 200,
      hitboxes: [{ id: "water", x: 96, y: 96, width: 32, height: 32, ...hitboxZ }],
    });
    map.events.set({ character });
    map.loadPhysic();

    map.physic.stepFrame();

    const moved = character.x() !== 100 || character.y() !== 100;
    expect(moved).toBe(blocked);
  });

  test("lets event touch sensors overlap other events without physical separation", () => {
    const map = new TestMap();
    const plate = {
      id: "plate",
      x: signal(100),
      y: signal(120),
      z: signal(0),
      hitbox: signal({ w: 32, h: 32 }),
      _throughEvent: signal(true),
      _removeTransition: signal(false),
    };
    const rock = {
      id: "rock",
      x: signal(100),
      y: signal(120),
      z: signal(0),
      hitbox: signal({ w: 32, h: 32 }),
      _removeTransition: signal(false),
    };

    map.data.set({
      width: 200,
      height: 200,
      hitboxes: [],
    });
    map.events.set({ plate, rock });
    map.loadPhysic();

    expect(testCollision(map.getBody("plate")!, map.getBody("rock")!)).not.toBeNull();

    map.physic.stepFrame();

    expect(plate.x()).toBe(100);
    expect(plate.y()).toBe(120);
    expect(rock.x()).toBe(100);
    expect(rock.y()).toBe(120);
  });

  test("clamps route movement position frames at the current route target", () => {
    const map = new TestMap();
    const event: any = {
      id: "route-event",
      x: signal(100),
      y: signal(100),
      z: signal(0),
      hitbox: signal({ w: 32, h: 32 }),
      _removeTransition: signal(false),
      __routeMovementClamp: {
        targetTopLeft: { x: 70, y: 100 },
        direction: { x: -1, y: 0 },
      },
    };

    map.data.set({
      width: 200,
      height: 200,
      hitboxes: [],
    });
    map.events.set({ "route-event": event });
    map.loadPhysic();

    map.setBodyPosition("route-event", 68, 100, "top-left");

    expect(event.x()).toBe(70);
    expect(event.y()).toBe(100);

    delete event.__routeMovementClamp;
    map.setBodyPosition("route-event", 68, 100, "top-left");

    expect(event.x()).toBe(68);
    expect(event.y()).toBe(100);
  });
});
