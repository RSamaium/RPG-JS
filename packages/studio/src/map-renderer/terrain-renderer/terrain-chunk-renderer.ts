import type { ElementLiquidRegion } from "../element-submersion";
import { Container as PixiContainer, Rectangle, Sprite, Texture } from "pixi.js";
import { hasAutoLightingSunShadows, type LightingColor, type LightingState } from "@rpgjs/common";
import {
  resolveTerrainLiquidPalette,
  type TerrainLiquidPalette,
  builtInTerrainPresets,
  composeTerrainLayerPixels,
  renderNineSlice,
  resolveTerrainMorphologyLiquidGeometry,
  type RasterImage,
  type TerrainMorphologyLiquidEdgeMetrics,
  type TerrainPresetRenderer,
} from "@rpgjs/render-map2d";
import { buildStudioTerrainCollisionPolygons } from "../collision-polygons";
import { TerrainWorkerClient } from "./terrain-worker-client";
import { createCanvasElement } from "../canvas-env";
import { createRockFacePixels, renderRockFacePixels } from "./rock-face-pattern";
import { createStudioTerrainRenderData } from "../map-normalizer";
import {
  STUDIO_TERRAIN_TILE_SIZE,
  type TerrainAssetMetadata,
  type TerrainRenderMode,
  type StudioCollisionPolygon,
  type StudioTerrainControlTexture,
  type StudioTerrainMorphologyFeature,
  type StudioTerrainRenderBounds,
  type StudioTerrainRenderData,
  type StudioTerrainRockTexture,
  type StudioTerrainStreamUpdate,
  type StudioWaterAnimationOptions,
} from "../types";
import {
  createTerrainPatternCanvas,
  findTerrainTexture,
  getTerrainRenderMode,
  isWaterTerrainTexture,
  resolveEffectiveTerrainTextureGrid,
  resolveTerrainTileAtlasSourceRect,
  resolveTerrainTextureSourceRect,
} from "./terrain-texture";
import type { StudioViewportBounds } from "../viewport-culling";
import {
  CanvasBuffer,
  CanvasOffsetDrawRegion,
  DEFAULT_CHUNK_SIZE,
  ImageBuffer,
  ROCK_FACE_TEXTURE_HEIGHT,
  ROCK_FACE_TEXTURE_WIDTH,
  RgbaColor,
  SOLID_BLACK_TERRAIN_TEXTURE_ID,
  StudioTerrainChunkPainter,
  TerrainWaterAnimationTarget,
  TerrainWallSlice,
  StudioTerrainChunkRendererOptions,
  StudioTerrainWallShadowStyle,
  TERRAIN_TRANSITION_DIRECTIONS,
  TRANSPARENT,
  TerrainControlLayer,
  TerrainControlRenderLayer,
  TerrainHoleFillGeometry,
  TerrainHoleRenderParts,
  TerrainHoleWaveDescriptor,
  TerrainMorphologyFeatureMetrics,
  TerrainMorphologyMaskBuffer,
  TerrainViewportBounds,
  TerrainWallRenderParts,
  TerrainWaterOverlayData,
  TerrainWaterRegion,
  TerrainWaterWaveOptions,
  TerrainWaveRenderStrength,
  WATER_ANIMATION_FRAME_DURATION,
  WATER_UPDATE_BUDGET_MS,
  clampByte,
  clampInteger,
  clampNumber,
  createTerrainControlLayers,
  createTerrainControlRenderLayers,
  cropCanvasMask,
  cropRasterImage,
  decodeTerrainControlRegion,
  degreesToRadians,
  drawCanvasBounds,
  drawDirectionalWaterRefraction,
  drawDirectionalWaveMask,
  drawStrokePath,
  drawTerrainMorphologyOrganicBlob,
  drawTerrainMorphologyRoundRect,
  drawWaterAnimationFrame,
  drawWaterAnimationRegion,
  expandBounds,
  fallbackTerrainColor,
  featureIntersectsBounds,
  findAlphaBands,
  findAlphaBounds,
  getTerrainMorphologyBounds,
  getTerrainMorphologyFeatureMetrics,
  getTerrainMorphologyHeight,
  getTerrainMorphologyLocalMaskBounds,
  getTerrainMorphologySmoothness,
  getTerrainMorphologySmoothnessFromParams,
  hashTerrainString,
  intersectBounds,
  isFiniteBounds,
  isStudioTerrainRenderData,
  isTerrainMorphologyPointNearLocalBounds,
  isTerrainMorphologySegmentNearLocalBounds,
  isTerrainWaveAnimated,
  mix,
  normalizeWaveDirection,
  positiveModulo,
  projectBoundsIntoRotatedSpace,
  readFiniteNumber,
  readTerrainControlPixel,
  rectsIntersect,
  resetCanvasContext,
  resetTerrainMorphologyFeatureMetricsCache,
  resolveCanvasOffsetDrawRegion,
  resolveRotatedRectangleBounds,
  resolveSharedTerrainPreset,
  resolveTerrainHoleFillGeometry,
  resolveTerrainHoleWaveDescriptors,
  resolveTerrainHoleWaveOptions,
  resolveTerrainLayerBlendRadius,
  resolveTerrainLayerPriority,
  resolveTerrainModeBlendRadius,
  resolveTerrainTextureRepeatLocal,
  resolveTerrainTransitionRules,
  resolveTerrainTransitionWidth,
  resolveTerrainWaveDirectionVector,
  resolveTerrainWaveHighlightColor,
  resolveTerrainWaveOptions,
  resolveTerrainWaveRenderStrength,
  resolveTransitionNeighborIds,
  resolveWaterMaskAlphaBounds,
  resolveWaterMaskChunkIntersection,
  sampleTerrainControlColor,
  sampleTerrainLayerColor,
  shouldRenderTerrainGridWithSoftMasks,
  shouldSearchTerrainTransition,
  smoothstep,
  snapNearZero,
  stableStringHash,
  stringParam,
  terrainMorphologyFeatureMetricsCache,
  terrainMorphologyNoise,
  terrainRenderModeWidth,
  unionBounds,
  yieldToMainThread,
} from "./terrain-chunk-painter";
export * from "./terrain-chunk-painter";



