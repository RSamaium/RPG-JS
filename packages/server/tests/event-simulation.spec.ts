import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { testing, TestingFixture } from "@rpgjs/testing";
import { createModule, defineModule, getMapChunkKey, type MapStreamDefinition } from "@rpgjs/common";
import { RpgPlayer, RpgServer } from "../src";
import { Move } from "../src/Player/MoveManager";
import { RpgClient } from "../../client/src";
import { clearMapStreaming, installMapStreaming, type ServerMapStreamingOptions } from "../src/map-streaming";

const CHUNK = 100;
const COLUMNS = 10;
const ROWS = 7;

/** A grid of 100 px chunks over the test map, without render data. */
function createDefinition(): MapStreamDefinition {
  const chunks: MapStreamDefinition["chunks"] = {};
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLUMNS; x++) {
      const key = getMapChunkKey(x, y);
      chunks[key] = {
        key,
        x,
        y,
        bounds: { x: x * CHUNK, y: y * CHUNK, width: CHUNK, height: CHUNK },
        renderData: null,
        hitboxes: [],
      };
    }
  }
  return {
    manifest: {
      protocol: 1,
      mapId: "map1",
      revision: "one",
      width: COLUMNS * CHUNK,
      height: ROWS * CHUNK,
      chunkWidth: CHUNK,
      chunkHeight: CHUNK,
      columns: COLUMNS,
      rows: ROWS,
      renderData: null,
    },
    chunks,
  };
}

const serverModule = defineModule<RpgServer>({
  maps: [{ id: "map1" }],
  player: {
    async onConnected(player) {
      await player.changeMap("map1", { x: 150, y: 150 });
    },
  },
});

let player: RpgPlayer;
let map: any;
let fixture: TestingFixture;

/** An event that walks back and forth for ever. */
async function createWalker(id: string, x: number, y: number, alwaysSimulated = false) {
  await map.createDynamicEvent({
    id,
    x,
    y,
    event: {
      name: id,
      onInit() {
        this.alwaysSimulated = alwaysSimulated;
        this.setGraphic("hero");
        this.infiniteMoveRoute([Move.tileRight(), Move.tileLeft()]);
      },
    },
  });
  return map.getEvent(id);
}

function stream(options: ServerMapStreamingOptions = {}) {
  // The player retains its own chunk and the 8 around it
  installMapStreaming(map, createDefinition(), { loadRadius: 1, retainRadius: 1, ...options });
}

async function steps(count: number) {
  for (let i = 0; i < count; i++) {
    await map.nextTickAsync(1000 / 60);
  }
}

/** Whether the event changes position during one second of simulation. */
async function moves(event: any): Promise<boolean> {
  const positions = new Set<string>();
  for (let i = 0; i < 60; i++) {
    await steps(1);
    positions.add(`${event.x()}:${event.y()}`);
  }
  return positions.size > 1;
}

beforeEach(async () => {
  fixture = await testing(createModule("SimulationModule", [{ server: serverModule, client: defineModule<RpgClient>({}) }]));
  const client = await fixture.createClient();
  player = await client.waitForMapChange("map1");
  map = player.getCurrentMap();
});

afterEach(() => {
  fixture.clear();
});

describe("simulating events according to the interest of players", () => {
  test("an event in a chunk that no player retains is paused, a near one is simulated", async () => {
    const near = await createWalker("near", 200, 200);
    const far = await createWalker("far", 600, 500);
    stream();
    await steps(1);

    expect(map.moveManager.isPaused("far")).toBe(true);
    expect(map.moveManager.isPaused("near")).toBe(false);
    expect(await moves(far)).toBe(false);
    expect(await moves(near)).toBe(true);
    // A paused event stays on the map, with its hitbox
    expect(map.getEvent("far")).toBe(far);
    expect(map.getBody("far")).toBeDefined();
  });

  test("a paused event moves again when a player comes near, and stops when the player leaves", async () => {
    const far = await createWalker("far", 600, 500);
    stream();
    await steps(1);
    expect(await moves(far)).toBe(false);

    await player.teleport({ x: 560, y: 460 });
    await steps(1);
    expect(map.moveManager.isPaused("far")).toBe(false);
    expect(await moves(far)).toBe(true);

    await player.teleport({ x: 150, y: 150 });
    await steps(1);
    expect(map.moveManager.isPaused("far")).toBe(true);
    expect(await moves(far)).toBe(false);
  });

  test("an event created far from the players is paused within a second", async () => {
    stream();
    await steps(1);
    const far = await createWalker("far", 600, 500);
    await steps(60);

    expect(map.moveManager.isPaused("far")).toBe(true);
    expect(await moves(far)).toBe(false);
  });

  test("an event with alwaysSimulated keeps moving far from the players", async () => {
    const patrol = await createWalker("patrol", 600, 500, true);
    stream();
    await steps(1);

    expect(map.moveManager.isPaused("patrol")).toBe(false);
    expect(await moves(patrol)).toBe(true);
  });

  test("eventSimulation: 'always' simulates every event", async () => {
    const far = await createWalker("far", 600, 500);
    stream({ eventSimulation: "always" });
    await steps(1);

    expect(map.moveManager.isPaused("far")).toBe(false);
    expect(await moves(far)).toBe(true);
  });

  test("removing the streaming of the map resumes the paused events", async () => {
    const far = await createWalker("far", 600, 500);
    stream();
    await steps(1);
    expect(map.moveManager.isPaused("far")).toBe(true);

    clearMapStreaming(map);

    expect(map.moveManager.isPaused("far")).toBe(false);
    expect(await moves(far)).toBe(true);
  });

  test("a paused event that is removed is forgotten", async () => {
    await createWalker("far", 600, 500);
    stream();
    await steps(1);
    expect(map.moveManager.isPaused("far")).toBe(true);

    map.removeEvent("far");
    await steps(60);

    expect(map.moveManager.isPaused("far")).toBe(false);
  });
});
