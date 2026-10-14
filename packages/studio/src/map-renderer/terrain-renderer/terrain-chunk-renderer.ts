import type { ElementLiquidRegion } from "../element-submersion";
import { Container as PixiContainer, Rectangle, Sprite, Texture } from "pixi.js";
import { hasAutoLightingSunShadows, type LightingColor, type LightingState } from "@rpgjs/common";
import { buildStudioTerrainCollisionPolygons } from "../collision-polygons";
import { createStudioTerrainRenderData } from "../map-normalizer";
import {
  STUDIO_TERRAIN_TILE_SIZE,
  type StudioCollisionPolygon,
  type StudioTerrainRenderBounds,
  type StudioTerrainRenderData,
  type StudioTerrainStreamUpdate,
} from "../types";
import type { StudioViewportBounds } from "../viewport-culling";
import type { TerrainPaintedImage } from "./terrain-canvas";
import type { TerrainChunkPaint, TerrainPaintBackend, TerrainWaterPaint } from "./terrain-paint-backend";
import { createTerrainPaintBackend } from "./terrain-worker-pool";
import {
  createTerrainCanvasBuffer,
  drawWaterAnimationFrame,
  expandBounds,
  rectsIntersect,
  viewportSignature,
  type CanvasBuffer,
  type StudioTerrainWallShadowStyle,
  type TerrainWaterAnimationState,
} from "./terrain-painter";

export {
  isTerrainWaveAnimated,
  resolveCanvasOffsetDrawRegion,
  resolveTerrainHoleFillGeometry,
  resolveTerrainHoleWaveDescriptors,
  resolveTerrainHoleWaveOptions,
  resolveTerrainTextureRepeatLocal,
  resolveTerrainWaveDirectionVector,
  resolveTerrainWaveHighlightColor,
  resolveTerrainWaveOptions,
  resolveTerrainWaveRenderStrength,
  resolveWaterMaskChunkIntersection,
  shouldRenderTerrainGridWithSoftMasks,
} from "./terrain-painter";
export type {
  CanvasOffsetDrawRegion,
  RgbaColor,
  StudioTerrainWallShadowStyle,
  TerrainHoleFillGeometry,
  TerrainHoleWaveDescriptor,
  TerrainWaterWaveOptions,
  TerrainWaveRenderStrength,
} from "./terrain-painter";

const DEFAULT_CHUNK_SIZE = 768;
/** Room around the chunks drawn again, for the relief to be made in: blurs, insets and the drop of a liquid reach that far. */
const MORPHOLOGY_CLIP_MARGIN = 192;
const REPAINT_IDLE_DELAY = 350;
let chunkSizeOverride: number | undefined;

/**
 * Sets the chunk size, in world pixels, of the terrain renderers created from now on (before a map is loaded). A map
 * that is edited wants small chunks: drawing again what a stroke touched costs what the chunks it touches cost.
 */
export function setStudioTerrainChunkSize(size: number | undefined): void {
  chunkSizeOverride = size !== undefined && Number.isFinite(size) && size > 0 ? Math.round(size) : undefined;
}

const WATER_ANIMATION_FRAME_DURATION = 1 / 30;
/**
 * Time the water may take in one update (ms). Each water overlay is a chunk-sized canvas drawn on the CPU; with several of
 * them in view, drawing all of them every update stalls the game loop. The ones that do not fit wait for the next update.
 */
const WATER_UPDATE_BUDGET_MS = 6;

interface TerrainViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TerrainChunk {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  canvas: TerrainPaintedImage;
  texture: Texture;
  sprite: Sprite;
  waterOverlay?: TerrainWaterOverlay;
}

interface TerrainWaterOverlay extends TerrainWaterAnimationState {
  texture: Texture;
  sprite: Sprite;
}

export interface StudioTerrainChunkRendererOptions {
  /** Renderer chunk size in world pixels. */
  chunkSize?: number;
  /** Draw collision polygons into regenerated terrain chunks. */
  debugCollisions?: boolean;
  /** Render wall foreground separately from the terrain base. */
  splitWallForeground?: boolean;
  /** Consolidated client stream update used for spatial invalidation. */
  streamUpdate?: StudioTerrainStreamUpdate | null;
  /** Local world viewport used to lazily rasterize non-streamed terrain. */
  viewportBounds?: StudioViewportBounds | null;
  /** Extra world pixels rasterized around the current viewport. */
  viewportMargin?: number;
  /** Where the pixels are made. The page by default, or a worker (see `createTerrainPaintBackend`). */
  painter?: TerrainPaintBackend;
}