interface TerrainChunk {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  texture: Texture;
  sprite: Sprite;
  waterOverlay?: TerrainWaterOverlay;
}

interface TerrainWaterOverlay extends TerrainWaterAnimationTarget {
  texture: Texture;
  sprite: Sprite;
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

function setNearestTextureScale(texture: Texture): void {
  const source = (texture as unknown as { source?: { scaleMode?: string } }).source;
  if (source) {
    source.scaleMode = "nearest";
  }
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

export class StudioTerrainChunkRenderer extends StudioTerrainChunkPainter {
  private readonly world: PixiContainer;
  private readonly chunkSize: number;
  private chunks = new Map<string, TerrainChunk>();
  private renderVersion = "";
  private renderConfiguration = "";
  private streamRevision = "";
  private streamGeneration = -1;
  private renderRequestSerial = 0;
  private viewportBounds: TerrainViewportBounds | null = null;
  private viewportMargin = 0;
  private waterCursor = 0;
  private waterAnimationElapsed = 0;
  private worker: TerrainWorkerClient | null = null;
  private workerDisabled = false;
  private chunkTokenCounter = 0;
  private chunkTokens = new Map<string, number>();
  private inflightChunks = new Map<string, { signature: string; done: Promise<void> }>();
  private workerData: StudioTerrainRenderData | null = null;

  constructor(world: PixiContainer, options: StudioTerrainChunkRendererOptions = {}) {
    super();
    this.world = world;
    this.chunkSize = Math.max(STUDIO_TERRAIN_TILE_SIZE, options.chunkSize ?? DEFAULT_CHUNK_SIZE);
    this.world.sortableChildren = true;
  }

  async renderMap(map: any, options: StudioTerrainChunkRendererOptions = {}): Promise<void> {
    if (this.destroyed || typeof document === "undefined") return;
    const data = isStudioTerrainRenderData(map?.terrainRenderData)
      ? map.terrainRenderData
      : createStudioTerrainRenderData(map);
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
    if (
      streamUpdate &&
      version === this.renderVersion &&
      configuration === this.renderConfiguration &&
      streamUpdate.revision === this.streamRevision &&
      streamUpdate.generation === this.streamGeneration
    ) {
      return;
    }
    const renderAllActiveStreamChunks = Boolean(
      streamUpdate &&
        (
          !this.renderVersion ||
          configuration !== this.renderConfiguration ||
          streamUpdate.revision !== this.streamRevision
        )
    );
    const requestSerial = ++this.renderRequestSerial;
    const worker = this.getWorker();
    // With a worker the images are decoded there; the page loads them only if it has to paint itself.
    let images = worker ? null : await this.loadChunkImages(data);
    if (this.destroyed || requestSerial !== this.renderRequestSerial) return;

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
    const nextKeys = streamUpdate
      ? renderAllActiveStreamChunks
        ? activeKeys!
        : this.collectChunkKeys(streamUpdate.dirtyRegions, data)
      : viewportKeys ?? this.collectAllChunkKeys(data);
    if (!streamUpdate && previousVersion === version) {
      for (const key of [...nextKeys]) {
        if (this.chunks.has(key)) nextKeys.delete(key);
      }
    }
    const collisions = debugCollisions ? buildStudioTerrainCollisionPolygons(map) : [];

    if (previousVersion !== version || streamUpdate) {
      this.resetMorphologyRenderCaches();
      this.workerData = null;
    }
    const orderedKeys = this.sortChunkKeysByDistance(
      [...nextKeys],
      data,
      options.viewportBounds ?? this.viewportBounds
    );
    // A chunk is painted for one state of the terrain. A newer call neither repeats a chunk already on its
    // way for that state nor throws away its result: it only drops a result a newer request for the chunk replaced.
    const signature = `${version}|${this.streamRevision}|${this.streamGeneration}`;
    const isStale = () => this.destroyed || this.renderVersion !== version;
    const pending: Promise<void>[] = [];
    let renderedChunkCount = 0;
    for (const key of orderedKeys) {
      if (activeKeys && !activeKeys.has(key)) {
        const previous = this.chunks.get(key);
        if (previous) {
          this.destroyChunk(previous);
          this.chunks.delete(key);
        }
        continue;
      }
      const inflight = this.inflightChunks.get(key);
      if (inflight?.signature === signature) {
        // Already on its way for this state: this call is done only once it has arrived.
        pending.push(inflight.done);
        continue;
      }
      const token = ++this.chunkTokenCounter;
      this.chunkTokens.set(key, token);
      let finish!: () => void;
      this.inflightChunks.set(key, { signature, done: new Promise<void>((resolve) => { finish = resolve; }) });
      try {
        const bounds = this.getChunkBounds(key, data);
        let painted: { canvas: HTMLCanvasElement; water: TerrainWaterOverlayData | null } | null = null;
        if (this.worker) {
          try {
            if (this.workerData !== data) {
              this.worker.setData(data, collisions, splitWallForeground);
              this.workerData = data;
            }
            painted = await this.worker.paint(bounds);
          } catch {
            // No worker for this page (blocked, cloning failed...): paint here, as before.
            this.disableWorker();
          }
          if (isStale()) return;
        }
        if (!painted) {
          images ??= await this.loadChunkImages(data);
          if (isStale()) return;
          painted = this.paintChunkLayers(
            data,
            images.image,
            images.controlImage,
            bounds,
            collisions,
            splitWallForeground
          );
          if (!painted) continue;
        }
        if (this.chunkTokens.get(key) !== token) continue;
        this.renderChunk(key, data, bounds, painted);
        renderedChunkCount += 1;
      } finally {
        if (this.chunkTokens.get(key) === token) this.inflightChunks.delete(key);
        finish();
      }
      if (renderedChunkCount < orderedKeys.length) {
        await yieldToMainThread();
        if (isStale()) return;
      }
    }
    if (pending.length > 0) {
      await Promise.all(pending);
      if (isStale()) return;
    }
    if (requestSerial !== this.renderRequestSerial) return;

    if (!streamUpdate || renderAllActiveStreamChunks) {
      const retainedKeys = activeKeys ?? nextKeys;
      for (const [key, chunk] of this.chunks) {
        if (!retainedKeys.has(key) && !(viewportKeys && !streamUpdate)) {
          this.destroyChunk(chunk);
          this.chunks.delete(key);
        }
      }
    }

    this.updateChunkVisibility(options.viewportBounds ?? this.viewportBounds, options.viewportMargin ?? this.viewportMargin);
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

  private getWorker(): TerrainWorkerClient | null {
    if (this.worker || this.workerDisabled) return this.worker;
    this.worker = TerrainWorkerClient.create();
    if (!this.worker) this.workerDisabled = true;
    return this.worker;
  }

  private disableWorker(): void {
    this.worker?.dispose();
    this.worker = null;
    this.workerData = null;
    this.workerDisabled = true;
  }

  private async loadChunkImages(
    data: StudioTerrainRenderData
  ): Promise<{ image: HTMLImageElement | null; controlImage: HTMLImageElement | null }> {
    const [image, controlImage] = await Promise.all([
      data.sourceTexture ? this.loadImage(data.sourceTexture) : Promise.resolve(null),
      data.terrainControl?.source && !data.terrainControl.regions?.length
        ? this.loadImage(data.terrainControl.source)
        : Promise.resolve(null),
    ]);
    return { image, controlImage };
  }

  /** Nearest to the middle of the screen first, so what is seen is ready first. */
  private sortChunkKeysByDistance(
    keys: string[],
    data: StudioTerrainRenderData,
    viewport: TerrainViewportBounds | null
  ): string[] {
    const centerX = viewport ? viewport.x + viewport.width / 2 : data.width / 2;
    const centerY = viewport ? viewport.y + viewport.height / 2 : data.height / 2;
    const distance = (key: string) => {
      const bounds = this.getChunkBounds(key, data);
      return Math.hypot(bounds.x + bounds.width / 2 - centerX, bounds.y + bounds.height / 2 - centerY);
    };
    return keys
      .map((key) => ({ key, distance: distance(key) }))
      .sort((a, b) => a.distance - b.distance)
      .map((entry) => entry.key);
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
    this.renderRequestSerial += 1;
    for (const chunk of this.chunks.values()) {
      this.destroyChunk(chunk);
    }
    this.chunks.clear();
    this.patternCache.clear();
    this.imageBufferCache.clear();
    this.viewportBounds = null;
    this.renderVersion = "";
    this.renderConfiguration = "";
    this.streamRevision = "";
    this.streamGeneration = -1;
    this.waterAnimationElapsed = 0;
    this.resetMorphologyRenderCaches();
    this.worker?.dispose();
    this.worker = null;
    this.workerData = null;
    this.world.removeChildren();
  }

  async createWallOcclusionSprites(map: any, options: { sliceWidth?: number } = {}): Promise<Sprite[]> {
    if (this.destroyed || typeof document === "undefined") return [];
    const data = isStudioTerrainRenderData(map?.terrainRenderData)
      ? map.terrainRenderData
      : createStudioTerrainRenderData(map);
    if (!data.morphologyFeatures.some((feature) => feature.kind === "wall")) return [];
    const sliceWidth = Math.max(12, Math.round(options.sliceWidth ?? data.tileSize / 2));
    const slices = await this.paintWalls(
      data,
      { type: "walls-occlusion", sliceWidth },
      async () => this.paintWallOcclusionSlices(data, data.sourceTexture ? await this.loadImage(data.sourceTexture) : null, sliceWidth)
    );
    return this.createWallSprites(slices, true);
  }

  async createWallShadowSprites(map: any, lighting: LightingState | null | undefined): Promise<Sprite[]> {
    if (this.destroyed || typeof document === "undefined") return [];
    const data = isStudioTerrainRenderData(map?.terrainRenderData)
      ? map.terrainRenderData
      : createStudioTerrainRenderData(map);
    const style = resolveStudioTerrainWallShadowStyle(data, lighting);
    if (!style) return [];
    if (!data.morphologyFeatures.some((feature) => feature.kind === "wall")) return [];

    const slices = await this.paintWalls(
      data,
      { type: "walls-shadow", style },
      async () => this.paintWallShadowSlices(data, style)
    );
    return this.createWallSprites(slices, false);
  }

  /** Paints the walls in the worker, or here when there is none. */
  private async paintWalls(
    data: StudioTerrainRenderData,
    request: { type: "walls-occlusion"; sliceWidth: number } | { type: "walls-shadow"; style: StudioTerrainWallShadowStyle },
    paintHere: () => Promise<TerrainWallSlice[]>
  ): Promise<TerrainWallSlice[]> {
    const worker = this.getWorker();
    if (worker) {
      try {
        return await worker.paintWalls(data, request);
      } catch {
        this.disableWorker();
      }
    }
    return paintHere();
  }

  private createWallSprites(slices: TerrainWallSlice[], occlusion: boolean): Sprite[] {
    return slices.map((slice) => {
      const texture = Texture.from(slice.canvas);
      if (occlusion) setNearestTextureScale(texture);
      const sprite = new Sprite(texture);
      sprite.x = slice.x;
      sprite.y = slice.y;
      sprite.zIndex = slice.zIndex;
      sprite.roundPixels = true;
      if (!occlusion) sprite.eventMode = "none";
      sprite.cullable = true;
      sprite.cullArea = new Rectangle(0, 0, slice.canvas.width, slice.canvas.height);
      sprite.label = slice.label;
      return sprite;
    });
  }

  private renderChunk(
    key: string,
    data: StudioTerrainRenderData,
    bounds: { x: number; y: number; width: number; height: number },
    painted: { canvas: HTMLCanvasElement; water: TerrainWaterOverlayData | null }
  ): void {
    const { canvas } = painted;
    const texture = Texture.from(canvas);
    setNearestTextureScale(texture);
    const sprite = new Sprite(texture);
    sprite.x = Math.round(bounds.x);
    sprite.y = Math.round(bounds.y);
    sprite.zIndex = 0;
    sprite.roundPixels = true;
    sprite.cullable = true;
    sprite.cullArea = new Rectangle(0, 0, bounds.width, bounds.height);
    const waterOverlay = painted.water ? this.createWaterOverlay(painted.water, bounds) : null;

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
    if (chunk.waterOverlay && !chunk.waterOverlay.sprite.destroyed) {
      chunk.waterOverlay.sprite.destroy({ texture: true });
    }
  }

  private createWaterOverlay(
    water: TerrainWaterOverlayData,
    bounds: { x: number; y: number; width: number; height: number }
  ): TerrainWaterOverlay {
    const canvas = this.createCanvasBuffer(water.overlayBounds.width, water.overlayBounds.height, true);
    const texture = Texture.from(canvas.canvas);
    setNearestTextureScale(texture);
    const sprite = new Sprite(texture);
    sprite.x = Math.round(bounds.x + water.overlayBounds.x);
    sprite.y = Math.round(bounds.y + water.overlayBounds.y);
    sprite.zIndex = 0.15;
    sprite.roundPixels = true;
    sprite.cullable = true;
    sprite.cullArea = new Rectangle(0, 0, water.overlayBounds.width, water.overlayBounds.height);
    sprite.label = "StudioTerrain:water-animation";

    const overlay: TerrainWaterOverlay = {
      canvas: canvas.canvas,
      ctx: canvas.ctx,
      frame: this.createCanvasBuffer(water.overlayBounds.width, water.overlayBounds.height, true),
      waveMask: this.createCanvasBuffer(water.overlayBounds.width, water.overlayBounds.height, true),
      surface: water.surface,
      texture,
      sprite,
      regions: water.regions,
      originX: bounds.x + water.overlayBounds.x,
      originY: bounds.y + water.overlayBounds.y,
    };
    drawWaterAnimationFrame(overlay);
    updateCanvasTexture(texture);
    return overlay;
  }

}
