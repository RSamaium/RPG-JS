import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { testing, TestingFixture } from "@rpgjs/testing";
import { Control, createModule, defineModule, Direction } from "@rpgjs/common";
import { RpgClient } from "../../client/src";
import { RpgPlayer, RpgServer } from "../src";

const serverModule = defineModule<RpgServer>({
  maps: [{ id: "hook-errors-map", file: "" }],
  player: {
    async onConnected(player) {
      await player.changeMap("hook-errors-map", { x: 100, y: 100 });
    },
  },
});

let fixture: TestingFixture;
let player: RpgPlayer;
let unhandled: unknown[];
const onUnhandled = (reason: unknown) => {
  unhandled.push(reason);
};

beforeEach(async () => {
  unhandled = [];
  process.on("unhandledRejection", onUnhandled);
  const myModule = createModule("HookErrorsTestModule", [
    { server: serverModule, client: defineModule<RpgClient>({}) },
  ]);
  fixture = await testing(myModule);
  const client = await fixture.createClient();
  player = await client.waitForMapChange("hook-errors-map");
});

afterEach(async () => {
  process.off("unhandledRejection", onUnhandled);
  vi.restoreAllMocks();
  await fixture.clear();
});

const flushRejections = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("Hook errors", () => {
  test("an async onAction that throws is logged and does not escape", async () => {
    const map = player.getCurrentMap() as any;
    const hitbox = player.hitbox();
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    let calls = 0;

    await map.createDynamicEvent({
      id: "throwing-event",
      x: player.x(),
      y: player.y() + hitbox.h + 2,
      event: {
        async onAction() {
          calls += 1;
          await Promise.resolve();
          throw new Error("Player X is not on the same map as Y");
        },
      },
    });
    await fixture.nextTick();
    player.changeDirection(Direction.Down);

    map.onAction(player, { action: Control.Action });
    await flushRejections();

    expect(calls).toBe(1);
    expect(unhandled).toEqual([]);
    expect(errorLog).toHaveBeenCalledWith(
      expect.stringContaining('hook "onAction" of event "throwing-event"'),
      expect.any(Error),
    );

    // The map keeps working: the event can be triggered again.
    map.onAction(player, { action: Control.Action });
    await flushRejections();
    expect(calls).toBe(2);
    expect(unhandled).toEqual([]);
    expect(map.getEvent("throwing-event")).toBeDefined();
  });

  test("a synchronous throw in onAction is logged and does not escape", async () => {
    const map = player.getCurrentMap() as any;
    const hitbox = player.hitbox();
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    await map.createDynamicEvent({
      id: "sync-throwing-event",
      x: player.x(),
      y: player.y() + hitbox.h + 2,
      event: {
        onAction() {
          throw new Error("boom");
        },
      },
    });
    await fixture.nextTick();
    player.changeDirection(Direction.Down);

    expect(() => map.onAction(player, { action: Control.Action })).not.toThrow();
    await flushRejections();

    expect(unhandled).toEqual([]);
    expect(errorLog).toHaveBeenCalledWith(
      expect.stringContaining('hook "onAction" of event "sync-throwing-event"'),
      expect.any(Error),
    );
  });

  test("runHook resolves to the hook result", async () => {
    const result = await player.runHook("myHook", [2], { myHook: (n: number) => n * 3 });
    expect(result).toBe(6);
  });
});
