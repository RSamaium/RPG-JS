import { signal } from "../../common/node_modules/@signe/reactive";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RpgCommonMap } from "@rpgjs/common";

/**
 * RSamaium/RPG-JS#395: the map editor changes the placed elements with `context.updateData({ elementsLow })`, which only
 * draws them again. The collisions follow when it also calls `context.rebuildElementCollisions({ low })`: a new element
 * blocks, a moved or removed one stops blocking its old place, the base map hitboxes are untouched. This goes through the
 * REAL `loadMap` and the REAL map extension context.
 */
const state = vi.hoisted(() => ({ client: null as any, socket: { emit: (..._a: any[]) => undefined } as any, map: null as any }));

vi.mock("@rpgjs/client", () => ({
  inject: (token: unknown) => (token === "socket" ? state.socket : state.client),
  RpgClientEngine: "client-engine",
  WebSocketToken: "socket",
}));
vi.mock("./components/draw-map-v2.ce", () => ({ default: {} }));
vi.mock("./map-renderer/terrain-renderer/terrain-worker-client", () => ({ TerrainWorkerClient: { prefetchImages: () => undefined } }));
vi.mock("./data-provider", () => ({
  getGameDataProvider: () => ({ getMap: async () => state.map, getMedia: async () => null }),
  getStudioGameRuntimeConfig: () => ({ runtimeMode: "local" }),
  normalizeBundleBasePath: (value?: string) => value || "/game-data",
  shouldReadEventsFromBundle: () => false,
}));

import { loadMap } from "./map-loader";
import { registerStudioMapExtension, type StudioMapExtensionContext } from "./map-extensions";

class TestMap extends RpgCommonMap<any> {
  players = signal<Record<string, any>>({});
  events = signal<Record<string, any>>({});
}

const tileset = {
  _id: "tileset",
  metadata: { elements: JSON.stringify([{ id: 0, rect: [0, 0, 48, 48], hitbox: { x: 0, y: 24, width: 48, height: 24 } }]) },
};
const tree = (x: number, y: number) => ({ id: 0, tilesetId: "tileset", x, y });
// hitbox of tree(x, y) = [x, y + 24, 48, 24]
const isElementId = (id: string) => id.includes("studio-element:") || id.startsWith("element_");
// true when a point is inside a static element hitbox (rectangles: position is the top-left corner or the centre, both tried via bounds)
const blocks = (map: TestMap, x: number, y: number) =>
  map.physic.getEntities().some((e: any) => {
    if (!e.isStatic() || !isElementId(String(e.uuid))) return false;
    const { x: px, y: py } = e.position;
    const w = e.width, h = e.height;
    return x >= px - w / 2 && x < px + w / 2 && y >= py - h / 2 && y < py + h / 2;
  });

describe("element hitboxes follow the elements the map editor changes", () => {
  const removers: Array<() => void> = [];
  afterEach(() => removers.splice(0).forEach((r) => r()));

  async function boot() {
    state.map = {
      creationDetails: { version: "v2" },
      params: { width: 20, height: 20, tileset, elementTilesets: [tileset], primaryElementTileset: "tileset" },
      elementsLow: JSON.stringify([tree(96, 48)]),
      elementsAlwaysLow: "[]",
      elementsHigh: "[]",
      terrain: "[]",
      events: [],
    };
    const sceneData = signal<any>({ data: { elementsLow: [] } });
    const client: any = { globalConfig: {}, sceneMap: { data: sceneData } };
    state.client = client;
    let ctx!: StudioMapExtensionContext;
    removers.push(registerStudioMapExtension((c) => void (ctx = c)));
    const loaded: any = await loadMap("map-1");
    // client scene = a real common map built from what the load returned (its hitboxes: `element_<n>_<m>` ids) + a base-map wall
    const scene = new TestMap();
    scene.data.set({ width: 960, height: 960, hitboxes: [{ id: "wall", x: 500, y: 0, width: 10, height: 10 }, ...loaded.hitboxes] });
    scene.loadPhysic();
    client.scene = scene;
    return { ctx, scene, loaded };
  }

  it("a placed element made at load blocks (sanity)", async () => {
    const { scene } = await boot();
    expect(blocks(scene, 100, 80)).toBe(true);
  });

  it("rebuildElementCollisions makes the hitboxes follow elements that were added, moved and removed", async () => {
    const { ctx, scene } = await boot();
    // editor: move the tree (96,48) -> (300,200) and add another one at (400,400)
    ctx.updateData({ elementsLow: [tree(300, 200), tree(400, 400)] });
    ctx.rebuildElementCollisions({ low: [tree(300, 200), tree(400, 400)] });
    expect(blocks(scene, 310, 230)).toBe(true); // moved element collides at its new place
    expect(blocks(scene, 410, 430)).toBe(true); // added element collides
    expect(blocks(scene, 100, 80)).toBe(false); // old place no longer blocks
    expect(scene.physic.getEntityByUUID("wall")).toBeDefined(); // base map untouched
  });

  it("updateData alone only draws again: the collisions stay as loaded", async () => {
    const { ctx, scene } = await boot();
    ctx.updateData({ elementsLow: [tree(300, 200)] });
    expect(blocks(scene, 310, 230)).toBe(false);
    expect(blocks(scene, 100, 80)).toBe(true);
  });

  it("rebuildElementCollisions with no element frees every place", async () => {
    const { ctx, scene } = await boot();
    ctx.updateData({ elementsLow: [] });
    ctx.rebuildElementCollisions({ low: [] });
    expect(blocks(scene, 100, 80)).toBe(false);
  });
});
