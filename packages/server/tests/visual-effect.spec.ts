import { afterEach, expect, test, vi } from "vitest";
import { createModule, defineModule } from "@rpgjs/common";
import { testing, type TestingFixture } from "@rpgjs/testing";
import type { RpgClient } from "../../client/src";
import type { RpgPlayer, RpgServer } from "../src";

const serverModule = defineModule<RpgServer>({
  maps: [{ id: "map1", file: "" }],
  player: {
    async onConnected(player: RpgPlayer) {
      await player.changeMap("map1", { x: 100, y: 100 });
    },
  },
});

let fixture: TestingFixture | undefined;

afterEach(async () => {
  await fixture?.clear();
  fixture = undefined;
});

const start = async () => {
  fixture = await testing(createModule("VisualEffectTest", [{ server: serverModule, client: defineModule<RpgClient>({}) }]));
  const player = await (await fixture.createClient()).waitForMapChange("map1");
  return player.getCurrentMap()!;
};

test("a visual effect aims at its target, tuned, after its delay, with its sounds", async () => {
  const map = await start();
  const show = vi.spyOn(map, "showComponentAnimation");
  const preset = { emitters: [{ pathSpace: "target", path: [{ x: 0 }, { x: 1 }] }] };

  map.playVisualEffect({ x: 100, y: 100 }, "bolt", {
    preset,
    target: { x: 160, y: 20 },
    color: "#6dff4a",
    intensity: 1.5,
    sizeScale: 2,
    speedScale: Number.NaN,
    delay: 250,
    sounds: [{ sound: "zap", start: 100, volume: 4 }, { sound: "" }, { sound: "hit" }],
  });

  // The client reads the target from where the effect plays.
  expect(show).toHaveBeenCalledWith("rpg:visual-effect", { x: 100, y: 100 }, {
    name: "bolt",
    preset,
    target: { x: 60, y: -80 },
    color: "#6dff4a",
    intensity: 1.5,
    sizeScale: 2,
    delay: 250,
    sounds: [
      { sound: "zap", start: 100, volume: 1 },
      { sound: "hit", start: 0, volume: 1 },
    ],
  });
});

test("a visual effect without options sends its name only", async () => {
  const map = await start();
  const show = vi.spyOn(map, "showComponentAnimation");

  map.playVisualEffect({ x: 10, y: 20 }, "hitSpark");

  expect(show).toHaveBeenCalledWith("rpg:visual-effect", { x: 10, y: 20 }, { name: "hitSpark" });
});