export class StudioTerrainChunkRenderer {
  private readonly world: PixiContainer;
  private readonly chunkSize: number;
  private readonly painter: TerrainPaintBackend;
  private chunks = new Map<string, TerrainChunk>();
  private renderVersion = "";
  private renderConfiguration = "";
  private streamRevision = "";
  private streamGeneration = -1;
  private renderRequestSerial = 0;
  private destroyed = false;
  private viewportBounds: TerrainViewportBounds | null = null;
  private viewportMargin = 0;
  /** The chunks a stream update asked for that are not drawn yet: a render that is replaced by another leaves them to it. */
  private pendingStreamKeys = new Set<string>();
  /** The chunks being drawn, by key, with the data they are drawn from. */
  private drawing = new Map<string, { signature: string; promise: Promise<void> }>();
  private repaintTimer: ReturnType<typeof setTimeout> | null = null;
  private waterCursor = 0;
  private waterAnimationElapsed = 0;

  constructor(world: PixiContainer, options: StudioTerrainChunkRendererOptions = {}) {
    this.world = world;
    this.chunkSize = Math.max(STUDIO_TERRAIN_TILE_SIZE, options.chunkSize ?? chunkSizeOverride ?? DEFAULT_CHUNK_SIZE);
    this.painter = options.painter ?? createTerrainPaintBackend();
    this.world.sortableChildren = true;
  }

