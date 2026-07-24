import { describe, expect, it } from "vitest";
import {
  applyStudioMapStreamChunk,
  compileStudioMapStream,
  createStudioMapStreamState,
  getStudioMapStreamData,
  isStudioDirectLoadPayload,
  prepareStudioMapPayload,
  removeStudioMapStreamChunk,
  STUDIO_DIRECT_LOAD_MARKER,
  STUDIO_TERRAIN_CONTROL_REGIONS,
} from "./map-streaming";

function createMap() {
  return {
    _id: "studio-v2",
    updatedAt: "revision-1",
    creationDetails: { version: "v2" },
    params: {
      width: 4,
      height: 2,
      tileset: {
        _id: "tileset",
        fileName: "tiles.png",
        metadata: {
          elements: JSON.stringify([
            {
              id: 0,
              rect: [0, 0, 48, 48],
              hitbox: { x: 0, y: 24, width: 48, height: 24 },
            },
          ]),
        },
      },
    },
    elementsAlwaysLow: "[]",
    elementsLow: JSON.stringify([
      { id: 0, tilesetId: "tileset", x: 144, y: 48 },
    ]),
    elementsHigh: "[]",
    terrain: JSON.stringify([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]),
    terrainMorphologyLayer: { features: [] },
    events: [{ id: "secret-event", triggers: [{ blocks: ["secret"] }] }],
    mapLoadBlocks: [{ type: "secret" }],
  };
}

