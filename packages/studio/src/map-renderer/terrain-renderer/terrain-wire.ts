import type { StudioTerrainControlRegion, StudioTerrainMorphologyFeature, StudioTerrainRenderData } from "../types";
import type { TerrainWireData } from "./terrain-worker-protocol";

/** What the page remembers of what the worker holds: the ids it gave to the objects it sent. */
export interface TerrainWireSender {
  ids: WeakMap<object, number>;
  /** The ids the worker has, by the kind of object. */
  sent: Set<number>;
  next: number;
}

export const createTerrainWireSender = (): TerrainWireSender => ({ ids: new WeakMap(), sent: new Set(), next: 1 });

/** What the worker holds: the objects it received, by id. */
export interface TerrainWireReceiver {
  objects: Map<number, unknown>;
}

export const createTerrainWireReceiver = (): TerrainWireReceiver => ({ objects: new Map() });

/**
 * The data of a map as it is sent: the features of the relief and the regions of the control texture go by id, with the
 * object only the first time. An object that is not in the data any more is forgotten, and sent again if it comes back.
 */
export function encodeTerrainData(sender: TerrainWireSender, data: StudioTerrainRenderData): TerrainWireData {
  const present = new Set<number>();
  const idOf = (object: object): number => {
    let id = sender.ids.get(object);
    if (id === undefined) {
      id = sender.next++;
      sender.ids.set(object, id);
    }
    present.add(id);
    return id;
  };
  const wire = <T extends object>(object: T): { id: number; value?: T } => {
    const id = idOf(object);
    if (sender.sent.has(id)) return { id };
    return { id, value: object };
  };

  const { morphologyFeatures, terrainControl, ...base } = data;
  const features = morphologyFeatures.map((feature) => {
    const { id, value } = wire(feature);
    return value ? { id, feature: value } : { id };
  });
  let control: TerrainWireData["control"] = null;
  if (terrainControl) {
    const { regions, ...rest } = terrainControl;
    control = {
      ...rest,
      ...(regions
        ? {
            regions: regions.map((region) => {
              const { id, value } = wire(region);
              return value ? { id, region: value } : { id };
            }),
          }
        : {}),
    };
  }
  // What the worker keeps is what this data holds: the rest is let go, on both sides.
  for (const id of [...sender.sent]) if (!present.has(id)) sender.sent.delete(id);
  for (const id of present) sender.sent.add(id);
  return { base, control, features };
}

/** The data as it was before it was sent, with the objects the worker already had. */
export function decodeTerrainData(receiver: TerrainWireReceiver, wire: TerrainWireData): StudioTerrainRenderData {
  const present = new Set<number>();
  const resolve = <T>(entry: { id: number; value?: T }): T => {
    present.add(entry.id);
    if (entry.value !== undefined) receiver.objects.set(entry.id, entry.value);
    return receiver.objects.get(entry.id) as T;
  };
  const morphologyFeatures = wire.features.map((entry) => resolve<StudioTerrainMorphologyFeature>({ id: entry.id, value: entry.feature }));
  let terrainControl: StudioTerrainRenderData["terrainControl"] = null;
  if (wire.control) {
    const { regions, ...rest } = wire.control;
    terrainControl = {
      ...rest,
      ...(regions ? { regions: regions.map((entry) => resolve<StudioTerrainControlRegion>({ id: entry.id, value: entry.region })) } : {}),
    };
  }
  for (const id of [...receiver.objects.keys()]) if (!present.has(id)) receiver.objects.delete(id);
  return { ...wire.base, morphologyFeatures, terrainControl };
}