  async renderMap(map: any, options: StudioTerrainChunkRendererOptions = {}): Promise<void> {
    if (this.destroyed || typeof document === "undefined") return;
    const data = isStudioTerrainRenderData(map?.terrainRenderData)
      ? map.terrainRenderData
      : createStudioTerrainRenderData(map);
    const viewAtStart = viewportSignature(this.viewportBounds ?? options.viewportBounds);
    const debugCollisions = options.debugCollisions === true;
    const splitWallForeground = options.splitWallForeground === true;
    const configuration = `debug:${debugCollisions}|chunk:${this.chunkSize}|splitWall:${splitWallForeground}`;
    const version = `${data.version}|${configuration}`;
    const streamUpdate = options.streamUpdate ?? data.streamUpdate ?? null;
    const viewportKeys = !streamUpdate && options.viewportBounds
      ? this.collectChunkKeys([
          expandBounds(options.viewportBounds, Math.max(0, options.viewportMargin ?? 0)),
        ], data)
      : null;
    if (
      !streamUpdate &&
      version === this.renderVersion &&
      this.chunks.size > 0 &&
      (!viewportKeys || [...viewportKeys].every((key) => this.chunks.has(key)))
    ) {
      this.updateChunkVisibility(options.viewportBounds ?? this.viewportBounds, options.viewportMargin ?? this.viewportMargin);
      return;
    }
    const sameStreamGeneration = Boolean(
      streamUpdate &&
      version === this.renderVersion &&
      configuration === this.renderConfiguration &&
      streamUpdate.revision === this.streamRevision &&
      streamUpdate.generation === this.streamGeneration
    );
    // A stream update draws the chunks that changed. The chunks in view that were never drawn (the map was only drawn
    // where the camera had been, and the camera has moved since) are drawn too, or they stay empty until a stroke
    // happens to touch them.
    const missingViewportKeys: string[] = [];
    if (streamUpdate && this.renderVersion && options.viewportBounds) {
      const active = this.collectChunkKeys(streamUpdate.activeRegions, data);
      const inView = this.collectChunkKeys([expandBounds(options.viewportBounds, Math.max(0, options.viewportMargin ?? 0))], data);
      for (const key of inView) if (active.has(key) && !this.chunks.has(key)) missingViewportKeys.push(key);
    }
    if (sameStreamGeneration && missingViewportKeys.length === 0 && this.pendingStreamKeys.size === 0) return;
    const renderAllActiveStreamChunks = Boolean(
      streamUpdate &&
        (
          !this.renderVersion ||
          configuration !== this.renderConfiguration ||
          streamUpdate.revision !== this.streamRevision
        )
    );
    const requestSerial = ++this.renderRequestSerial;
    const previousVersion = this.renderVersion;
    if (!streamUpdate && previousVersion && previousVersion !== version) {
      for (const chunk of this.chunks.values()) this.destroyChunk(chunk);
      this.chunks.clear();
    }
    this.renderVersion = version;
    this.renderConfiguration = configuration;
    this.streamRevision = streamUpdate?.revision ?? "";
    this.streamGeneration = streamUpdate?.generation ?? -1;

    const activeKeys = streamUpdate
      ? this.collectChunkKeys(streamUpdate.activeRegions, data)
      : null;
    let nextKeys: Set<string>;
    if (streamUpdate) {
      if (renderAllActiveStreamChunks) this.pendingStreamKeys.clear();
      const asked = renderAllActiveStreamChunks
        ? activeKeys!
        : new Set([...(sameStreamGeneration ? [] : this.collectChunkKeys(streamUpdate.dirtyRegions, data)), ...missingViewportKeys]);
      for (const key of asked) this.pendingStreamKeys.add(key);
      // What is in view is drawn first.
      const view = options.viewportBounds ? expandBounds(options.viewportBounds, Math.max(0, options.viewportMargin ?? 0)) : null;
      const inView = (key: string): boolean => !view || rectsIntersect(this.getChunkBounds(key, data), view);
      const ordered = [...this.pendingStreamKeys];
      nextKeys = new Set([...ordered.filter(inView), ...ordered.filter((key) => !inView(key))]);
    } else {
      this.pendingStreamKeys.clear();
      nextKeys = viewportKeys ?? this.collectAllChunkKeys(data);
    }
    if (!streamUpdate && previousVersion === version) {
      for (const key of [...nextKeys]) {
        if (this.chunks.has(key)) nextKeys.delete(key);
      }
    }
    const collisions = debugCollisions ? buildStudioTerrainCollisionPolygons(map) : [];

    this.painter.setData(data, previousVersion !== version || Boolean(streamUpdate));
    // Only some chunks are drawn again (a stroke touched them): the relief is made for them and their surroundings.
    const clip = streamUpdate && !renderAllActiveStreamChunks && nextKeys.size > 0 ? this.chunkKeysBounds(nextKeys, data, MORPHOLOGY_CLIP_MARGIN) : null;
    let renderedChunkCount = 0;
    const renderedKeys: string[] = [];
    for (const key of nextKeys) {
      if (activeKeys && !activeKeys.has(key)) {
        const previous = this.chunks.get(key);
        if (previous) {
          this.destroyChunk(previous);
          this.chunks.delete(key);
        }
        this.pendingStreamKeys.delete(key);
        continue;
      }
      await this.renderChunk(key, this.getChunkBounds(key, data), collisions, splitWallForeground, clip);
      if (this.destroyed || requestSerial !== this.renderRequestSerial) return;
      this.pendingStreamKeys.delete(key);
      renderedKeys.push(key);
      renderedChunkCount += 1;
      if (renderedChunkCount < nextKeys.size) {
        await yieldToMainThread();
        if (this.destroyed || requestSerial !== this.renderRequestSerial) return;
      }
    }

    if (!streamUpdate || renderAllActiveStreamChunks) {
      const retainedKeys = activeKeys ?? nextKeys;
      for (const [key, chunk] of this.chunks) {
        if (!retainedKeys.has(key) && !(viewportKeys && !streamUpdate)) {
          this.destroyChunk(chunk);
          this.chunks.delete(key);
        }
      }
    }

    // The camera may have moved while the chunks were drawn: the view it has now decides which are shown, not the one this call began with.
    this.updateChunkVisibility(this.viewportBounds ?? options.viewportBounds, options.viewportMargin ?? this.viewportMargin);
    // Chunks drawn while the camera moved can stay out of date on screen: draw them once more when it rests.
    if (streamUpdate && renderedKeys.length > 0 && viewportSignature(this.viewportBounds) !== viewAtStart) {
      this.scheduleRepaint(map, options, renderedKeys);
    }
  }

