import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { testing, TestingFixture } from "@rpgjs/testing";
import { Control, createModule, defineModule, Direction } from "@rpgjs/common";
import { RpgClient } from "../../client/src";
import { RpgPlayer, RpgServer } from "../src";

let actionCount = 0;

const serverModule = defineModule<RpgServer>({
  maps: [
    {
      id: "interaction-map",
      file: "",
    },
  ],
  player: {
    async onConnected(player) {
      await player.changeMap("interaction-map", { x: 100, y: 100 });
    },
  },
});

const clientModule = defineModule<RpgClient>({});

let fixture: TestingFixture;
let client: any;
let player: RpgPlayer;

beforeEach(async () => {
  actionCount = 0;
  const myModule = createModule("ActionInteractionTestModule", [
    {
      server: serverModule,
      client: clientModule,
    },
  ]);

  fixture = await testing(myModule);
  client = await fixture.createClient();
  player = await client.waitForMapChange("interaction-map");
});

afterEach(async () => {
  await fixture.clear();
});

describe("Action interactions", () => {
  test("triggers onAction for an event just in front of the player", async () => {
    const map = player.getCurrentMap() as any;
    const hitbox = player.hitbox();

    await map.createDynamicEvent({
      id: "front-event",
      x: player.x(),
      y: player.y() + hitbox.h + 2,
      event: {
        onAction() {
          actionCount += 1;
        },
      },
    });
    await fixture.nextTick();

    player.changeDirection(Direction.Down);

    expect(map.getCollisions(player.id)).not.toContain("front-event");
    expect(map.getInteractionCollisions(player.id, Direction.Down)).toContain("front-event");

    map.onAction(player, { action: Control.Action });
    await fixture.wait(0);

    expect(actionCount).toBe(1);
  });

  test("flags the action as an interaction so an attack can be skipped", async () => {
    const map = player.getCurrentMap() as any;
    const hitbox = player.hitbox();

    await map.createDynamicEvent({
      id: "talk-event",
      x: player.x(),
      y: player.y() + hitbox.h + 2,
      event: { onAction() {} },
    });
    await fixture.nextTick();
    expect(map.getEvent("talk-event").interactive()).toBe(true);

    player.changeDirection(Direction.Down);
    const action = { action: Control.Action };
    map.onAction(player, action);
    await fixture.wait(0);

    expect((action as any).interactedWithEvent).toBe(true);
    expect(Object.keys(action)).toEqual(["action"]);
  });

  test("does not flag the action when the event in front has no onAction", async () => {
    const map = player.getCurrentMap() as any;
    const hitbox = player.hitbox();

    await map.createDynamicEvent({
      id: "decor-event",
      x: player.x(),
      y: player.y() + hitbox.h + 2,
      event: {},
    });
    await fixture.nextTick();
    expect(map.getEvent("decor-event").interactive()).toBe(false);

    player.changeDirection(Direction.Down);
    const action = { action: Control.Action };
    map.onAction(player, action);
    await fixture.wait(0);

    expect((action as any).interactedWithEvent).toBeUndefined();
  });

  test("ignores a nearby event behind the player", async () => {
    const map = player.getCurrentMap() as any;
    const hitbox = player.hitbox();

    await map.createDynamicEvent({
      id: "behind-event",
      x: player.x(),
      y: player.y() - hitbox.h - 2,
      event: {
        onAction() {
          actionCount += 1;
        },
      },
    });
    await fixture.nextTick();

    player.changeDirection(Direction.Down);
    map.onAction(player, { action: Control.Action });
    await fixture.wait(0);

    expect(actionCount).toBe(0);
  });

  test("ignores default action during GUI close cooldown", async () => {
    const map = player.getCurrentMap() as any;
    const hitbox = player.hitbox();

    await map.createDynamicEvent({
      id: "front-event",
      x: player.x(),
      y: player.y() + hitbox.h + 2,
      event: {
        onAction() {
          actionCount += 1;
        },
      },
    });
    await fixture.nextTick();

    player.changeDirection(Direction.Down);
    (player as any).__guiActionBlockUntil = Date.now() + 1000;

    map.onAction(player, { action: Control.Action });
    await fixture.wait(0);

    expect(actionCount).toBe(0);
  });

  test("dispatches custom action payloads to onInput without triggering event actions", async () => {
    const map = player.getCurrentMap() as any;
    const hitbox = player.hitbox();

    await map.createDynamicEvent({
      id: "front-event",
      x: player.x(),
      y: player.y() + hitbox.h + 2,
      event: {
        onAction() {
          actionCount += 1;
        },
      },
    });
    await fixture.nextTick();

    player.changeDirection(Direction.Down);

    const payload = {
      action: "projectile:shoot",
      data: {
        target: { x: 320, y: 180 },
      },
    };
    const execMethod = vi.spyOn(player as any, "execMethod");

    map.onAction(player, payload);
    await fixture.wait(0);

    expect(actionCount).toBe(0);
    expect(execMethod).toHaveBeenCalledWith("onInput", [payload]);

    execMethod.mockRestore();
  });
});
