import type { RpgClientEngine } from "@rpgjs/client";

/** The three lists a Studio map keeps its placed elements in. */
export type StudioElementLayerName = "alwaysLow" | "low" | "high";

/** What an extension is given each time a map is loaded. */
export interface StudioMapExtensionContext {
  readonly engine: RpgClientEngine<any>;
  readonly mapId: string;
  /** World size, in pixels. */
  readonly size: readonly [width: number, height: number];
  /** The placed elements of the map as they are stored (`{ id, tilesetId, x, y, … }`), per layer. */
  readonly elements: Readonly<Record<StudioElementLayerName, readonly any[]>>;
  /**
   * What the runtime draws for a placed element: its tileset element, size, drawing rule… `null` when its tileset or its
   * element cannot be found (such an element is not drawn).
   */
  resolveElement(placed: any, layer: StudioElementLayerName): any | null;
  /**
   * Teaches the map an element tileset it was not loaded with (a set the person added while editing): its elements can then be
   * resolved (`resolveElement`), drawn and given collisions, as those of the sets the map came with. `tileset` is the media of the
   * set (`{ _id, fileName, metadata: { elements, drawRules } }`). A set it already knows is replaced. Resolves once its picture is
   * loaded.
   */
  addElementTileset(tileset: unknown): Promise<void>;
  /** The features the runtime draws for a stored terrain morphology layer (holes and walls). */
  normalizeMorphology(layer: unknown): unknown[];
  /** The address a stored asset path is served from. */
  resolveAsset(fileName: string): string;
  /** The address of the picture of an element tileset (what a ghost of an element about to be placed shows), or `undefined`. */
  tilesetImage(tilesetId: string): string | undefined;
  /** The data the scene shows now (what `updateData` merged into), or `undefined` before it is shown. */
  readData(): any | undefined;
  /**
   * Replaces part of the data the map is drawn with, and draws it again:
   * `{ elementsLow: [...resolved elements] }`. Whatever is not named is left as it is.
   *
   * It only draws: the collisions are not touched. After the editor changes the elements of the `elementsLow` layer, call
   * `rebuildElementCollisions` so the hero collides with what is drawn.
   *
   * `layerOpacity` is a key the renderer reads: `{ layerOpacity: { terrain: 0.4, elementsLow: 1 } }` draws each named layer
   * (`terrain`, `elementsAlwaysLow`, `elementsLow`, `elementsHigh`) at that opacity, from 0 to 1. A layer that is not named
   * stays opaque. Characters and events are not affected.
   *
   * `hideEvents: true` stops drawing the events the game runs (the characters of the players are still drawn): a map editor shows
   * the events of the map as its own markers while the map is edited. `false` draws them again.
   */
  updateData(patch: Readonly<Record<string, unknown>>): void;
  /**
   * Makes the collisions follow the placed elements: given them as stored (`{ elementsLow: [...] }`, the layer that blocks),
   * it replaces every hitbox the elements of the map made, on the client map and on the server map, and leaves the others
   * (the base map, the terrain). Same rules as at load: only `elementsLow`, the polygon hitboxes of an element, its scale
   * and its draw rule. After the editor adds, moves or removes an element, the hero collides with what is drawn, and only
   * with it. The server applies it only for a player it allows: see `createStudioElementCollisionsServer`.
   */
  rebuildElementCollisions(placed: Readonly<{ low: readonly unknown[] }>): void;
  /**
   * Changes the params of the map the scene shows, without loading it again: `{ scale: 2, backgroundMusic: "<url>" }`. They
   * go to the params the map is drawn from (`readData().params`) and, for `backgroundMusic` and `backgroundAmbientSound`,
   * to where the client plays the music and the ambient sound from: a value that is `undefined` takes the key off, which
   * stops the sound. The two sounds are addresses, see `resolveAudio`. The size and the scale of the collisions are not made
   * again: a change of scale shows on the picture only.
   */
  updateParams(patch: Readonly<Record<string, unknown>>): void;
  /** The address a sound of the map settings is played from (a stored file name, a media, a media id), or `""`. */
  resolveAudio(value: unknown): Promise<string>;
}

/**
 * Called each time a map is loaded. It may return a function that undoes what it set up: it runs when
 * another map is loaded, or when the extension is removed.
 */
export type StudioMapExtension = (context: StudioMapExtensionContext) => void | (() => void);

const extensions = new Set<StudioMapExtension>();
const cleanups = new Map<StudioMapExtension, () => void>();

/**
 * Plugs something into the loading of Studio maps: a tool, a debug overlay, an editor. Returns the function
 * that removes it. This is the only door the runtime opens: it knows nothing of what goes through it.
 */
export function registerStudioMapExtension(extension: StudioMapExtension): () => void {
  extensions.add(extension);
  return () => {
    extensions.delete(extension);
    cleanups.get(extension)?.();
    cleanups.delete(extension);
  };
}

/** Runs the extensions for a map that has just been loaded. A failing extension does not stop the others, or the game. */
export function runStudioMapExtensions(context: StudioMapExtensionContext): void {
  for (const extension of [...extensions]) {
    try {
      cleanups.get(extension)?.();
      cleanups.delete(extension);
      const cleanup = extension(context);
      if (typeof cleanup === "function") cleanups.set(extension, cleanup);
    } catch (error) {
      console.error("[studio] a map extension failed", error);
    }
  }
}