  private scheduleRepaint(map: any, options: StudioTerrainChunkRendererOptions, keys: string[]): void {
    if (this.repaintTimer !== null) clearTimeout(this.repaintTimer);
    const seen = viewportSignature(this.viewportBounds);
    this.repaintTimer = setTimeout(() => {
      this.repaintTimer = null;
      if (this.destroyed) return;
      if (viewportSignature(this.viewportBounds) !== seen) {
        this.scheduleRepaint(map, options, keys);
        return;
      }
      const view = this.viewportBounds ? expandBounds(this.viewportBounds, this.viewportMargin) : null;
      const data = isStudioTerrainRenderData(map?.terrainRenderData) ? map.terrainRenderData : null;
      if (!data) return;
      for (const key of keys) {
        if (this.chunks.has(key) && (!view || rectsIntersect(this.getChunkBounds(key, data), view))) this.pendingStreamKeys.add(key);
      }
      if (this.pendingStreamKeys.size === 0) return;
      void this.renderMap(map, { ...options, streamUpdate: data.streamUpdate ?? options.streamUpdate, viewportBounds: this.viewportBounds ?? options.viewportBounds });
    }, REPAINT_IDLE_DELAY);
  }

  /** The bounds around some chunks, with room around them. */
  private chunkKeysBounds(keys: Set<string>, data: StudioTerrainRenderData, margin: number): StudioTerrainRenderBounds | null {
    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    for (const key of keys) {
      const bounds = this.getChunkBounds(key, data);
      left = Math.min(left, bounds.x);
      top = Math.min(top, bounds.y);
      right = Math.max(right, bounds.x + bounds.width);
      bottom = Math.max(bottom, bounds.y + bounds.height);
    }
    if (!Number.isFinite(left)) return null;
    return { x: left - margin, y: top - margin, width: right - left + margin * 2, height: bottom - top + margin * 2 };
  }

