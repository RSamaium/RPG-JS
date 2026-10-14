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
   */
  updateData(patch: Readonly<Record<string, unknown>>): void;
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
