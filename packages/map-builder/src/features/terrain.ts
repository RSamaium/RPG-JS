import { Container, Sprite, Texture, TextureSource } from "pixi.js";
import type { RasterImage } from "@rpgjs/render-map2d";
import type { MapChange } from "../model/model";
import type { Unsubscribe } from "../model/result";
import { defineMapFeature, type MapFeature } from "../renderer/feature";
import type { TerrainBackend } from "../terrain-render/backend";
import { readTerrain, tryReadTerrain } from "../terrain/data";
import { dirtyOfPatch, widestBlend, type MaterialSource, type TerrainRenderInit } from "../terrain/kernel";
import { readRect, shapeBounds } from "../terrain/mask";
import { createTerrainScheduler, type TerrainFrame, type TerrainScheduler } from "../terrain/scheduler";
import type { MaskRect, TerrainData } from "../terrain/types";

export const TERRAIN_FEATURE_ID = "terrain";

/** One chunk of the terrain as pixels: a texture, and a way to write into it. */
export interface TerrainSurface {
  readonly texture: Texture;
  /** Writes RGBA pixels at `(x, y)` inside the surface, then makes the change visible. */
  put(x: number, y: number, width: number, height: number, pixels: Uint8ClampedArray): void;
  destroy(): void;
}

export type TerrainSurfaceFactory = (width: number, height: number) => TerrainSurface;

export interface TerrainOptions {
  /**
   * Where the kernel runs. Defaults to the calling thread, which is fine for small maps and tests.
   * For live painting use `workerTerrainBackend` from `@rpgjs/map-builder/terrain-render`.
   */
  readonly backend?: TerrainBackend | (() => TerrainBackend | Promise<TerrainBackend>);
  /** Decodes an image into pixels. Defaults to the browser (`createImageBitmap`). */
  readonly loadImage?: (src: string) => Promise<RasterImage>;
  /** Side of the squares the terrain is rendered in. Defaults to 512. */
  readonly chunk?: number;
  /** How chunk textures are made. Defaults to canvases; replaceable for tests. */
  readonly surface?: TerrainSurfaceFactory;
  /** Receives non-fatal problems (an image that did not load, a render that failed). Defaults to `console.warn`. */
  readonly onError?: (error: unknown) => void;
}

export interface TerrainApi {
  /** Resolves when everything that was asked to be (re)rendered has been. */
  whenIdle(): Promise<void>;
  /** Chunks waiting or being rendered. */
  readonly pending: number;
  /** The backend in use, once there is one. */
  readonly backend: TerrainBackend | undefined;
}