  private collectAllChunkKeys(data: StudioTerrainRenderData): Set<string> {
    const keys = new Set<string>();
    const columns = Math.max(1, Math.ceil(data.width / this.chunkSize));
    const rows = Math.max(1, Math.ceil(data.height / this.chunkSize));
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        keys.add(`${column}:${row}`);
      }
    }
    return keys;
  }

  private collectChunkKeys(
    regions: StudioTerrainRenderBounds[],
    data: StudioTerrainRenderData
  ): Set<string> {
    const keys = new Set<string>();
    const columns = Math.max(1, Math.ceil(data.width / this.chunkSize));
    const rows = Math.max(1, Math.ceil(data.height / this.chunkSize));
    for (const region of regions) {
      const left = Math.max(0, Math.min(data.width, Number(region.x) || 0));
      const top = Math.max(0, Math.min(data.height, Number(region.y) || 0));
      const right = Math.max(
        left,
        Math.min(data.width, (Number(region.x) || 0) + (Number(region.width) || 0))
      );
      const bottom = Math.max(
        top,
        Math.min(data.height, (Number(region.y) || 0) + (Number(region.height) || 0))
      );
      if (right <= left || bottom <= top) continue;
      const minColumn = Math.floor(left / this.chunkSize);
      const minRow = Math.floor(top / this.chunkSize);
      const maxColumn = Math.min(columns - 1, Math.ceil(right / this.chunkSize) - 1);
      const maxRow = Math.min(rows - 1, Math.ceil(bottom / this.chunkSize) - 1);
      for (let row = minRow; row <= maxRow; row += 1) {
        for (let column = minColumn; column <= maxColumn; column += 1) {
          keys.add(`${column}:${row}`);
        }
      }
    }
    return keys;
  }

  private getChunkBounds(
    key: string,
    data: StudioTerrainRenderData
  ): StudioTerrainRenderBounds {
    const [column, row] = key.split(":").map(Number);
    const x = column * this.chunkSize;
    const y = row * this.chunkSize;
    return {
      x,
      y,
      width: Math.min(this.chunkSize, data.width - x),
      height: Math.min(this.chunkSize, data.height - y),
    };
  }

  updateChunkVisibility(bounds?: TerrainViewportBounds | null, margin = 0): void {
    this.viewportBounds = bounds ?? null;
    this.viewportMargin = Math.max(0, Number(margin) || 0);

    if (!bounds || !isFiniteBounds(bounds)) {
      for (const chunk of this.chunks.values()) {
        chunk.sprite.visible = true;
        if (chunk.waterOverlay) {
          chunk.waterOverlay.sprite.visible = true;
        }
      }
      return;
    }

    const visibleBounds = {
      x: bounds.x - this.viewportMargin,
      y: bounds.y - this.viewportMargin,
      width: bounds.width + this.viewportMargin * 2,
      height: bounds.height + this.viewportMargin * 2,
    };

    for (const chunk of this.chunks.values()) {
      const visible = rectsIntersect(chunk, visibleBounds);
      chunk.sprite.visible = visible;
      if (chunk.waterOverlay) {
        chunk.waterOverlay.sprite.visible = visible;
      }
    }
  }

  update(deltaTime: number): void {
    if (this.destroyed) return;
    const safeDelta = clampNumber(Number(deltaTime) || 16.67, 0, 120) / 1000;
    this.waterAnimationElapsed += safeDelta;
    if (this.waterAnimationElapsed < WATER_ANIMATION_FRAME_DURATION) return;
    const animationDelta = Math.min(this.waterAnimationElapsed, 0.3);
    this.waterAnimationElapsed %= WATER_ANIMATION_FRAME_DURATION;

    const animated: TerrainWaterOverlay[] = [];
    for (const chunk of this.chunks.values()) {
      const overlay = chunk.waterOverlay;
      if (!overlay || overlay.sprite.destroyed) continue;
      // The waves keep their speed for every overlay, drawn now or not.
      for (const region of overlay.regions) {
        region.phase += animationDelta * region.speed;
      }
      if (overlay.sprite.visible) animated.push(overlay);
    }
    if (animated.length === 0) return;

    // At least one overlay is drawn each update, then as many as fit in the budget, going round from where it stopped.
    const startedAt = performance.now();
    let drawn = 0;
    while (drawn < animated.length) {
      this.drawWaterOverlay(animated[(this.waterCursor + drawn) % animated.length]!);
      drawn += 1;
      if (performance.now() - startedAt > WATER_UPDATE_BUDGET_MS) break;
    }
    this.waterCursor = (this.waterCursor + drawn) % animated.length;
  }

  private drawWaterOverlay(overlay: TerrainWaterOverlay): void {
    drawWaterAnimationFrame(overlay);
    updateCanvasTexture(overlay.texture);
  }

  invalidateTerrain(bounds?: { x: number; y: number; width: number; height: number }): void {
    if (!bounds) {
      this.renderVersion = "";
      return;
    }
    const minX = Math.floor(bounds.x / this.chunkSize);
    const minY = Math.floor(bounds.y / this.chunkSize);
    const maxX = Math.ceil((bounds.x + bounds.width) / this.chunkSize) - 1;
    const maxY = Math.ceil((bounds.y + bounds.height) / this.chunkSize) - 1;
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const chunk = this.chunks.get(`${x}:${y}`);
        if (chunk) {
          this.destroyChunk(chunk);
          this.chunks.delete(chunk.key);
        }
      }
    }
    this.renderVersion = "";
  }

  destroy(): void {
    this.destroyed = true;
    if (this.repaintTimer !== null) clearTimeout(this.repaintTimer);
    this.repaintTimer = null;
    this.renderRequestSerial += 1;
    for (const chunk of this.chunks.values()) {
      this.destroyChunk(chunk);
    }
    this.chunks.clear();
    this.viewportBounds = null;
    this.renderVersion = "";
    this.renderConfiguration = "";
    this.streamRevision = "";
    this.streamGeneration = -1;
    this.waterAnimationElapsed = 0;
    this.drawing.clear();
    this.painter.destroy();
    this.world.removeChildren();
  }

  /** @internal Samples only an element's bounds; shares cached morphology masks. */
  async createLiquidContactRegion(data: StudioTerrainRenderData, bounds: StudioTerrainRenderBounds): Promise<ElementLiquidRegion | null> {
    if (this.destroyed || typeof document === "undefined") return null;
    return this.painter.paintLiquidContact(data, bounds);
  }

  async createWallOcclusionSprites(map: any, options: { sliceWidth?: number } = {}): Promise<Sprite[]> {
    if (this.destroyed || typeof document === "undefined") return [];
    const data = isStudioTerrainRenderData(map?.terrainRenderData)
      ? map.terrainRenderData
      : createStudioTerrainRenderData(map);
    const sliceWidth = Math.max(12, Math.round(options.sliceWidth ?? data.tileSize / 2));
    const pieces = await this.painter.paintWallOcclusion(data, sliceWidth);
    return pieces.map((piece) => {
      const texture = Texture.from(piece.canvas);
      setNearestTextureScale(texture);
      const sprite = new Sprite(texture);
      sprite.x = piece.x;
      sprite.y = piece.y;
      sprite.zIndex = piece.zIndex;
      sprite.roundPixels = true;
      sprite.cullable = true;
      sprite.cullArea = new Rectangle(0, 0, piece.canvas.width, piece.canvas.height);
      sprite.label = piece.label;
      return sprite;
    });
  }

  async createWallShadowSprites(map: any, lighting: LightingState | null | undefined): Promise<Sprite[]> {
    if (this.destroyed || typeof document === "undefined") return [];
    const data = isStudioTerrainRenderData(map?.terrainRenderData)
      ? map.terrainRenderData
      : createStudioTerrainRenderData(map);
    const style = resolveStudioTerrainWallShadowStyle(data, lighting);
    if (!style) return [];
    const pieces = await this.painter.paintWallShadow(data, style);
    return pieces.map((piece) => {
      const texture = Texture.from(piece.canvas);
      const sprite = new Sprite(texture);
      sprite.x = piece.x;
      sprite.y = piece.y;
      sprite.zIndex = 0;
      sprite.roundPixels = true;
      sprite.eventMode = "none";
      sprite.cullable = true;
      sprite.cullArea = new Rectangle(0, 0, piece.canvas.width, piece.canvas.height);
      sprite.label = piece.label;
      return sprite;
    });
  }

  /**
   * Draws a chunk where the painter makes it, and puts it in the world unless the data it was drawn from has been replaced
   * while it was made. A chunk already being drawn for the same data is not asked again: renders follow one another (the
   * camera moves), and each one waits for the chunk that the one before it asked for.
   */
  private renderChunk(
    key: string,
    bounds: { x: number; y: number; width: number; height: number },
    collisions: StudioCollisionPolygon[],
    splitWallForeground: boolean,
    clip: StudioTerrainRenderBounds | null
  ): Promise<void> {
    const signature = this.paintSignature();
    const running = this.drawing.get(key);
    if (running && running.signature === signature) return running.promise;
    const promise = (async () => {
      const paint = await this.painter.paintChunk({ key, bounds, collisions, splitWallForeground, clip });
      if (!paint || this.destroyed || this.paintSignature() !== signature) return;
      this.placeChunk(key, bounds, paint);
    })();
    const entry = { signature, promise };
    this.drawing.set(key, entry);
    void promise.then(
      () => this.drawing.get(key) === entry && this.drawing.delete(key),
      () => this.drawing.get(key) === entry && this.drawing.delete(key)
    );
    return promise;
  }

  /** What the data of the chunks that are drawn is: another render with the same is for the same pixels. */
  private paintSignature(): string {
    return `${this.renderVersion}|${this.renderConfiguration}|${this.streamRevision}|${this.streamGeneration}`;
  }

  /** Puts a chunk that was drawn in the world, in place of the one it replaces. */
  private placeChunk(key: string, bounds: { x: number; y: number; width: number; height: number }, paint: TerrainChunkPaint): void {
    const canvas = paint.canvas;
    const texture = Texture.from(canvas);
    setNearestTextureScale(texture);
    const sprite = new Sprite(texture);
    sprite.x = Math.round(bounds.x);
    sprite.y = Math.round(bounds.y);
    sprite.zIndex = 0;
    sprite.roundPixels = true;
    sprite.cullable = true;
    sprite.cullArea = new Rectangle(0, 0, bounds.width, bounds.height);
    const waterOverlay = paint.water ? this.createWaterOverlay(paint.water, bounds) : null;

    const previous = this.chunks.get(key);
    if (previous) {
      this.destroyChunk(previous);
      this.world.addChild(sprite);
    } else {
      this.world.addChild(sprite);
    }
    if (waterOverlay) {
      this.world.addChild(waterOverlay.sprite);
    }

    this.chunks.set(key, {
      key,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      canvas,
      texture,
      sprite,
      ...(waterOverlay ? { waterOverlay } : {}),
    });
  }

  private destroyChunk(chunk: TerrainChunk): void {
    if (!chunk.sprite.destroyed) {
      chunk.sprite.destroy({ texture: true });
    }
    closeBitmap(chunk.canvas);
    const overlay = chunk.waterOverlay;
    if (overlay) {
      if (!overlay.sprite.destroyed) overlay.sprite.destroy({ texture: true });
      closeBitmap(overlay.surface);
      for (const region of overlay.regions) closeBitmap(region.mask);
    }
  }

  /** The water that moves over a chunk: it is drawn again each frame, here, from the masks the painter made. */
  private createWaterOverlay(
    water: TerrainWaterPaint,
    bounds: { x: number; y: number; width: number; height: number }
  ): TerrainWaterOverlay {
    const { overlayBounds, regions, surface } = water;
    const canvas = createTerrainCanvasBuffer(overlayBounds.width, overlayBounds.height, true);
    const texture = Texture.from(canvas.canvas);
    setNearestTextureScale(texture);
    const sprite = new Sprite(texture);
    sprite.x = Math.round(bounds.x + overlayBounds.x);
    sprite.y = Math.round(bounds.y + overlayBounds.y);
    sprite.zIndex = 0.15;
    sprite.roundPixels = true;
    sprite.cullable = true;
    sprite.cullArea = new Rectangle(0, 0, overlayBounds.width, overlayBounds.height);
    sprite.label = "StudioTerrain:water-animation";

    const overlay: TerrainWaterOverlay = {
      canvas: canvas.canvas,
      ctx: canvas.ctx,
      frame: createTerrainCanvasBuffer(overlayBounds.width, overlayBounds.height, true),
      waveMask: createTerrainCanvasBuffer(overlayBounds.width, overlayBounds.height, true),
      surface,
      texture,
      sprite,
      regions,
      originX: bounds.x + overlayBounds.x,
      originY: bounds.y + overlayBounds.y,
    };
    drawWaterAnimationFrame(overlay);
    updateCanvasTexture(texture);
    return overlay;
  }
}

