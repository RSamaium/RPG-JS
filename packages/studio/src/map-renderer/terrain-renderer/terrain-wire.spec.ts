import { describe, expect, it } from "vitest";
import type { StudioTerrainRenderData } from "../types";
import { createTerrainWireReceiver, createTerrainWireSender, decodeTerrainData, encodeTerrainData } from "./terrain-wire";

const feature = (id: string) => ({ id, kind: "hole", params: {}, strokes: [{ points: [{ x: 1, y: 2 }] }] }) as never;
const region = (key: string) => ({ key, x: 0, y: 0, width: 1, height: 1, encoding: "rgba8-base64", data: "AAAA" }) as never;
const data = (features: unknown[], regions: unknown[] | undefined): StudioTerrainRenderData =>
  ({
    widthTiles: 2,
    heightTiles: 2,
    tileSize: 48,
    width: 96,
    height: 96,
    asset: null,
    sourceTexture: "terrain.png",
    terrainControl: regions ? { source: "control.png", width: 96, height: 96, tileSize: 48, palette: [], regions } : null,
    terrainGrid: [],
    morphologyFeatures: features,
    waterAnimation: { enabled: false, speed: 1, intensity: 0, direction: 0 },
    version: "v1",
  }) as never;

describe("the data of a terrain on its way to the worker", () => {
  it("sends each feature and region once, then only says which they are", () => {
    const sender = createTerrainWireSender();
    const pond = feature("pond");
    const tile = region("0:0");

    const first = encodeTerrainData(sender, data([pond], [tile]));
    expect(first.features[0]!.feature).toBe(pond);
    expect(first.control!.regions![0]!.region).toBe(tile);

    const second = encodeTerrainData(sender, data([pond], [tile]));
    expect(second.features).toEqual([{ id: first.features[0]!.id }]);
    expect(second.control!.regions).toEqual([{ id: first.control!.regions![0]!.id }]);
  });

  it("sends again a feature that changed, which is another object, and only that one", () => {
    const sender = createTerrainWireSender();
    const pond = feature("pond");
    const wall = feature("wall");
    encodeTerrainData(sender, data([pond, wall], undefined));

    const moved = feature("pond");
    const next = encodeTerrainData(sender, data([moved, wall], undefined));
    expect(next.features[0]!.feature).toBe(moved);
    expect(next.features[1]!.feature).toBeUndefined();
  });

  it("forgets what the data does not hold any more, and sends it again if it comes back", () => {
    const sender = createTerrainWireSender();
    const pond = feature("pond");
    encodeTerrainData(sender, data([pond], undefined));
    encodeTerrainData(sender, data([], undefined));
    expect(encodeTerrainData(sender, data([pond], undefined)).features[0]!.feature).toBe(pond);
  });

  it("gives back the data, with the very object the worker had for what did not change", () => {
    const sender = createTerrainWireSender();
    const receiver = createTerrainWireReceiver();
    const pond = feature("pond");
    const tile = region("0:0");

    const first = decodeTerrainData(receiver, encodeTerrainData(sender, data([pond], [tile])));
    const second = decodeTerrainData(receiver, encodeTerrainData(sender, data([pond], [tile])));

    expect(second.morphologyFeatures[0]).toBe(first.morphologyFeatures[0]);
    expect(second.terrainControl!.regions![0]).toBe(first.terrainControl!.regions![0]);
    expect(second).toMatchObject({ width: 96, sourceTexture: "terrain.png", version: "v1" });
    expect(second.terrainControl).toMatchObject({ source: "control.png" });
  });

  it("keeps a terrain without a control texture or regions as it is", () => {
    const sender = createTerrainWireSender();
    const receiver = createTerrainWireReceiver();
    expect(decodeTerrainData(receiver, encodeTerrainData(sender, data([], undefined))).terrainControl).toBeNull();
  });
});
