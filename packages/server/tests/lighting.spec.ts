import { afterEach, expect, test } from "vitest";
import { createModule, defineModule } from "@rpgjs/common";
import { testing } from "@rpgjs/testing";
import { RpgClient } from "../../client/src";
import { RpgPlayer, RpgServer } from "../src";

const serverModule = defineModule<RpgServer>({
  maps: [
    {
      id: "map1",
      file: "",
      lighting: {
        ambient: {
          darkness: 0.6,
        },
        spots: [
          { id: "lamp", x: 100, y: 120, radius: 140, intensity: 1 },
        ],
        shadows: {
          enabled: true,
        },
      },
    },
    {
      id: "map2",
      file: "",
    },
  ],
  player: {
    async onConnected(player: RpgPlayer) {
      await player.changeMap("map1", { x: 100, y: 100 });
    },
  },
});

const clientModule = defineModule<RpgClient>({});

let fixture: any;

afterEach(() => {
  fixture?.clear();
});

test("map lighting syncs to clients and merges local light spots", async () => {
  const module = createModule("LightingTestModule", [{
    server: serverModule,
    client: clientModule,
  }]);

  fixture = await testing(module);
  const client = await fixture.createClient();
  let player = await client.waitForMapChange("map1");
  await fixture.wait(0);

  expect(client.client.sceneMap.getLighting()).toMatchObject({
    ambient: {
      darkness: 0.6,
    },
    spots: [
      { id: "lamp", x: 100, y: 120, radius: 140, intensity: 1 },
    ],
    shadows: {
      enabled: true,
    },
  });

  const map = player.getCurrentMap()!;
  map.patchLighting({
    ambient: {
      darkness: 0.25,
    },
    sun: {
      intensity: 0.9,
    },
  });
  await fixture.wait(0);

  expect(client.client.sceneMap.getLighting()).toMatchObject({
    ambient: {
      darkness: 0.25,
    },
    sun: {
      intensity: 0.9,
    },
  });

  client.client.sceneMap.addLightSpot("torch", {
    x: 300,
    y: 320,
    radius: 180,
    intensity: 1,
    flicker: true,
  });

  expect(client.client.sceneMap.getLighting()?.spots).toEqual([
    { id: "lamp", x: 100, y: 120, radius: 140, intensity: 1 },
    { id: "torch", x: 300, y: 320, radius: 180, intensity: 1, flicker: true },
  ]);

  client.client.sceneMap.addLightSpot("torch", {
    x: 300,
    y: 320,
    radius: 180,
    intensity: 1,
    flicker: true,
  });
  expect(Object.keys(client.client.sceneMap.localLightSpots())).toEqual(["torch"]);
  expect(client.client.sceneMap.localLightSpots().torch).toMatchObject({
    x: 300,
    y: 320,
    radius: 180,
    intensity: 1,
    flicker: true,
  });

  client.client.sceneMap.addLightSpot("torch", { x: 300, y: 320, halo: 0.4, schedule: [19, 23] });
  client.client.sceneMap.addLightSpot("torch", { x: 300, y: 320, halo: 0.4, schedule: [20, 23] });
  expect(client.client.sceneMap.localLightSpots().torch).toMatchObject({ halo: 0.4, schedule: [20, 23] });
  client.client.sceneMap.addLightSpot("torch", { x: 300, y: 320, halo: 0.6, schedule: [20, 23] });
  expect(client.client.sceneMap.localLightSpots().torch).toMatchObject({ halo: 0.6 });
  client.client.sceneMap.addLightSpot("torch", {
    x: 300,
    y: 320,
    radius: 180,
    intensity: 1,
    flicker: true,
  });

  client.client.sceneMap.patchLightSpot("torch", { x: 340 });
  expect(client.client.sceneMap.getLighting()?.spots?.[1]).toMatchObject({
    id: "torch",
    x: 340,
    y: 320,
  });

  client.client.sceneMap.removeLightSpot("torch");
  expect(client.client.sceneMap.getLighting()?.spots).toEqual([
    { id: "lamp", x: 100, y: 120, radius: 140, intensity: 1 },
  ]);

  map.clearLighting();
  await fixture.wait(0);
  expect(client.client.sceneMap.getLighting()).toBeNull();

  map.setNight();
  await fixture.wait(0);
  expect(client.client.sceneMap.getLighting()?.ambient).toMatchObject({
    darkness: 0.45,
  });
  expect(client.client.sceneMap.getLighting()?.ambient?.fogRadius).toBeUndefined();

  map.clearLighting();
  await fixture.wait(0);
  expect(client.client.sceneMap.getLighting()).toBeNull();

  client.client.sceneMap.addLightSpot("torch", {
    x: 300,
    y: 320,
  });
  expect(client.client.sceneMap.getLighting()).toEqual({
    spots: [
      { id: "torch", x: 300, y: 320 },
    ],
  });
  expect(client.client.sceneMap.getLighting()).not.toHaveProperty("ambient");

  await player.changeMap("map2", { x: 10, y: 10 });
  player = await client.waitForMapChange("map2");
  await fixture.wait(0);

  expect(player.getCurrentMap()?.id).toBe("map2");
  expect(client.client.sceneMap.getLighting()).toBeNull();
});