export class StudioTerrainWallOcclusionRenderer {
  private readonly renderer = new StudioTerrainChunkRenderer(new PixiContainer());
  private sprites: Sprite[] = [];
  private renderVersion = "";

  async renderMap(map: any): Promise<Sprite[]> {
    const data = isStudioTerrainRenderData(map?.terrainRenderData)
      ? map.terrainRenderData
      : createStudioTerrainRenderData(map);
    const version = `${data.version}|wall-occlusion:v1`;
    if (version === this.renderVersion) {
      return this.sprites;
    }

    const nextSprites = await this.renderer.createWallOcclusionSprites(map);
    this.clearSprites();
    this.sprites = nextSprites;
    this.renderVersion = version;
    return this.sprites;
  }

  updateSpriteVisibility(bounds?: StudioViewportBounds | null, margin = 0): void {
    updateTerrainSpriteVisibility(this.sprites, bounds, margin);
  }

  destroy(): void {
    this.clearSprites();
    this.renderer.destroy();
  }

  private clearSprites(): void {
    for (const sprite of this.sprites) {
      if (!sprite.destroyed) {
        sprite.destroy({ texture: true });
      }
    }
    this.sprites = [];
    this.renderVersion = "";
  }
}

export class StudioTerrainWallShadowRenderer {
  private readonly renderer = new StudioTerrainChunkRenderer(new PixiContainer());
  private sprites: Sprite[] = [];
  private renderVersion = "";