describe("Studio authoritative map streaming", () => {
  it("recognizes component-ready standalone payloads", () => {
    expect(isStudioDirectLoadPayload({ [STUDIO_DIRECT_LOAD_MARKER]: true })).toBe(true);
    expect(isStudioDirectLoadPayload({ data: {} })).toBe(false);
  });

  it("rejects legacy Studio maps", () => {
    expect(() =>
      prepareStudioMapPayload({ creationDetails: { version: "v1" } })
    ).toThrow(/must use format v2/);
  });

  it("keeps gameplay data private and discloses render/physics by chunk", () => {
    const prepared = prepareStudioMapPayload(createMap(), {
      config: { privateRule: "server-only" },
      database: [{ id: "server-item" }],
    });
    prepared.data.privateMapRule = "secret-map-rule";
    prepared.data.params.privateParam = "secret-param";
    prepared.data.params.elementTilesets = JSON.stringify([
      {
        _id: "tileset",
        fileName: "tiles.png",
        metadata: { elements: ["secret-element-catalog"] },
      },
    ]);
    prepared.data.terrainRenderData.version = "secret-source-version";
    prepared.data.terrainRenderData.terrainControl = {
      source: "secret-global-control-texture",
    };
    const definition = compileStudioMapStream(prepared, { chunkSize: 2 });
    const publicManifest = JSON.stringify(definition.manifest);

    expect(definition.manifest.renderData.map.events).toBeUndefined();
    expect(definition.manifest.renderData.map.mapLoadBlocks).toBeUndefined();
    expect(publicManifest).not.toContain("server-only");
    expect(publicManifest).not.toContain("server-item");
    expect(publicManifest).not.toContain("secret-");
    expect(definition.manifest.renderData.map.params.elementTilesets).toEqual([
      { _id: "tileset", fileName: "tiles.png" },
    ]);
    expect(
      definition.chunks["0:0"].renderData.elements.elementsLow
    ).toHaveLength(0);
    expect(
      definition.chunks["1:0"].renderData.elements.elementsLow
    ).toHaveLength(1);
    expect(definition.chunks["1:0"].hitboxes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "studio-element:0" }),
      ])
    );
  });

  it("keeps prepared element descriptors when preparation is repeated", () => {
    const prepared = prepareStudioMapPayload(createMap());
    const preparedAgain = prepareStudioMapPayload(prepared);

    expect(preparedAgain.data.elementsLow).toEqual(prepared.data.elementsLow);
    expect(preparedAgain.hitboxes).toEqual(prepared.hitboxes);
  });

  it("discloses control-texture masks by chunk without publishing the source", () => {
    const prepared = prepareStudioMapPayload(createMap());
    prepared.data.terrainRenderData.terrainControl = {
      source: "https://private.example/full-control.png",
      width: prepared.width,
      height: prepared.height,
      tileSize: 48,
      palette: ["terrain-0"],
    };
    prepared.data[STUDIO_TERRAIN_CONTROL_REGIONS] = {
      "0:0": {
        key: "0:0",
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        encoding: "rgba8-base64",
        data: "AAAA/w==",
      },
    };

    const definition = compileStudioMapStream(prepared, { chunkSize: 2 });
    const manifestJson = JSON.stringify(definition.manifest);
    expect(manifestJson).not.toContain("full-control.png");
    expect(definition.manifest.renderData.map.terrainRenderData.terrainControl)
      .toMatchObject({ source: "", regions: [] });
    expect(definition.chunks["0:0"].renderData.terrainControlRegion)
      .toMatchObject({ key: "0:0", data: "AAAA/w==" });

    const state = createStudioMapStreamState(definition.manifest);
    const initialVersion = state.map.terrainRenderData.version;
    applyStudioMapStreamChunk(state, definition.chunks["0:0"]);
    const map = getStudioMapStreamData(state);
    expect(map.terrainRenderData.terrainControl.regions)
      .toEqual([definition.chunks["0:0"].renderData.terrainControlRegion]);
    expect(map.terrainRenderData.version).not.toBe(initialVersion);
  });

  it("consolidates chunk deltas into one render generation", () => {
    const definition = compileStudioMapStream(
      prepareStudioMapPayload(createMap()),
      { chunkSize: 2 }
    );
    const state = createStudioMapStreamState(definition.manifest);
    applyStudioMapStreamChunk(state, definition.chunks["0:0"]);
    applyStudioMapStreamChunk(state, definition.chunks["1:0"]);
    expect(state.generation).toBe(0);
    expect(state.map.elementsLow).toHaveLength(0);

    const enteredMap = getStudioMapStreamData(state);
    expect(state.generation).toBe(1);
    expect(enteredMap.elementsLow).toHaveLength(1);
    expect(enteredMap.terrainRenderData.streamUpdate).toMatchObject({
      revision: definition.manifest.revision,
      generation: 1,
    });
    expect(enteredMap.terrainRenderData.streamUpdate.dirtyRegions).toHaveLength(2);
    expect(enteredMap.terrainRenderData.streamUpdate.activeRegions).toHaveLength(2);
    expect(getStudioMapStreamData(state)).toBe(enteredMap);
    expect(state.generation).toBe(1);

    removeStudioMapStreamChunk(state, "1:0");
    expect(state.map).toBe(enteredMap);
    const removedMap = getStudioMapStreamData(state);
    expect(state.generation).toBe(2);
    expect(removedMap.elementsLow).toHaveLength(0);
    expect(removedMap.terrainRenderData.streamUpdate).toMatchObject({
      generation: 2,
      activeRegions: [expect.any(Object)],
      dirtyRegions: [expect.any(Object)],
    });
  });

  it("invalidates an updated chunk even when its key is unchanged", () => {
    const definition = compileStudioMapStream(
      prepareStudioMapPayload(createMap()),
      { chunkSize: 2 }
    );
    const state = createStudioMapStreamState(definition.manifest);
    applyStudioMapStreamChunk(state, definition.chunks["0:0"]);
    getStudioMapStreamData(state);

    applyStudioMapStreamChunk(state, {
      ...definition.chunks["0:0"],
      renderData: {
        ...definition.chunks["0:0"].renderData,
        terrainCells: [],
      },
    });
    const map = getStudioMapStreamData(state);

    expect(map.terrainRenderData.streamUpdate.generation).toBe(2);
    expect(map.terrainRenderData.streamUpdate.dirtyRegions).toHaveLength(2);
    expect(map.terrainRenderData.streamUpdate.dirtyRegions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 96 }),
        expect.objectContaining({ width: 192 }),
      ])
    );
  });
});