/** Pixels of an image, decoded in the browser. */
export async function decodeRaster(src: string): Promise<RasterImage> {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Could not load "${src}" (${response.status})`);
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(bitmap.width, bitmap.height) : Object.assign(document.createElement("canvas"), { width: bitmap.width, height: bitmap.height });
  const context = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  context.drawImage(bitmap, 0, 0);
  const image = context.getImageData(0, 0, bitmap.width, bitmap.height);
  bitmap.close();
  return { width: image.width, height: image.height, pixels: image.data };
}

/** Surfaces backed by canvases (nearest filtering, 1:1: the pixels are what the kernel produced). */
export const canvasSurface: TerrainSurfaceFactory = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  const texture = Texture.from(canvas);
  texture.source.scaleMode = "nearest";
  return {
    texture,
    put(x, y, w, h, pixels) {
      context.putImageData(new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>, w, h), x, y);
      texture.source.update();
    },
    destroy: () => texture.destroy(true),
  };
};

/** Surfaces that only keep their pixels in memory: for tests and tools that read them back. */
export function memorySurface(): TerrainSurfaceFactory & { pixelsOf(texture: Texture): Uint8ClampedArray | undefined } {
  const store = new WeakMap<Texture, Uint8ClampedArray>();
  const factory: TerrainSurfaceFactory = (width, height) => {
    const pixels = new Uint8ClampedArray(width * height * 4);
    const texture = new Texture({ source: new TextureSource({ width, height }) });
    store.set(texture, pixels);
    return {
      texture,
      put(x, y, w, h, source) {
        for (let row = 0; row < h; row += 1) pixels.set(source.subarray(row * w * 4, (row + 1) * w * 4), ((y + row) * width + x) * 4);
      },
      destroy: () => texture.destroy(true),
    };
  };
  return Object.assign(factory, { pixelsOf: (texture: Texture) => store.get(texture) });
}

/**
 * Draws the painted terrain of the map (`extensions.terrain`): the control mask, the materials and
 * their render modes, rendered by the kernel of `@rpgjs/render-map2d` into chunk textures.
 * Painting changes only the chunks it touches. What is on screen renders first.
 */
export function terrain(options: TerrainOptions = {}): MapFeature<"terrain", TerrainApi> {
  return defineMapFeature<"terrain", TerrainApi>({
    id: TERRAIN_FEATURE_ID,
    setup(host) {
      const chunk = options.chunk ?? 512;
      const makeSurface = options.surface ?? canvasSurface;
      const report = options.onError ?? ((error: unknown) => console.warn("[map-builder] terrain:", error));
      const container = new Container();
      container.label = "terrain";
      host.stages.ground.addChild(container);

      const sprites = new Map<number, { sprite: Sprite; surface: TerrainSurface }>();
      let backend: TerrainBackend | undefined;
      let scheduler: TerrainScheduler | undefined;
      let current: TerrainData | undefined;
      let grow: number | undefined;
      let viewport: { x: number; y: number; width: number; height: number } | null = null;
      let generation = 0;
      let destroyed = false;
      let starting: Promise<void> = Promise.resolve();
      // "loading": images and backend are being prepared, the terrain is read when they are ready.
      // "initializing": the backend has its copy of the terrain; changes made since are queued and replayed.
      // "ready": changes go straight to the backend.
      let phase: "idle" | "loading" | "initializing" | "ready" = "idle";
      let queued: Array<{ rect: MaskRect; values: Uint16Array }> = [];
      const images = new Map<string, Promise<RasterImage>>();

      const loadImage = (src: string): Promise<RasterImage> => {
        let promise = images.get(src);
        if (!promise) {
          promise = (options.loadImage ?? decodeRaster)(src);
          images.set(src, promise);
          promise.catch(() => images.delete(src));
        }
        return promise;
      };

      const colsOf = (data: TerrainData): number => Math.ceil((host.model.state.size[0] ?? data.mask.width) / chunk);

      const place = (frame: TerrainFrame): void => {
        const data = current;
        if (!data || destroyed) return;
        const col = Math.floor(frame.x / chunk);
        const row = Math.floor(frame.y / chunk);
        const index = row * colsOf(data) + col;
        let entry = sprites.get(index);
        if (!entry) {
          const surface = makeSurface(chunk, chunk);
          const sprite = new Sprite(surface.texture);
          sprite.position.set(col * chunk, row * chunk);
          container.addChild(sprite);
          entry = { sprite, surface };
          sprites.set(index, entry);
        }
        entry.surface.put(frame.x - col * chunk, frame.y - row * chunk, frame.width, frame.height, frame.pixels);
      };

      const sourcesOf = (data: TerrainData): Record<string, MaterialSource> => {
        const out: Record<string, MaterialSource> = {};
        for (const material of data.materials) {
          const asset = host.assets.resolve(material.texture);
          if (asset) out[material.id] = { src: asset.src, ...(asset.frame ? { frame: asset.frame } : {}) };
          else report(new Error(`terrain material "${material.id}": unknown asset "${material.texture}"`));
        }
        return out;
      };

      const clearChunks = (): void => {
        for (const { sprite, surface } of sprites.values()) {
          sprite.destroy();
          surface.destroy();
        }
        sprites.clear();
      };

      /** Gives the backend the terrain as it is now and renders everything. */
      async function begin(first: TerrainData, token: number): Promise<void> {
        const sources = sourcesOf(first);
        const loaded: Record<string, RasterImage> = {};
        await Promise.all(
          [...new Set(Object.values(sources).map((source) => source.src))].map(async (src) => {
            try {
              loaded[src] = await loadImage(src);
            } catch (error) {
              report(error);
            }
          }),
        );
        if (token !== generation || destroyed) return;
        if (!backend) {
          const made = typeof options.backend === "function" ? await options.backend() : options.backend;
          backend = made ?? (await import("../terrain-render/backend")).inlineTerrainBackend();
          if (token !== generation || destroyed) return;
        }
        // The terrain as it is now, not as it was when the restart began: edits may have come in while loading.
        const state = host.model.state;
        const data = tryReadTerrain(state);
        if (!data) return;
        const init: TerrainRenderInit = { data, size: state.size, tileSize: state.tileSize ?? 48, sources, images: loaded };
        phase = "initializing";
        queued = [];
        await backend.init(init);
        if (token !== generation || destroyed) return;
        for (const change of queued) backend.updateMask(change.rect, change.values);
        queued = [];
        phase = "ready";
        current = data;
        grow = widestBlend(data);
        scheduler?.destroy();
        clearChunks();
        const used = backend;
        scheduler = createTerrainScheduler({
          size: state.size,
          chunk,
          concurrency: used.concurrency,
          render: (rect) => used.render(rect, grow),
          apply: place,
          onError: (error) => report(error),
        });
        scheduler.setViewport(viewport);
        scheduler.invalidate("all");
      }

      const restart = (): void => {
        generation += 1;
        const token = generation;
        const data = tryReadTerrain(host.model.state);
        phase = data ? "loading" : "idle";
        if (!data) {
          scheduler?.destroy();
          scheduler = undefined;
          current = undefined;
          clearChunks();
          return;
        }
        starting = begin(data, token).catch(report);
      };

      const onChange = (change: MapChange): void => {
        if (destroyed) return;
        if (change.reset) return restart();
        let rebuild = false;
        const patches = change.patches.filter((patch) => patch.type.startsWith("terrain.") || (patch.type === "extension.set" && patch.id === "terrain"));
        if (patches.length === 0) return;
        const next = tryReadTerrain(change.state);
        if (!next) return restart();
        for (const patch of patches) {
          if (patch.type === "extension.set" || patch.type === "terrain.materials" || patch.type === "terrain.morphology") rebuild = true;
        }
        if (rebuild || phase === "idle") return restart();
        // The terrain is read when loading ends: it already includes this change.
        if (phase === "loading") return;
        // Mask changes: the backend gets the new values, in order, then the affected chunks render again.
        if (phase === "ready") current = next;
        for (const patch of patches) {
          const dirty = dirtyOfPatch(patch, next, grow ?? 0);
          if (dirty === "none") continue;
          if (patch.type === "terrain.paint" || patch.type === "terrain.region") {
            const rect: MaskRect | undefined = patch.type === "terrain.region" ? { x: patch.x, y: patch.y, width: patch.width, height: patch.height } : shapeBounds(next.mask, patch.shape);
            if (rect && phase === "initializing") queued.push({ rect, values: readRect(next.mask, rect) });
            else if (rect) backend?.updateMask(rect, readRect(next.mask, rect));
          }
          if (phase === "ready") scheduler?.invalidate(dirty);
        }
      };

      const stops: Unsubscribe[] = [host.model.subscribe(onChange), host.onViewport((next) => { viewport = next; scheduler?.setViewport(next); })];
      restart();

      return {
        api: {
          whenIdle: async () => {
            await starting;
            await scheduler?.whenIdle();
          },
          get pending() {
            return scheduler?.pending ?? 0;
          },
          get backend() {
            return backend;
          },
        },
        dispose() {
          destroyed = true;
          generation += 1;
          for (const stop of stops) stop();
          scheduler?.destroy();
          clearChunks();
          container.destroy();
          backend?.destroy();
        },
      };
    },
  });
}

export { readTerrain };