  async renderMap(map: any, lighting: LightingState | null | undefined): Promise<Sprite[]> {
    const data = isStudioTerrainRenderData(map?.terrainRenderData)
      ? map.terrainRenderData
      : createStudioTerrainRenderData(map);
    const style = resolveStudioTerrainWallShadowStyle(data, lighting);
    const version = `${data.version}|wall-shadow:v4|${JSON.stringify(style)}`;
    if (version === this.renderVersion) {
      return this.sprites;
    }

    const nextSprites = style ? await this.renderer.createWallShadowSprites(map, lighting) : [];
    this.clearSprites();
    this.sprites = nextSprites;
    this.renderVersion = version;
    return this.sprites;
  }

  updateSpriteVisibility(bounds?: StudioViewportBounds | null, margin = 0): void {
    updateTerrainSpriteVisibility(this.sprites, bounds, margin);
  }

  destroy(): void {
    this.clearSprites();
    this.renderer.destroy();
  }

  private clearSprites(): void {
    for (const sprite of this.sprites) {
      if (!sprite.destroyed) {
        sprite.destroy({ texture: true });
      }
    }
    this.sprites = [];
    this.renderVersion = "";
  }
}


export function resolveStudioTerrainWallShadowStyle(
  data: StudioTerrainRenderData,
  lighting: LightingState | null | undefined
): StudioTerrainWallShadowStyle | null {
  if (!hasAutoLightingSunShadows(lighting)) return null;

  const sun = lighting?.sun ?? {};
  const shadows = lighting?.shadows ?? {};
  const intensity = clampNumber(sun.intensity ?? 0.85, 0, 1.5);
  if (intensity <= 0) return null;

  const shadowWeight = clampNumber(sun.shadowWeight ?? 1, 0, 3);
  const projection = clampNumber(data.tileSize * 0.62 * Math.max(0.55, shadowWeight), 14, data.tileSize * 1.15);

  return {
    offsetX: Math.round(projection * 0.58),
    offsetY: Math.round(projection),
    blur: clampNumber(data.tileSize * 0.13, 4, 10),
    alpha: clampNumber(0.22 + intensity * 0.2 * Math.max(0.65, shadowWeight), 0.12, 0.52),
    color: formatLightingColor(shadows.shadowColor, "#05070d"),
  };
}

