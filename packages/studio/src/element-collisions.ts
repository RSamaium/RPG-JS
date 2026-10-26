import type { MapChunkHitbox } from "@rpgjs/common";
import { resolveStudioMapScale, scaleStudioHitboxes } from "./map-scale";
import { prepareElements } from "./map-streaming";

/** The socket event a client sends to the server to tell it where the placed elements are now. */
export const STUDIO_ELEMENT_COLLISIONS_CHANNEL = "studio.element-collisions";

/** What the client sends on {@link STUDIO_ELEMENT_COLLISIONS_CHANNEL}: the `elementsLow` of the map as stored. */
export interface StudioElementCollisionsMessage {
  readonly elementsLow: readonly unknown[];
}

/** Tells if a static hitbox comes from the placed elements of a map: loaded with it (`element_…`) or streamed (`studio-element:…`). */
export const isStudioElementHitboxId = (id: string): boolean => id.includes("studio-element:") || id.startsWith("element_");

/**
 * The hitboxes the placed elements of the `elementsLow` layer make, by the rules of the map load: the hitbox of the tileset
 * element, its size and scale, its polygons. `mapData` is the data of the map (what holds `params` and its tilesets), or the
 * map payload that holds it in `data`.
 */
export function buildStudioElementCollisions(mapData: any, elementsLow: readonly unknown[]): MapChunkHitbox[] {
  const data = mapData?.data?.params ? mapData.data : mapData;
  const { hitboxes } = prepareElements({ params: data?.params ?? {}, elementsLow });
  // A streamed map keeps its hitboxes as they are; a map loaded as a whole puts them in the scaled pixels of the world.
  return data?.__studioPrepared ? hitboxes : scaleStudioHitboxes(hitboxes, resolveStudioMapScale(data?.params));
}

/** What the client needs to rebuild the collisions: its scene, the way to the server, and the data of its map. */
export interface StudioElementCollisionsClient {
  readonly scene: { replaceStaticHitboxes?(match: (id: string) => boolean, hitboxes: MapChunkHitbox[]): void } | undefined;
  readonly socket: { emit(event: string, payload: unknown): void } | undefined;
  readonly mapData: unknown;
}

/**
 * Makes the collisions of a map follow its placed elements: the hitboxes the elements of the map made are replaced on
 * the client scene (what the hero predicts against) and the server is told, which does the same on its map.
 */
export function rebuildStudioElementCollisions(client: StudioElementCollisionsClient, elementsLow: readonly unknown[]): void {
  client.scene?.replaceStaticHitboxes?.(isStudioElementHitboxId, buildStudioElementCollisions(client.mapData, elementsLow));
  client.socket?.emit(STUDIO_ELEMENT_COLLISIONS_CHANNEL, { elementsLow } satisfies StudioElementCollisionsMessage);
}