async function yieldToMainThread(): Promise<void> {
  const scheduler = (globalThis as typeof globalThis & {
    scheduler?: { yield?: () => Promise<void> };
  }).scheduler;
  if (typeof scheduler?.yield === "function") {
    await scheduler.yield();
    return;
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function updateCanvasTexture(texture: Texture): void {
  const textureLike = texture as unknown as {
    update?: () => void;
    source?: { update?: () => void };
  };
  textureLike.source?.update?.();
  textureLike.update?.();
}

function updateTerrainSpriteVisibility(sprites: Sprite[], bounds?: StudioViewportBounds | null, margin = 0): void {
  if (!bounds || !isFiniteBounds(bounds)) {
    for (const sprite of sprites) {
      if (!sprite.destroyed) {
        sprite.visible = true;
      }
    }
    return;
  }

  const safeMargin = Math.max(0, Number(margin) || 0);
  const visibleBounds = {
    x: bounds.x - safeMargin,
    y: bounds.y - safeMargin,
    width: bounds.width + safeMargin * 2,
    height: bounds.height + safeMargin * 2,
  };

  for (const sprite of sprites) {
    if (sprite.destroyed) continue;
    sprite.visible = rectsIntersect(getSpriteLocalBounds(sprite), visibleBounds);
  }
}

function getSpriteLocalBounds(sprite: Sprite): { x: number; y: number; width: number; height: number } {
  const texture = sprite.texture;
  return {
    x: Number(sprite.x) || 0,
    y: Number(sprite.y) || 0,
    width: Math.max(1, Number(sprite.width) || Number(texture?.width) || 1),
    height: Math.max(1, Number(sprite.height) || Number(texture?.height) || 1),
  };
}

function isFiniteBounds(bounds: { x: number; y: number; width: number; height: number }): boolean {
  return (
    Number.isFinite(bounds.x) &&
    Number.isFinite(bounds.y) &&
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height) &&
    bounds.width > 0 &&
    bounds.height > 0
  );
}

function setNearestTextureScale(texture: Texture): void {
  const source = (texture as unknown as { source?: { scaleMode?: string } }).source;
  if (source) {
    source.scaleMode = "nearest";
  }
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function formatLightingColor(value: LightingColor | undefined, fallback: string): string {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `#${Math.max(0, Math.min(0xffffff, Math.round(value))).toString(16).padStart(6, "0")}`;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [r, g, b] = value.map((channel) => clampNumber(Math.round(Number(channel)), 0, 255));
    return `rgb(${r}, ${g}, ${b})`;
  }
  return fallback;
}

function isStudioTerrainRenderData(value: unknown): value is StudioTerrainRenderData {
  return Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray((value as StudioTerrainRenderData).terrainGrid) &&
      typeof (value as StudioTerrainRenderData).width === "number" &&
      typeof (value as StudioTerrainRenderData).height === "number"
  );
}

/** A bitmap a worker gave away is memory of the page until it is closed. */
function closeBitmap(image: TerrainPaintedImage): void {
  if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) image.close();
}
