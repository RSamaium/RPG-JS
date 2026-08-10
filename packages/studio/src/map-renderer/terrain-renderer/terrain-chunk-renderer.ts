import { Container as PixiContainer, Rectangle, Sprite, Texture } from "pixi.js";
import { hasAutoLightingSunShadows, type LightingColor, type LightingState } from "@rpgjs/common";
import { buildStudioTerrainCollisionPolygons } from "../collision-polygons";
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

const DEFAULT_CHUNK_SIZE = 768;
const SOLID_BLACK_TERRAIN_TEXTURE_ID = "__solid_black__";
const WATER_ANIMATION_FRAME_DURATION = 1 / 30;

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

interface TerrainWaterOverlay {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  frame: CanvasBuffer;
  waveMask: CanvasBuffer;
  surface: HTMLCanvasElement;
  texture: Texture;
  sprite: Sprite;
  regions: TerrainWaterRegion[];
  originX: number;
  originY: number;
}

interface TerrainWaterRegion {
  mask: HTMLCanvasElement;
  bounds: { x: number; y: number; width: number; height: number };
  phase: number;
  speed: number;
  intensity: number;
  direction: number;
  seed: number;
}

/** @internal */
export interface TerrainWaterWaveOptions {
  speed: number;
  intensity: number;
  direction: number;
}

/** @internal */
export interface TerrainHoleWaveDescriptor {
  feature: StudioTerrainMorphologyFeature;
  options: TerrainWaterWaveOptions;
}

/** @internal */
export interface TerrainWaveRenderStrength {
  refractionAlpha: number;
  refractionAcrossAmplitude: number;
  refractionFlowAmplitude: number;
  glowAlpha: number;
  waveAlpha: number;
  lineWidth: number;
}

interface TerrainViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageBuffer {
  key: string;
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

interface TerrainControlLayer {
  terrainTextureId: string;
  paletteIndex: number;
  source: { x: number; y: number; width: number; height: number };
}

interface TerrainControlRenderLayer {
  terrainTextureId: string;
  paletteIndex: number;
  priority: number;
  blendRadius: number;
  mode: TerrainRenderMode;
}

interface TerrainCompositeLayer {
  pixels: Uint8ClampedArray;
  mask: Uint8ClampedArray;
}

interface CanvasBuffer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

interface TerrainMorphologyMaskBuffer {
  canvas: HTMLCanvasElement;
  bounds: { x: number; y: number; width: number; height: number };
  alphaBounds?: { minX: number; minY: number; maxX: number; maxY: number };
}

interface TerrainWallRenderParts {
  mask: TerrainMorphologyMaskBuffer;
  topEdge: TerrainMorphologyMaskBuffer;
  bottomEdge: TerrainMorphologyMaskBuffer;
  faceMask: TerrainMorphologyMaskBuffer;
  leftEdge: TerrainMorphologyMaskBuffer;
  rightEdge: TerrainMorphologyMaskBuffer;
  smoothness: number;
  height: number;
}

interface TerrainHoleRenderParts {
  mask: TerrainMorphologyMaskBuffer;
  topEdge: TerrainMorphologyMaskBuffer;
  bottomEdge: TerrainMorphologyMaskBuffer;
  faceMask: TerrainMorphologyMaskBuffer;
  softFaceMask: TerrainMorphologyMaskBuffer;
  leftEdge: TerrainMorphologyMaskBuffer;
  rightEdge: TerrainMorphologyMaskBuffer;
  smoothness: number;
  depth: number;
}

export interface TerrainHoleFillGeometry {
  dropY: number;
  inset: number;
  level: number;
}

/** @internal */
export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface StudioTerrainWallShadowStyle {
  offsetX: number;
  offsetY: number;
  blur: number;
  alpha: number;
  color: string;
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
}

export class StudioTerrainChunkRenderer {
  private readonly world: PixiContainer;
  private readonly chunkSize: number;
  private chunks = new Map<string, TerrainChunk>();
  private imageCache = new Map<string, Promise<HTMLImageElement | null>>();
  private loadedImages = new Map<string, HTMLImageElement>();
  private imageBufferCache = new Map<string, ImageBuffer>();
  private patternCache = new Map<string, HTMLCanvasElement>();
  private renderVersion = "";
  private renderConfiguration = "";
  private streamRevision = "";
  private streamGeneration = -1;
  private renderRequestSerial = 0;
  private destroyed = false;
  private viewportBounds: TerrainViewportBounds | null = null;
  private viewportMargin = 0;
  private morphologyMaskCache = new WeakMap<StudioTerrainMorphologyFeature, TerrainMorphologyMaskBuffer | null>();
  private terrainWallRenderPartsCache = new WeakMap<StudioTerrainMorphologyFeature, TerrainWallRenderParts | null>();
  private terrainHoleRenderPartsCache = new WeakMap<StudioTerrainMorphologyFeature, TerrainHoleRenderParts | null>();
  private morphologyColorOverlayCache = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();
  private morphologyTextureFillCache = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();
  private morphologyCanvasIds = new WeakMap<HTMLCanvasElement, number>();
  private nextMorphologyCanvasId = 1;
  private morphologyClipBounds: StudioTerrainRenderBounds | null = null;
  private waterAnimationElapsed = 0;

  constructor(world: PixiContainer, options: StudioTerrainChunkRendererOptions = {}) {
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
    const [image, controlImage] = await Promise.all([
      data.sourceTexture ? this.loadImage(data.sourceTexture) : Promise.resolve(null),
      data.terrainControl?.source && !data.terrainControl.regions?.length
        ? this.loadImage(data.terrainControl.source)
        : Promise.resolve(null),
    ]);
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

    if (previousVersion !== version) this.resetMorphologyRenderCaches();
    let renderedChunkCount = 0;
    for (const key of nextKeys) {
      if (activeKeys && !activeKeys.has(key)) {
        const previous = this.chunks.get(key);
        if (previous) {
          this.destroyChunk(previous);
          this.chunks.delete(key);
        }
        continue;
      }
      this.renderChunk(
        key,
        data,
        image,
        controlImage,
        this.getChunkBounds(key, data),
        collisions,
        splitWallForeground
      );
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

    for (const chunk of this.chunks.values()) {
      const overlay = chunk.waterOverlay;
      if (!overlay || overlay.sprite.destroyed) continue;
      for (const region of overlay.regions) {
        region.phase += animationDelta * region.speed;
      }
      if (!overlay.sprite.visible) continue;
      drawWaterAnimationFrame(overlay);
      updateCanvasTexture(overlay.texture);
    }
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
    this.world.removeChildren();
  }

  async createWallOcclusionSprites(map: any, options: { sliceWidth?: number } = {}): Promise<Sprite[]> {
    if (this.destroyed || typeof document === "undefined") return [];
    const data = isStudioTerrainRenderData(map?.terrainRenderData)
      ? map.terrainRenderData
      : createStudioTerrainRenderData(map);
    const image = data.sourceTexture ? await this.loadImage(data.sourceTexture) : null;
    const sliceWidth = Math.max(12, Math.round(options.sliceWidth ?? data.tileSize / 2));
    const sprites: Sprite[] = [];

    this.resetMorphologyRenderCaches();
    try {
      for (const feature of data.morphologyFeatures) {
        if (feature.kind !== "wall") continue;
        const parts = this.createTerrainWallRenderParts(data, feature);
        if (!parts) continue;
        const rendered = this.createCanvasBuffer(parts.mask.canvas.width, parts.mask.canvas.height, true);
        rendered.ctx.save();
        rendered.ctx.translate(-parts.mask.bounds.x, -parts.mask.bounds.y);
        this.drawWallBase(rendered.ctx, data, image, feature, parts);
        this.drawWallForeground(rendered.ctx, data, image, feature, parts);
        rendered.ctx.restore();

        sprites.push(...this.createWallOcclusionSliceSprites(rendered.canvas, parts.mask, feature, sliceWidth));
      }
    } finally {
      this.resetMorphologyRenderCaches();
    }

    return sprites;
  }

  async createWallShadowSprites(map: any, lighting: LightingState | null | undefined): Promise<Sprite[]> {
    if (this.destroyed || typeof document === "undefined") return [];
    const data = isStudioTerrainRenderData(map?.terrainRenderData)
      ? map.terrainRenderData
      : createStudioTerrainRenderData(map);
    const style = resolveStudioTerrainWallShadowStyle(data, lighting);
    if (!style) return [];

    const sprites: Sprite[] = [];
    this.resetMorphologyRenderCaches();
    try {
      for (const feature of data.morphologyFeatures) {
        if (feature.kind !== "wall") continue;
        const parts = this.createTerrainWallRenderParts(data, feature);
        if (!parts) continue;
        const sprite = this.createWallShadowSprite(parts, feature, style);
        if (sprite) {
          sprites.push(sprite);
        }
      }
    } finally {
      this.resetMorphologyRenderCaches();
    }

    return sprites;
  }

  private resetMorphologyRenderCaches(): void {
    this.morphologyMaskCache = new WeakMap();
    this.terrainWallRenderPartsCache = new WeakMap();
    this.terrainHoleRenderPartsCache = new WeakMap();
    this.morphologyColorOverlayCache = new WeakMap();
    this.morphologyTextureFillCache = new WeakMap();
    this.morphologyCanvasIds = new WeakMap();
    this.nextMorphologyCanvasId = 1;
    this.morphologyClipBounds = null;
    resetTerrainMorphologyFeatureMetricsCache();
  }

  private renderChunk(
    key: string,
    data: StudioTerrainRenderData,
    image: HTMLImageElement | null,
    controlImage: HTMLImageElement | null,
    bounds: { x: number; y: number; width: number; height: number },
    collisions: StudioCollisionPolygon[],
    splitWallForeground: boolean
  ): void {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(bounds.width));
    canvas.height = Math.max(1, Math.ceil(bounds.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.translate(-bounds.x, -bounds.y);
    const renderedControlTerrain = this.drawTerrainControlTexture(ctx, data, image, controlImage, bounds);
    if (!renderedControlTerrain) {
      this.drawBaseTerrain(ctx, data, image, bounds);
      this.drawTerrainTransitions(ctx, data, bounds);
    }
    this.drawMorphology(ctx, data, image, bounds, splitWallForeground);
    this.drawDebugCollisions(ctx, collisions, bounds);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const texture = Texture.from(canvas);
    setNearestTextureScale(texture);
    const sprite = new Sprite(texture);
    sprite.x = Math.round(bounds.x);
    sprite.y = Math.round(bounds.y);
    sprite.zIndex = 0;
    sprite.roundPixels = true;
    sprite.cullable = true;
    sprite.cullArea = new Rectangle(0, 0, bounds.width, bounds.height);
    const waterOverlay = this.createWaterOverlay(data, controlImage, bounds, canvas);

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

  private drawBaseTerrain(
    ctx: CanvasRenderingContext2D,
    data: StudioTerrainRenderData,
    image: HTMLImageElement | null,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    const tileSize = data.tileSize;
    const minTileX = Math.max(0, Math.floor(bounds.x / tileSize));
    const minTileY = Math.max(0, Math.floor(bounds.y / tileSize));
    const maxTileX = Math.min(data.widthTiles - 1, Math.floor((bounds.x + bounds.width) / tileSize));
    const maxTileY = Math.min(data.heightTiles - 1, Math.floor((bounds.y + bounds.height) / tileSize));

    for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
        const cell = data.terrainGrid[tileY]?.[tileX];
        if (cell?.source === "tile-atlas" && image) {
          if (
            this.drawTerrainAtlasTile(
              ctx,
              data,
              image,
              cell.tileId ?? cell.textureIndex,
              tileX * tileSize,
              tileY * tileSize,
              tileSize,
              tileSize
            )
          ) {
            continue;
          }
        }
        const texture = findTerrainTexture(data.asset, cell?.terrainTextureId ?? cell?.textureIndex);
        if (!texture && !image) {
          this.fillTerrainRect(
            ctx,
            data,
            image,
            cell?.terrainTextureId ?? `terrain-${cell?.textureIndex ?? 0}`,
            tileX * tileSize,
            tileY * tileSize,
            tileSize,
            tileSize
          );
          continue;
        }
        this.fillTerrainRect(
          ctx,
          data,
          image,
          texture?.id ?? cell?.terrainTextureId ?? "terrain-0",
          tileX * tileSize,
          tileY * tileSize,
          tileSize,
          tileSize
        );
      }
    }
  }

  private drawTerrainTransitions(
    ctx: CanvasRenderingContext2D,
    data: StudioTerrainRenderData,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    const tileSize = data.tileSize;
    const minTileX = Math.max(0, Math.floor(bounds.x / tileSize) - 1);
    const minTileY = Math.max(0, Math.floor(bounds.y / tileSize) - 1);
    const maxTileX = Math.min(data.widthTiles - 1, Math.floor((bounds.x + bounds.width) / tileSize) + 1);
    const maxTileY = Math.min(data.heightTiles - 1, Math.floor((bounds.y + bounds.height) / tileSize) + 1);

    for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
        const cell = data.terrainGrid[tileY]?.[tileX];
        if (!cell) continue;
        if (cell.source === "tile-atlas") continue;
        const texture = findTerrainTexture(data.asset, cell.terrainTextureId);
        const mode = getTerrainRenderMode(texture);
        const fadeWidth = mode.type === "fade" ? Math.max(1, Number(mode.width ?? 18)) : 0;
        if (mode.type === "hard" || fadeWidth <= 0) continue;

        const x = tileX * tileSize;
        const y = tileY * tileSize;
        const neighbors = [
          { dx: 0, dy: -1, edge: "top" },
          { dx: 1, dy: 0, edge: "right" },
          { dx: 0, dy: 1, edge: "bottom" },
          { dx: -1, dy: 0, edge: "left" },
        ] as const;
        for (const neighbor of neighbors) {
          const other = data.terrainGrid[tileY + neighbor.dy]?.[tileX + neighbor.dx];
          if (!other || other.terrainTextureId === cell.terrainTextureId) continue;
          this.drawFadeEdge(ctx, x, y, tileSize, fadeWidth, neighbor.edge);
        }
      }
    }
  }

  private drawMorphology(
    ctx: CanvasRenderingContext2D,
    data: StudioTerrainRenderData,
    image: HTMLImageElement | null,
    bounds: { x: number; y: number; width: number; height: number },
    splitWallForeground: boolean
  ): void {
    this.morphologyClipBounds = bounds;
    try {
      for (const feature of data.morphologyFeatures) {
        if (!featureIntersectsBounds(feature, bounds)) continue;
        if (feature.kind === "hole") {
          this.drawHole(ctx, data, image, feature);
        } else {
          if (splitWallForeground) {
            continue;
          } else {
            this.drawWall(ctx, data, image, feature);
          }
        }
      }
    } finally {
      this.morphologyClipBounds = null;
    }
  }

  private drawTerrainControlTexture(
    ctx: CanvasRenderingContext2D,
    data: StudioTerrainRenderData,
    image: HTMLImageElement | null,
    controlImage: HTMLImageElement | null,
    bounds: { x: number; y: number; width: number; height: number }
  ): boolean {
    const control = data.terrainControl;
    if (!control || !data.asset || !image || control.palette.length === 0) {
      return false;
    }

    const controlBuffer = this.getTerrainControlBuffer(control, controlImage);
    if (!controlBuffer) return false;

    const layers = createTerrainControlRenderLayers(data.asset, control.palette);
    if (layers.length === 0) return false;

    const margin = Math.ceil(Math.max(24, ...layers.map((layer) => layer.blendRadius + 8)));
    const renderBounds = intersectBounds(
      {
        x: Math.floor(bounds.x - margin),
        y: Math.floor(bounds.y - margin),
        width: Math.ceil(bounds.width + margin * 2),
        height: Math.ceil(bounds.height + margin * 2),
      },
      { x: 0, y: 0, width: control.width, height: control.height }
    );
    if (!renderBounds) return false;

    const width = Math.max(1, Math.ceil(renderBounds.width));
    const height = Math.max(1, Math.ceil(renderBounds.height));
    const composites: TerrainCompositeLayer[] = [];

    for (const layer of layers) {
      const rawMask = this.buildTerrainControlRawMask(controlBuffer, control, layer.paletteIndex, renderBounds);
      const softMask = this.buildTerrainControlMaskFromRaw(rawMask, layer.blendRadius);
      this.applyHardTerrainControlCutouts(softMask, controlBuffer, control, data.asset, layers, layer, renderBounds);

      const fill = this.createCanvasBuffer(width, height, true);
      if (!this.fillTerrainPatternInBounds(fill.ctx, data, image, layer.terrainTextureId, renderBounds)) {
        fill.ctx.fillStyle = fallbackTerrainColor(layer.terrainTextureId);
        fill.ctx.fillRect(0, 0, width, height);
      }

      composites.push({
        pixels: fill.ctx.getImageData(0, 0, width, height).data,
        mask: softMask.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, width, height).data,
      });
    }

    if (composites.length === 0) return false;

    const output = this.createCanvasBuffer(width, height);
    const imageData = output.ctx.createImageData(width, height);
    imageData.data.set(composeTerrainLayerPixels(width, height, composites));
    output.ctx.putImageData(imageData, 0, 0);
    this.drawTerrainLayerEffects(output, control, layers, renderBounds);

    ctx.drawImage(output.canvas, renderBounds.x, renderBounds.y);
    return true;
  }

  private buildTerrainControlRawMask(
    controlBuffer: ImageBuffer,
    control: StudioTerrainControlTexture,
    paletteIndex: number,
    bounds: { x: number; y: number; width: number; height: number }
  ): HTMLCanvasElement {
    const width = Math.max(1, Math.ceil(bounds.width));
    const height = Math.max(1, Math.ceil(bounds.height));
    const buffer = this.createCanvasBuffer(width, height);
    const imageData = buffer.ctx.createImageData(width, height);
    const targetR = paletteIndex % 256;
    const targetG = Math.floor(paletteIndex / 256);
    const scaleX = controlBuffer.width / Math.max(1, control.width);
    const scaleY = controlBuffer.height / Math.max(1, control.height);

    for (let y = 0; y < height; y += 1) {
      const sampleY = clampInteger(Math.floor((bounds.y + y) * scaleY), 0, controlBuffer.height - 1);
      for (let x = 0; x < width; x += 1) {
        const sampleX = clampInteger(Math.floor((bounds.x + x) * scaleX), 0, controlBuffer.width - 1);
        const sourceOffset = (sampleY * controlBuffer.width + sampleX) * 4;
        if (
          controlBuffer.data[sourceOffset] !== targetR ||
          controlBuffer.data[sourceOffset + 1] !== targetG ||
          controlBuffer.data[sourceOffset + 3] <= 0
        ) {
          continue;
        }

        const targetOffset = (y * width + x) * 4;
        imageData.data[targetOffset] = 255;
        imageData.data[targetOffset + 1] = 255;
        imageData.data[targetOffset + 2] = 255;
        imageData.data[targetOffset + 3] = controlBuffer.data[sourceOffset + 3];
      }
    }

    buffer.ctx.putImageData(imageData, 0, 0);
    return buffer.canvas;
  }

  private buildTerrainControlMaskFromRaw(rawMask: HTMLCanvasElement, blur: number): HTMLCanvasElement {
    const mask = this.createCanvasBuffer(rawMask.width, rawMask.height, true);
    const radius = Math.max(0, Math.round(blur));
    if (radius <= 0) {
      mask.ctx.drawImage(rawMask, 0, 0);
      return mask.canvas;
    }

    mask.ctx.save();
    mask.ctx.filter = `blur(${radius}px)`;
    mask.ctx.drawImage(rawMask, 0, 0);
    mask.ctx.restore();
    return mask.canvas;
  }

  private applyHardTerrainControlCutouts(
    mask: HTMLCanvasElement,
    controlBuffer: ImageBuffer,
    control: StudioTerrainControlTexture,
    asset: TerrainAssetMetadata,
    layers: TerrainControlRenderLayer[],
    layer: TerrainControlRenderLayer,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    const hardNeighborIds = resolveTransitionNeighborIds(
      asset,
      layer.terrainTextureId,
      (mode) => mode.type === "hard"
    );
    if (hardNeighborIds.length === 0) return;

    const ctx = mask.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    for (const neighborId of hardNeighborIds) {
      const neighbor = layers.find((candidate) => candidate.terrainTextureId === neighborId);
      if (!neighbor) continue;
      ctx.drawImage(this.buildTerrainControlRawMask(controlBuffer, control, neighbor.paletteIndex, bounds), 0, 0);
    }
    ctx.restore();
  }

  private fillTerrainPatternInBounds(
    ctx: CanvasRenderingContext2D,
    data: StudioTerrainRenderData,
    image: HTMLImageElement | null,
    textureId: string,
    bounds: { x: number; y: number; width: number; height: number }
  ): boolean {
    const pattern = this.getPattern(ctx, data, image, textureId);
    if (!pattern) return false;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = pattern;
    ctx.translate(-bounds.x, -bounds.y);
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.restore();
    return true;
  }

  private drawTerrainLayerEffects(
    output: CanvasBuffer,
    control: StudioTerrainControlTexture,
    layers: TerrainControlRenderLayer[],
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    for (const layer of layers) {
      if (layer.mode.type !== "water" && !isWaterTerrainTexture(null, layer.terrainTextureId)) {
        continue;
      }

      const edge = this.createTerrainControlLayerEdgeMask(output, control, layer.paletteIndex, bounds, 6);
      if (!edge) continue;
      const gradient = output.ctx.createLinearGradient(0, 0, 0, output.canvas.height);
      gradient.addColorStop(0, "rgba(180, 235, 255, 0.18)");
      gradient.addColorStop(0.55, "rgba(89, 161, 185, 0.08)");
      gradient.addColorStop(1, "rgba(20, 48, 61, 0.22)");
      const overlay = this.createCanvasBuffer(output.canvas.width, output.canvas.height);
      overlay.ctx.fillStyle = gradient;
      overlay.ctx.fillRect(0, 0, overlay.canvas.width, overlay.canvas.height);
      overlay.ctx.save();
      overlay.ctx.globalCompositeOperation = "destination-in";
      overlay.ctx.drawImage(edge, 0, 0);
      overlay.ctx.restore();
      output.ctx.save();
      output.ctx.globalCompositeOperation = "screen";
      output.ctx.globalAlpha = 0.42;
      output.ctx.drawImage(overlay.canvas, 0, 0);
      output.ctx.restore();
    }
  }

  private createWaterOverlay(
    data: StudioTerrainRenderData,
    controlImage: HTMLImageElement | null,
    bounds: { x: number; y: number; width: number; height: number },
    surface: HTMLCanvasElement
  ): TerrainWaterOverlay | null {
    const holeRegions: TerrainWaterRegion[] = [];
    const holeMasks: Array<Pick<TerrainWaterRegion, "mask" | "bounds">> = [];

    const filledHoles = resolveTerrainHoleWaveDescriptors(
      data.morphologyFeatures,
      data.waterAnimation
    );
    for (const { feature, options } of filledHoles) {
      if (!featureIntersectsBounds(feature, bounds)) continue;
      const parts = this.createTerrainHoleRenderParts(data, feature);
      if (!parts) continue;
      const geometry = resolveTerrainHoleFillGeometry(parts.mask, feature, parts.depth);
      if (!geometry) continue;

      const projectedMask = this.createTerrainMorphologyProjectedLevelMask(
        parts.mask,
        geometry.inset,
        geometry.dropY
      );
      const projectedAlphaBounds = resolveWaterMaskAlphaBounds(projectedMask.canvas);
      if (!projectedAlphaBounds) continue;
      const intersection = resolveWaterMaskChunkIntersection(
        projectedMask.bounds,
        projectedAlphaBounds,
        bounds
      );
      if (!intersection) continue;

      const mask = this.createCanvasBuffer(
        intersection.bounds.width,
        intersection.bounds.height,
        true
      );
      mask.ctx.drawImage(
        projectedMask.canvas,
        intersection.sourceX,
        intersection.sourceY,
        intersection.bounds.width,
        intersection.bounds.height,
        0,
        0,
        intersection.bounds.width,
        intersection.bounds.height
      );
      const regionMask = { mask: mask.canvas, bounds: intersection.bounds };
      if (data.waterAnimation.enabled) holeMasks.push(regionMask);

      if (!isTerrainWaveAnimated(options)) continue;
      holeRegions.push({
        ...regionMask,
        phase: 0,
        ...options,
        seed: terrainMorphologyNoise(stableStringHash(feature.id) * 0.013, 0, 19),
      });
    }

    const terrainMask = data.waterAnimation.enabled
      ? data.terrainControl
        ? this.createTerrainControlWaterMask(data, controlImage, bounds)
        : this.createTerrainGridWaterMask(data, bounds)
      : null;
    const regions: TerrainWaterRegion[] = [];
    const mapOptions = resolveTerrainWaveOptions(data.waterAnimation);
    if (terrainMask) {
      const terrainMaskCtx = terrainMask.getContext("2d");
      if (terrainMaskCtx) {
        terrainMaskCtx.save();
        terrainMaskCtx.globalCompositeOperation = "destination-out";
        for (const holeMask of holeMasks) {
          terrainMaskCtx.drawImage(
            holeMask.mask,
            holeMask.bounds.x,
            holeMask.bounds.y
          );
        }
        terrainMaskCtx.restore();
      }
      const alphaBounds = resolveWaterMaskAlphaBounds(terrainMask);
      if (alphaBounds && isTerrainWaveAnimated(mapOptions)) {
        regions.push({
          mask: cropCanvasMask(terrainMask, alphaBounds),
          bounds: alphaBounds,
          phase: 0,
          ...mapOptions,
          seed: 0,
        });
      }
    }
    regions.push(...holeRegions);
    if (regions.length === 0) return null;

    const overlayBounds = unionBounds(regions.map((region) => region.bounds));
    if (!overlayBounds) return null;
    const localRegions = regions.map((region) => ({
      ...region,
      bounds: {
        ...region.bounds,
        x: region.bounds.x - overlayBounds.x,
        y: region.bounds.y - overlayBounds.y,
      },
    }));
    const croppedSurface = this.createCanvasBuffer(overlayBounds.width, overlayBounds.height, true);
    croppedSurface.ctx.drawImage(
      surface,
      overlayBounds.x,
      overlayBounds.y,
      overlayBounds.width,
      overlayBounds.height,
      0,
      0,
      overlayBounds.width,
      overlayBounds.height
    );
    const canvas = this.createCanvasBuffer(overlayBounds.width, overlayBounds.height, true);
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
      frame: this.createCanvasBuffer(overlayBounds.width, overlayBounds.height, true),
      waveMask: this.createCanvasBuffer(overlayBounds.width, overlayBounds.height, true),
      surface: croppedSurface.canvas,
      texture,
      sprite,
      regions: localRegions,
      originX: bounds.x + overlayBounds.x,
      originY: bounds.y + overlayBounds.y,
    };
    drawWaterAnimationFrame(overlay);
    updateCanvasTexture(texture);
    return overlay;
  }

  private createTerrainGridWaterMask(
    data: StudioTerrainRenderData,
    bounds: { x: number; y: number; width: number; height: number }
  ): HTMLCanvasElement | null {
    const tileSize = data.tileSize;
    const minTileX = Math.max(0, Math.floor(bounds.x / tileSize));
    const minTileY = Math.max(0, Math.floor(bounds.y / tileSize));
    const maxTileX = Math.min(data.widthTiles - 1, Math.floor((bounds.x + bounds.width) / tileSize));
    const maxTileY = Math.min(data.heightTiles - 1, Math.floor((bounds.y + bounds.height) / tileSize));
    const mask = this.createCanvasBuffer(bounds.width, bounds.height, true);
    let hasWater = false;

    mask.ctx.fillStyle = "#ffffff";
    for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
        const cell = data.terrainGrid[tileY]?.[tileX];
        if (!cell || !isWaterTerrainTexture(data.asset, cell.terrainTextureId ?? cell.textureIndex)) continue;
        hasWater = true;
        mask.ctx.fillRect(
          tileX * tileSize - bounds.x,
          tileY * tileSize - bounds.y,
          tileSize,
          tileSize
        );
      }
    }

    return hasWater ? mask.canvas : null;
  }

  private createTerrainControlWaterMask(
    data: StudioTerrainRenderData,
    controlImage: HTMLImageElement | null,
    bounds: { x: number; y: number; width: number; height: number }
  ): HTMLCanvasElement | null {
    const control = data.terrainControl;
    if (!control || !data.asset) return null;
    const controlBuffer = this.getTerrainControlBuffer(control, controlImage);
    if (!controlBuffer) return null;
    const layers = createTerrainControlRenderLayers(data.asset, control.palette)
      .filter((layer) => layer.mode.type === "water" || isWaterTerrainTexture(data.asset, layer.terrainTextureId));
    if (layers.length === 0) return null;

    const mask = this.createCanvasBuffer(bounds.width, bounds.height, true);
    for (const layer of layers) {
      mask.ctx.drawImage(
        this.buildTerrainControlRawMask(controlBuffer, control, layer.paletteIndex, bounds),
        0,
        0
      );
    }
    return mask.canvas;
  }

  private createTerrainControlLayerEdgeMask(
    output: CanvasBuffer,
    control: StudioTerrainControlTexture,
    paletteIndex: number,
    bounds: { x: number; y: number; width: number; height: number },
    blur: number
  ): HTMLCanvasElement | null {
    if (output.canvas.width <= 0 || output.canvas.height <= 0) return null;
    const controlImage = control.source
      ? this.loadedImages.get(control.source) ?? null
      : null;
    const controlBuffer = this.getTerrainControlBuffer(control, controlImage);
    if (!controlBuffer) return null;
    const rawMask = this.buildTerrainControlRawMask(controlBuffer, control, paletteIndex, bounds);
    const edge = this.createCanvasBuffer(rawMask.width, rawMask.height);
    edge.ctx.save();
    edge.ctx.filter = `blur(${Math.max(1, Math.round(blur))}px)`;
    edge.ctx.drawImage(rawMask, 0, 0);
    edge.ctx.restore();
    edge.ctx.save();
    edge.ctx.globalCompositeOperation = "destination-out";
    edge.ctx.drawImage(rawMask, 0, 0);
    edge.ctx.restore();
    return edge.canvas;
  }

  private drawHole(
    ctx: CanvasRenderingContext2D,
    data: StudioTerrainRenderData,
    image: HTMLImageElement | null,
    feature: StudioTerrainMorphologyFeature
  ): void {
    const parts = this.createTerrainHoleRenderParts(data, feature);
    if (!parts) return;

    this.drawTerrainMorphologyMaskedColor(
      ctx,
      parts.mask,
      "#070604",
      0.58 - parts.smoothness * 0.12,
      "source-over",
      parts.smoothness > 0.6 ? "blur(1px)" : "blur(2px)"
    );
    this.drawTerrainMorphologyMaskedColor(
      ctx,
      parts.mask,
      "#020201",
      0.34 - parts.smoothness * 0.08,
      "multiply",
      "blur(7px)",
      0,
      Math.round(parts.depth * 0.28)
    );

    this.drawTerrainMorphologyTextureFill(ctx, parts.softFaceMask, stringParam(feature.params.textureId), data, image, "#2d251f", 1);
    this.drawTerrainMorphologySideDepthShading(ctx, parts.faceMask, parts.leftEdge, parts.rightEdge, feature, "recessed");
    this.drawTerrainMorphologyDepthBands(ctx, parts.topEdge, feature);
    this.drawTerrainMorphologyMaskedColor(ctx, parts.topEdge, "#080604", 0.58 - parts.smoothness * 0.12, "multiply", "blur(1px)", 0, 3);
    this.drawTerrainMorphologyMaskedColor(ctx, parts.bottomEdge, "#f4dfb1", 0.16 + parts.smoothness * 0.04, "screen", "none", 0, -1);
    this.drawTerrainMorphologyMaskedColor(ctx, parts.leftEdge, "#e7cca0", 0.13 - parts.smoothness * 0.03, "screen", "blur(1px)", -2, 0);
    this.drawTerrainMorphologyMaskedColor(ctx, parts.rightEdge, "#080604", 0.34 - parts.smoothness * 0.08, "multiply", "blur(1px)", 3, 0);
    this.drawTerrainHoleFillMorphology(ctx, parts.mask, feature, data, image);
  }

  private drawWall(
    ctx: CanvasRenderingContext2D,
    data: StudioTerrainRenderData,
    image: HTMLImageElement | null,
    feature: StudioTerrainMorphologyFeature
  ): void {
    const parts = this.createTerrainWallRenderParts(data, feature);
    if (!parts) return;

    this.drawWallBase(ctx, data, image, feature, parts);
    this.drawWallForeground(ctx, data, image, feature, parts);
  }

  private drawWallBase(
    ctx: CanvasRenderingContext2D,
    data: StudioTerrainRenderData,
    image: HTMLImageElement | null,
    feature: StudioTerrainMorphologyFeature,
    parts = this.createTerrainWallRenderParts(data, feature)
  ): void {
    if (!parts) return;
    this.drawTerrainMorphologyTextureFill(
      ctx,
      parts.mask,
      stringParam(feature.params.surfaceTextureId),
      data,
      image,
      "#050505",
      stringParam(feature.params.surfaceTextureId) ? 0.92 : 0
    );
  }

  private drawWallForeground(
    ctx: CanvasRenderingContext2D,
    data: StudioTerrainRenderData,
    image: HTMLImageElement | null,
    feature: StudioTerrainMorphologyFeature,
    parts = this.createTerrainWallRenderParts(data, feature)
  ): void {
    if (!parts) return;
    this.drawTerrainMorphologyMaskedColor(
      ctx,
      parts.faceMask,
      "#17110d",
      0.38 - parts.smoothness * 0.08,
      "multiply",
      parts.smoothness > 0.6 ? "blur(4px)" : "blur(5px)",
      0,
      7
    );
    this.drawTerrainMorphologyTextureFill(ctx, parts.faceMask, stringParam(feature.params.textureId), data, image, "#7d6f58", 0.86);
    this.drawTerrainMorphologySideDepthShading(ctx, parts.faceMask, parts.leftEdge, parts.rightEdge, feature, "raised");
    this.drawTerrainMorphologyDepthBands(ctx, parts.bottomEdge, feature);
    this.drawTerrainMorphologyMaskedColor(ctx, parts.bottomEdge, "#090705", 0.48 - parts.smoothness * 0.12, "multiply", "blur(1px)", 0, 3);
    this.drawTerrainMorphologyMaskedColor(ctx, parts.leftEdge, "#f0dbad", 0.18 - parts.smoothness * 0.05, "screen", "blur(1px)", -3, 0);
    this.drawTerrainMorphologyMaskedColor(ctx, parts.rightEdge, "#100c09", 0.34 - parts.smoothness * 0.1, "multiply", "blur(1px)", 4, 0);
    this.drawTerrainMorphologyMaskedColor(ctx, parts.faceMask, "#0f0b08", 0.34 - parts.smoothness * 0.08, "multiply", "blur(2px)", 0, parts.height - 2);
    this.drawTerrainMorphologyElevationRiserLines(ctx, parts.topEdge, parts.faceMask, feature);
    this.drawTerrainMorphologyMaskedColor(ctx, parts.bottomEdge, "#f0dfb9", 0.11 + parts.smoothness * 0.05, "screen", "none", 0, -1);
    this.drawTerrainMorphologyMaskedColor(ctx, parts.bottomEdge, "#211812", 0.5 - parts.smoothness * 0.12, "multiply", "none", 0, 2);
    this.drawTerrainMorphologyMaskedColor(ctx, parts.bottomEdge, "#120d09", 0.58 - parts.smoothness * 0.12, "multiply", "none", 0, parts.height);
  }

  private createTerrainWallRenderParts(
    data: StudioTerrainRenderData,
    feature: StudioTerrainMorphologyFeature
  ): TerrainWallRenderParts | null {
    if (this.terrainWallRenderPartsCache.has(feature)) {
      return this.terrainWallRenderPartsCache.get(feature) ?? null;
    }

    const mask = this.buildTerrainMorphologyMask(data, feature);
    if (!mask) {
      this.terrainWallRenderPartsCache.set(feature, null);
      return null;
    }

    const smoothness = getTerrainMorphologySmoothness(feature);
    const height = getTerrainMorphologyHeight(feature);
    const topEdge = this.createTerrainMorphologyDirectionalEdgeMask(mask, "top", Math.round(12 - smoothness * 4));
    const bottomEdge = this.createTerrainMorphologyDirectionalEdgeMask(mask, "bottom", Math.round(13 - smoothness * 5));
    const faceMask = this.createTerrainMorphologyExtrudedFaceMask(bottomEdge, feature);
    const leftEdge = this.createTerrainMorphologyDirectionalEdgeMask(faceMask, "left", Math.round(16 - smoothness * 6));
    const rightEdge = this.createTerrainMorphologyDirectionalEdgeMask(faceMask, "right", Math.round(16 - smoothness * 6));

    const parts = {
      mask,
      topEdge,
      bottomEdge,
      faceMask,
      leftEdge,
      rightEdge,
      smoothness,
      height,
    };
    this.terrainWallRenderPartsCache.set(feature, parts);
    return parts;
  }

  private createTerrainHoleRenderParts(
    data: StudioTerrainRenderData,
    feature: StudioTerrainMorphologyFeature
  ): TerrainHoleRenderParts | null {
    if (this.terrainHoleRenderPartsCache.has(feature)) {
      return this.terrainHoleRenderPartsCache.get(feature) ?? null;
    }

    const mask = this.buildTerrainMorphologyMask(data, feature);
    if (!mask) {
      this.terrainHoleRenderPartsCache.set(feature, null);
      return null;
    }

    const smoothness = getTerrainMorphologySmoothness(feature);
    const topEdge = this.createTerrainMorphologyDirectionalEdgeMask(mask, "top", Math.round(13 - smoothness * 5));
    const bottomEdge = this.createTerrainMorphologyDirectionalEdgeMask(mask, "bottom", Math.round(11 - smoothness * 4));
    const leftEdge = this.createTerrainMorphologyDirectionalEdgeMask(mask, "left", Math.round(15 - smoothness * 5));
    const rightEdge = this.createTerrainMorphologyDirectionalEdgeMask(mask, "right", Math.round(15 - smoothness * 5));
    const faceMask = this.createTerrainMorphologyExtrudedFaceMask(topEdge, feature);
    this.clipTerrainMorphologyMask(faceMask, mask);
    const softFaceMask = this.createTerrainMorphologySoftMask(faceMask, smoothness > 0.6 ? 2 : 3, mask);
    const parts = {
      mask,
      topEdge,
      bottomEdge,
      faceMask,
      softFaceMask,
      leftEdge,
      rightEdge,
      smoothness,
      depth: getTerrainMorphologyHeight(feature),
    };
    this.terrainHoleRenderPartsCache.set(feature, parts);
    return parts;
  }

  private createWallOcclusionSliceSprites(
    canvas: HTMLCanvasElement,
    mask: TerrainMorphologyMaskBuffer,
    feature: StudioTerrainMorphologyFeature,
    sliceWidth: number
  ): Sprite[] {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [];

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const sprites: Sprite[] = [];

    for (let sliceX = 0; sliceX < canvas.width; sliceX += sliceWidth) {
      const width = Math.min(sliceWidth, canvas.width - sliceX);
      const bands = findAlphaBands(imageData, canvas.width, canvas.height, {
        x: sliceX,
        y: 0,
        width,
        height: canvas.height,
      });

      bands.forEach((band, bandIndex) => {
        const alphaBounds = findAlphaBounds(imageData, canvas.width, canvas.height, {
          x: sliceX,
          y: band.y,
          width,
          height: band.height,
        });
        if (!alphaBounds) return;

        const slice = this.createCanvasBuffer(alphaBounds.width, alphaBounds.height, true);
        slice.ctx.drawImage(
          canvas,
          alphaBounds.x,
          alphaBounds.y,
          alphaBounds.width,
          alphaBounds.height,
          0,
          0,
          alphaBounds.width,
          alphaBounds.height
        );

        const texture = Texture.from(slice.canvas);
        setNearestTextureScale(texture);
        const sprite = new Sprite(texture);
        sprite.x = Math.round(mask.bounds.x + alphaBounds.x);
        sprite.y = Math.round(mask.bounds.y + alphaBounds.y);
        sprite.zIndex = Math.round(mask.bounds.y + alphaBounds.y + alphaBounds.height);
        sprite.roundPixels = true;
        sprite.cullable = true;
        sprite.cullArea = new Rectangle(0, 0, alphaBounds.width, alphaBounds.height);
        sprite.label = `StudioWallOcclusion:${feature.id}:${sliceX}:${bandIndex}`;
        sprites.push(sprite);
      });
    }

    return sprites;
  }

  private createWallShadowSprite(
    parts: TerrainWallRenderParts,
    feature: StudioTerrainMorphologyFeature,
    style: StudioTerrainWallShadowStyle
  ): Sprite | null {
    const mask = parts.mask;
    const baseEdge = this.createTerrainMorphologyDirectionalEdgeMask(parts.faceMask, "bottom", 10);
    const spreadX = Math.ceil(Math.abs(style.offsetX) + style.blur * 2);
    const spreadY = Math.ceil(Math.abs(style.offsetY) + style.blur * 2 + 12);
    const canvas = this.createCanvasBuffer(
      Math.max(1, mask.canvas.width + spreadX * 2),
      Math.max(1, mask.canvas.height + spreadY * 2),
      true
    );
    const originX = spreadX;
    const originY = spreadY;

    canvas.ctx.save();
    canvas.ctx.globalAlpha = style.alpha * 1.35;
    for (let y = 0; y <= 5; y += 1) {
      canvas.ctx.drawImage(baseEdge.canvas, originX, originY + y);
    }
    canvas.ctx.restore();

    canvas.ctx.save();
    canvas.ctx.filter = `blur(${style.blur}px)`;
    for (let step = 1; step <= 5; step += 1) {
      const ratio = step / 5;
      canvas.ctx.globalAlpha = style.alpha * (0.58 - ratio * 0.32);
      canvas.ctx.drawImage(
        baseEdge.canvas,
        originX + style.offsetX * ratio,
        originY + 4 + style.offsetY * ratio
      );
    }
    canvas.ctx.restore();

    canvas.ctx.globalCompositeOperation = "source-in";
    canvas.ctx.fillStyle = style.color;
    canvas.ctx.fillRect(0, 0, canvas.canvas.width, canvas.canvas.height);
    canvas.ctx.globalCompositeOperation = "source-over";

    const texture = Texture.from(canvas.canvas);
    const sprite = new Sprite(texture);
    sprite.x = Math.round(mask.bounds.x - originX);
    sprite.y = Math.round(mask.bounds.y - originY);
    sprite.zIndex = 0;
    sprite.roundPixels = true;
    sprite.eventMode = "none";
    sprite.cullable = true;
    sprite.cullArea = new Rectangle(0, 0, canvas.canvas.width, canvas.canvas.height);
    sprite.label = `StudioWallShadow:${feature.id}`;
    return sprite;
  }

  private buildTerrainMorphologyMask(
    data: StudioTerrainRenderData,
    feature: StudioTerrainMorphologyFeature
  ): TerrainMorphologyMaskBuffer | null {
    if (this.morphologyMaskCache.has(feature)) {
      return this.morphologyMaskCache.get(feature) ?? null;
    }

    const bounds = getTerrainMorphologyBounds(data, feature, Math.max(40, getTerrainMorphologyHeight(feature) + 24));
    if (!bounds) {
      this.morphologyMaskCache.set(feature, null);
      return null;
    }

    const mask = this.createCanvasBuffer(Math.max(1, Math.ceil(bounds.width)), Math.max(1, Math.ceil(bounds.height)), true);
    if (feature.operations?.length) {
      for (const operation of feature.operations) {
        if (operation.mode === "erase") {
          mask.ctx.save();
          mask.ctx.globalCompositeOperation = "destination-out";
          this.drawTerrainMorphologyEraserStrokeMask(mask.ctx, operation.stroke, feature.params, bounds.x, bounds.y);
          mask.ctx.restore();
        } else {
          this.drawStructuredTerrainMorphologyStrokeMask(mask.ctx, operation.stroke, feature.params, bounds.x, bounds.y);
        }
      }
    } else {
      for (const stroke of feature.strokes) {
        this.drawStructuredTerrainMorphologyStrokeMask(mask.ctx, stroke, feature.params, bounds.x, bounds.y);
      }

      if (feature.eraserStrokes?.length) {
        mask.ctx.save();
        mask.ctx.globalCompositeOperation = "destination-out";
        for (const stroke of feature.eraserStrokes) {
          this.drawTerrainMorphologyEraserStrokeMask(mask.ctx, stroke, feature.params, bounds.x, bounds.y);
        }
        mask.ctx.restore();
      }
    }

    const result: TerrainMorphologyMaskBuffer = { canvas: mask.canvas, bounds };
    const alphaBounds = getTerrainMorphologyLocalMaskBounds(result);
    const cached = alphaBounds ? { ...result, alphaBounds } : null;
    this.morphologyMaskCache.set(feature, cached);
    return cached;
  }

  private drawStructuredTerrainMorphologyStrokeMask(
    ctx: CanvasRenderingContext2D,
    stroke: StudioTerrainMorphologyFeature["strokes"][number],
    params: StudioTerrainMorphologyFeature["params"],
    offsetX: number,
    offsetY: number
  ): void {
    if (stroke.points.length === 0) return;

    const smoothness = getTerrainMorphologySmoothnessFromParams(params);
    const radius = Math.max(1, Number(stroke.radius) || 1);
    const spacing = Math.max(12, radius * (0.32 + smoothness * 0.14));

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#fff";

    const stamp = (x: number, y: number): void => {
      this.drawStructuredTerrainMorphologyStamp(ctx, x - offsetX, y - offsetY, radius, params);
    };

    for (let pointIndex = 0; pointIndex < stroke.points.length; pointIndex += 1) {
      const point = stroke.points[pointIndex];
      const previous = stroke.points[pointIndex - 1];

      if (!previous) {
        if (isTerrainMorphologyPointNearLocalBounds(point, radius, offsetX, offsetY, ctx.canvas.width, ctx.canvas.height)) {
          stamp(point.x, point.y);
        }
        continue;
      }

      if (!isTerrainMorphologySegmentNearLocalBounds(previous, point, radius, offsetX, offsetY, ctx.canvas.width, ctx.canvas.height)) {
        continue;
      }

      const dx = point.x - previous.x;
      const dy = point.y - previous.y;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / spacing));
      for (let step = 1; step <= steps; step += 1) {
        const t = step / steps;
        stamp(previous.x + dx * t, previous.y + dy * t);
      }
    }

    ctx.restore();
  }

  private drawTerrainMorphologyEraserStrokeMask(
    ctx: CanvasRenderingContext2D,
    stroke: StudioTerrainMorphologyFeature["strokes"][number],
    params: StudioTerrainMorphologyFeature["params"],
    offsetX: number,
    offsetY: number
  ): void {
    if (stroke.points.length === 0) return;

    const smoothness = getTerrainMorphologySmoothnessFromParams(params);
    const radius = Math.max(1, Number(stroke.radius) || 1);
    const roughness = "height" in params
      ? Math.pow(1 - smoothness, 1.04) * 0.34
      : (1 - smoothness) * 0.3;
    const points = Math.round(38 + smoothness * 34);
    const spacing = Math.max(12, radius * (0.32 + smoothness * 0.14));

    ctx.save();
    ctx.fillStyle = "#fff";

    const stamp = (x: number, y: number): void => {
      drawTerrainMorphologyOrganicBlob(
        ctx,
        x - offsetX,
        y - offsetY,
        radius * (1 + roughness * 0.2),
        roughness,
        points
      );
      ctx.fill();
    };

    const hasSegment = stroke.points.some((point, index) => {
      const previous = stroke.points[index - 1];
      return !!previous && Math.hypot(point.x - previous.x, point.y - previous.y) > 0.001;
    });

    if (stroke.points.length === 1 || !hasSegment) {
      const point = stroke.points[0];
      stamp(point.x, point.y);
      ctx.restore();
      return;
    }

    stroke.points.forEach((point, index) => {
      if (index === 0) {
        stamp(point.x, point.y);
        return;
      }

      const previous = stroke.points[index - 1];
      if (!previous) return;

      const dx = point.x - previous.x;
      const dy = point.y - previous.y;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / spacing));
      for (let step = 1; step <= steps; step += 1) {
        const t = step / steps;
        stamp(previous.x + dx * t, previous.y + dy * t);
      }
    });
    ctx.restore();
  }

  private drawStructuredTerrainMorphologyStamp(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    params: StudioTerrainMorphologyFeature["params"]
  ): void {
    const smoothness = getTerrainMorphologySmoothnessFromParams(params);
    const roundness = clampNumber(Number(params.roundness), 0, 1);
    const roughness = (1 - smoothness) * 0.3;
    const points = Math.round(38 + smoothness * 34);
    const isHoleStamp = "depth" in params;
    const useStructuredStamp = !isHoleStamp && (smoothness > 0.62 || roundness < 0.28);
    const stampWidth = radius * (1.45 + roundness * 0.45);
    const stampHeight = radius * (1.18 + roundness * 0.72);
    const cornerRadius = Math.min(stampWidth, stampHeight) * 0.5 * roundness;

    if (useStructuredStamp) {
      drawTerrainMorphologyRoundRect(ctx, x - stampWidth * 0.5, y - stampHeight * 0.5, stampWidth, stampHeight, cornerRadius);
      ctx.fill();
      return;
    }

    drawTerrainMorphologyOrganicBlob(ctx, x, y, radius * (1 + roughness * 0.2), roughness, points);
    ctx.fill();
  }

  private drawTerrainMorphologyTextureFill(
    ctx: CanvasRenderingContext2D,
    mask: TerrainMorphologyMaskBuffer,
    terrainTextureId: string | undefined,
    data: StudioTerrainRenderData,
    image: HTMLImageElement | null,
    fallbackColor: string,
    alpha = 1
  ): void {
    if (alpha <= 0) return;

    const cacheKey = `${terrainTextureId ?? ""}|${fallbackColor}`;
    let cache = this.morphologyTextureFillCache.get(mask.canvas);
    if (!cache) {
      cache = new Map();
      this.morphologyTextureFillCache.set(mask.canvas, cache);
    }
    let fillCanvas = cache.get(cacheKey);
    if (!fillCanvas) {
      const fill = this.createCanvasBuffer(mask.canvas.width, mask.canvas.height);
      const isSolidBlack = terrainTextureId === SOLID_BLACK_TERRAIN_TEXTURE_ID;
      const pattern = !isSolidBlack && terrainTextureId
        ? this.getPattern(fill.ctx, data, image, terrainTextureId)
        : null;
      if (pattern) {
        fill.ctx.save();
        fill.ctx.imageSmoothingEnabled = false;
        fill.ctx.fillStyle = pattern;
        fill.ctx.translate(-mask.bounds.x, -mask.bounds.y);
        fill.ctx.fillRect(mask.bounds.x, mask.bounds.y, mask.bounds.width, mask.bounds.height);
        fill.ctx.restore();
      } else {
        fill.ctx.fillStyle = isSolidBlack ? "#050505" : fallbackColor;
        fill.ctx.fillRect(0, 0, mask.canvas.width, mask.canvas.height);
      }

      fill.ctx.save();
      fill.ctx.globalCompositeOperation = "destination-in";
      fill.ctx.drawImage(mask.canvas, 0, 0);
      fill.ctx.restore();
      fillCanvas = fill.canvas;
      cache.set(cacheKey, fillCanvas);
    }

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha;
    this.drawMorphologyCanvas(ctx, fillCanvas, mask.bounds);
    ctx.restore();
  }

  private drawTerrainMorphologyMaskedColor(
    ctx: CanvasRenderingContext2D,
    mask: TerrainMorphologyMaskBuffer,
    color: string,
    alpha: number,
    operation: GlobalCompositeOperation,
    filter = "none",
    offsetX = 0,
    offsetY = 0,
    clipMask: TerrainMorphologyMaskBuffer = mask
  ): void {
    if (alpha <= 0) return;

    const clipId = this.getMorphologyCanvasId(clipMask.canvas);
    const cacheKey = `${clipId}|${color}|${filter}|${offsetX}|${offsetY}`;
    let cache = this.morphologyColorOverlayCache.get(mask.canvas);
    if (!cache) {
      cache = new Map();
      this.morphologyColorOverlayCache.set(mask.canvas, cache);
    }
    let overlayCanvas = cache.get(cacheKey);
    if (!overlayCanvas) {
      const overlay = this.createCanvasBuffer(mask.canvas.width, mask.canvas.height);
      overlay.ctx.save();
      overlay.ctx.filter = filter;
      overlay.ctx.drawImage(mask.canvas, offsetX, offsetY);
      overlay.ctx.restore();
      overlay.ctx.save();
      overlay.ctx.globalCompositeOperation = "source-in";
      overlay.ctx.fillStyle = color;
      overlay.ctx.fillRect(0, 0, mask.canvas.width, mask.canvas.height);
      overlay.ctx.restore();
      overlay.ctx.save();
      overlay.ctx.globalCompositeOperation = "destination-in";
      overlay.ctx.drawImage(clipMask.canvas, 0, 0);
      overlay.ctx.restore();
      overlayCanvas = overlay.canvas;
      cache.set(cacheKey, overlayCanvas);
    }

    ctx.save();
    ctx.globalCompositeOperation = operation;
    ctx.globalAlpha = alpha;
    this.drawMorphologyCanvas(ctx, overlayCanvas, mask.bounds);
    ctx.restore();
  }

  private getMorphologyCanvasId(canvas: HTMLCanvasElement): number {
    const cached = this.morphologyCanvasIds.get(canvas);
    if (cached) return cached;
    const id = this.nextMorphologyCanvasId++;
    this.morphologyCanvasIds.set(canvas, id);
    return id;
  }

  private drawMorphologyCanvas(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    bounds: StudioTerrainRenderBounds
  ): void {
    const intersection = this.morphologyClipBounds
      ? intersectBounds(bounds, this.morphologyClipBounds)
      : bounds;
    if (!intersection) return;
    ctx.drawImage(
      canvas,
      intersection.x - bounds.x,
      intersection.y - bounds.y,
      intersection.width,
      intersection.height,
      intersection.x,
      intersection.y,
      intersection.width,
      intersection.height
    );
  }

  private drawTerrainMorphologyDepthBands(
    ctx: CanvasRenderingContext2D,
    edge: TerrainMorphologyMaskBuffer,
    feature: StudioTerrainMorphologyFeature
  ): void {
    const height = getTerrainMorphologyHeight(feature);
    const smoothness = getTerrainMorphologySmoothness(feature);
    const bandStep = Math.round(10 + smoothness * 5);

    for (let y = bandStep; y <= height; y += bandStep) {
      const depth = y / height;
      this.drawTerrainMorphologyMaskedColor(
        ctx,
        edge,
        "#15110d",
        0.11 - smoothness * 0.03 + depth * (0.16 - smoothness * 0.04),
        "multiply",
        smoothness > 0.6 ? "blur(2px)" : "blur(1px)",
        Math.round(Math.sin(y * 0.2) * (1 - smoothness) * 1.5),
        y
      );
    }
  }

  private drawTerrainMorphologySideDepthShading(
    ctx: CanvasRenderingContext2D,
    faceMask: TerrainMorphologyMaskBuffer,
    leftEdge: TerrainMorphologyMaskBuffer,
    rightEdge: TerrainMorphologyMaskBuffer,
    feature: StudioTerrainMorphologyFeature,
    mode: "raised" | "recessed"
  ): void {
    const height = getTerrainMorphologyHeight(feature);
    const smoothness = getTerrainMorphologySmoothness(feature);
    const step = Math.round(7 + smoothness * 5);
    const sideReach = Math.round(clampNumber(height * 0.045, 3, 8));
    const darkBase = mode === "raised" ? 0.12 : 0.16;
    const lightBase = mode === "raised" ? 0.08 : 0.1;

    for (let y = step; y <= height; y += step) {
      const depthRatio = y / height;
      const offsetY = mode === "raised" ? y : Math.round(y * 0.72);
      const sideOffset = Math.max(1, Math.round(sideReach * (0.55 + depthRatio * 0.45)));

      this.drawTerrainMorphologyMaskedColor(
        ctx,
        rightEdge,
        "#080604",
        darkBase + depthRatio * (0.18 - smoothness * 0.05),
        "multiply",
        smoothness > 0.62 ? "blur(2px)" : "blur(1px)",
        sideOffset,
        offsetY,
        faceMask
      );
      this.drawTerrainMorphologyMaskedColor(
        ctx,
        leftEdge,
        "#f4dfb4",
        lightBase + depthRatio * (0.08 - smoothness * 0.03),
        "screen",
        "blur(1px)",
        -Math.max(1, Math.round(sideOffset * 0.72)),
        offsetY,
        faceMask
      );
    }

    this.drawTerrainMorphologyMaskedColor(
      ctx,
      rightEdge,
      "#070504",
      mode === "raised" ? 0.32 - smoothness * 0.08 : 0.26 - smoothness * 0.06,
      "multiply",
      "blur(3px)",
      sideReach,
      Math.round(height * 0.48),
      faceMask
    );
  }

  private drawTerrainMorphologyElevationRiserLines(
    ctx: CanvasRenderingContext2D,
    topEdge: TerrainMorphologyMaskBuffer,
    faceMask: TerrainMorphologyMaskBuffer,
    feature: StudioTerrainMorphologyFeature
  ): void {
    const height = getTerrainMorphologyHeight(feature);
    const smoothness = getTerrainMorphologySmoothness(feature);

    this.drawTerrainMorphologyMaskedColor(ctx, topEdge, "#fff3c6", 0.34 - smoothness * 0.06, "screen", "blur(1px)", 0, -1);
    this.drawTerrainMorphologyMaskedColor(ctx, topEdge, "#120d09", 0.24 - smoothness * 0.05, "multiply", "blur(1px)", 0, 2, faceMask);
    this.drawTerrainMorphologyMaskedColor(ctx, topEdge, "#1b130d", 0.13 - smoothness * 0.03, "multiply", "blur(2px)", 0, Math.round(height * 0.45), faceMask);
  }

  private drawTerrainHoleFillMorphology(
    ctx: CanvasRenderingContext2D,
    mask: TerrainMorphologyMaskBuffer,
    feature: StudioTerrainMorphologyFeature,
    data: StudioTerrainRenderData,
    image: HTMLImageElement | null
  ): void {
    const depth = getTerrainMorphologyHeight(feature);
    const geometry = resolveTerrainHoleFillGeometry(mask, feature, depth);
    if (!geometry) return;
    const fillMask = this.createTerrainMorphologyProjectedLevelMask(mask, geometry.inset, geometry.dropY);
    const softFillMask = this.createTerrainMorphologySoftMask(fillMask, 7, mask);

    this.drawTerrainMorphologyTextureFill(
      ctx,
      softFillMask,
      stringParam(feature.params.fillTextureId),
      data,
      image,
      stringParam(feature.params.fillColor) ?? "rgba(60, 128, 151, 0.88)",
      0.86
    );

    const levelLine = this.createTerrainMorphologyLevelLineMask(mask, fillMask);
    this.drawTerrainMorphologyMaskedColor(ctx, levelLine, "#f5f0d8", 0.42, "screen", "blur(1px)");
  }

  private createTerrainMorphologyDirectionalEdgeMask(
    source: TerrainMorphologyMaskBuffer,
    edge: "bottom" | "left" | "right" | "top",
    distance: number
  ): TerrainMorphologyMaskBuffer {
    const target = this.createCanvasBuffer(source.canvas.width, source.canvas.height);
    const edgeDistance = Math.max(1, Math.round(distance));
    const offset = {
      bottom: { x: 0, y: -edgeDistance },
      left: { x: edgeDistance, y: 0 },
      right: { x: -edgeDistance, y: 0 },
      top: { x: 0, y: edgeDistance },
    } satisfies Record<"bottom" | "left" | "right" | "top", { x: number; y: number }>;

    target.ctx.drawImage(source.canvas, 0, 0);
    target.ctx.save();
    target.ctx.globalCompositeOperation = "destination-out";
    target.ctx.drawImage(source.canvas, offset[edge].x, offset[edge].y);
    target.ctx.restore();
    return { canvas: target.canvas, bounds: source.bounds };
  }

  private createTerrainMorphologyExtrudedFaceMask(
    source: TerrainMorphologyMaskBuffer,
    feature: StudioTerrainMorphologyFeature
  ): TerrainMorphologyMaskBuffer {
    const target = this.createCanvasBuffer(source.canvas.width, source.canvas.height);
    const height = getTerrainMorphologyHeight(feature);
    const smoothness = getTerrainMorphologySmoothness(feature);
    const step = Math.round(4 + smoothness * 2);

    for (let y = 0; y <= height; y += step) {
      const sway = Math.round(Math.sin(y * 0.18) * (1 - smoothness) * 2);
      target.ctx.drawImage(source.canvas, sway, y);
    }

    return { canvas: target.canvas, bounds: source.bounds };
  }

  private createTerrainMorphologySoftMask(
    source: TerrainMorphologyMaskBuffer,
    blur: number,
    clipMask: TerrainMorphologyMaskBuffer = source
  ): TerrainMorphologyMaskBuffer {
    const target = this.createCanvasBuffer(source.canvas.width, source.canvas.height);
    target.ctx.save();
    target.ctx.filter = `blur(${Math.max(1, Math.round(blur))}px)`;
    target.ctx.drawImage(source.canvas, 0, 0);
    target.ctx.restore();
    const result = { canvas: target.canvas, bounds: source.bounds };
    this.clipTerrainMorphologyMask(result, clipMask);
    return result;
  }

  private createTerrainMorphologyProjectedLevelMask(
    source: TerrainMorphologyMaskBuffer,
    inset: number,
    dropY: number
  ): TerrainMorphologyMaskBuffer {
    const target = this.createCanvasBuffer(source.canvas.width, source.canvas.height);
    target.ctx.drawImage(source.canvas, 0, dropY);
    target.ctx.save();
    target.ctx.globalCompositeOperation = "destination-in";
    target.ctx.drawImage(source.canvas, 0, 0);
    target.ctx.restore();

    if (inset > 0.5) {
      const rings = [inset * 0.48, inset];
      target.ctx.save();
      target.ctx.globalCompositeOperation = "destination-in";
      for (const distance of rings) {
        const samples = Math.round(clampNumber(8 + distance * 0.18, 10, 18));
        for (let index = 0; index < samples; index += 1) {
          const angle = (index / samples) * Math.PI * 2;
          target.ctx.drawImage(
            source.canvas,
            Math.round(Math.cos(angle) * distance),
            dropY + Math.round(Math.sin(angle) * distance)
          );
        }
      }
      target.ctx.restore();
    }

    return { canvas: target.canvas, bounds: source.bounds };
  }

  private createTerrainMorphologyLevelLineMask(
    mask: TerrainMorphologyMaskBuffer,
    levelMask: TerrainMorphologyMaskBuffer
  ): TerrainMorphologyMaskBuffer {
    const target = this.createCanvasBuffer(mask.canvas.width, mask.canvas.height);
    target.ctx.save();
    target.ctx.filter = "blur(3px)";
    target.ctx.drawImage(levelMask.canvas, 0, 0);
    target.ctx.restore();
    target.ctx.save();
    target.ctx.globalCompositeOperation = "destination-out";
    target.ctx.drawImage(levelMask.canvas, 0, 0);
    target.ctx.restore();
    const result = { canvas: target.canvas, bounds: mask.bounds };
    this.clipTerrainMorphologyMask(result, mask);
    return result;
  }

  private clipTerrainMorphologyMask(
    target: TerrainMorphologyMaskBuffer,
    clipMask: TerrainMorphologyMaskBuffer
  ): void {
    const targetContext = target.canvas.getContext("2d");
    if (!targetContext) return;
    targetContext.save();
    targetContext.globalCompositeOperation = "destination-in";
    targetContext.drawImage(clipMask.canvas, 0, 0);
    targetContext.restore();
  }

  private fillTerrainRect(
    ctx: CanvasRenderingContext2D,
    data: StudioTerrainRenderData,
    image: HTMLImageElement | null,
    textureId: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const pattern = this.getPattern(ctx, data, image, textureId);
    if (pattern) {
      ctx.save();
      ctx.fillStyle = pattern;
      ctx.fillRect(x, y, width, height);
      ctx.restore();
      return;
    }
    ctx.fillStyle = fallbackTerrainColor(textureId);
    ctx.fillRect(x, y, width, height);
  }

  private drawTerrainAtlasTile(
    ctx: CanvasRenderingContext2D,
    data: StudioTerrainRenderData,
    image: HTMLImageElement,
    tileId: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    if (!data.asset) return false;
    const source = resolveTerrainTileAtlasSourceRect(
      data.asset,
      tileId,
      image.naturalWidth || image.width,
      image.naturalHeight || image.height
    );
    if (!source) return false;

    try {
      ctx.drawImage(
        image,
        source.x,
        source.y,
        source.width,
        source.height,
        x,
        y,
        width,
        height
      );
      return true;
    } catch {
      return false;
    }
  }

  private strokeWithTerrainTexture(
    ctx: CanvasRenderingContext2D,
    data: StudioTerrainRenderData,
    image: HTMLImageElement | null,
    textureId: string,
    radius: number
  ): void {
    const pattern = this.getPattern(ctx, data, image, textureId, Math.max(16, radius));
    if (pattern) {
      ctx.strokeStyle = pattern;
      ctx.stroke();
      return;
    }
    ctx.strokeStyle = fallbackTerrainColor(textureId);
    ctx.stroke();
  }

  private getPattern(
    ctx: CanvasRenderingContext2D,
    data: StudioTerrainRenderData,
    image: HTMLImageElement | null,
    textureId: string,
    sizeOverride?: number
  ): CanvasPattern | null {
    if (!data.asset || !image) return null;
    const texture = findTerrainTexture(data.asset, textureId);
    if (!texture) return null;
    const renderSize = Math.max(1, Math.round(sizeOverride ?? texture.renderTileSize ?? data.tileSize));
    const cacheKey = `${data.sourceTexture}:${texture.id}:${renderSize}`;
    let patternCanvas = this.patternCache.get(cacheKey);
    if (!patternCanvas) {
      const source = resolveTerrainTextureSourceRect(data.asset, texture, image.naturalWidth, image.naturalHeight);
      patternCanvas = createTerrainPatternCanvas(image, source, renderSize);
      this.patternCache.set(cacheKey, patternCanvas);
    }
    return ctx.createPattern(patternCanvas, "repeat");
  }

  private drawFadeEdge(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tileSize: number,
    fadeWidth: number,
    edge: "top" | "right" | "bottom" | "left"
  ): void {
    ctx.save();
    let gradient: CanvasGradient;
    if (edge === "top") {
      gradient = ctx.createLinearGradient(0, y, 0, y + fadeWidth);
      gradient.addColorStop(0, "rgba(255,255,255,0.18)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, tileSize, fadeWidth);
    } else if (edge === "bottom") {
      gradient = ctx.createLinearGradient(0, y + tileSize, 0, y + tileSize - fadeWidth);
      gradient.addColorStop(0, "rgba(255,255,255,0.18)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y + tileSize - fadeWidth, tileSize, fadeWidth);
    } else if (edge === "left") {
      gradient = ctx.createLinearGradient(x, 0, x + fadeWidth, 0);
      gradient.addColorStop(0, "rgba(255,255,255,0.18)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, fadeWidth, tileSize);
    } else {
      gradient = ctx.createLinearGradient(x + tileSize, 0, x + tileSize - fadeWidth, 0);
      gradient.addColorStop(0, "rgba(255,255,255,0.18)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x + tileSize - fadeWidth, y, fadeWidth, tileSize);
    }
    ctx.globalCompositeOperation = "soft-light";
    ctx.restore();
  }

  private drawDebugCollisions(
    ctx: CanvasRenderingContext2D,
    collisions: StudioCollisionPolygon[],
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    if (collisions.length === 0) return;
    ctx.save();
    ctx.lineWidth = 2;
    collisions.forEach((polygon) => {
      if (!rectsIntersect(bounds, polygon)) return;
      ctx.beginPath();
      polygon.points.forEach(([x, y], index) => {
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = "rgba(239, 68, 68, 0.18)";
      ctx.strokeStyle = "rgba(239, 68, 68, 0.72)";
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  private createCanvasBuffer(width: number, height: number, willReadFrequently = false): CanvasBuffer {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(width));
    canvas.height = Math.max(1, Math.ceil(height));
    const ctx = canvas.getContext("2d", willReadFrequently ? { willReadFrequently: true } : undefined);
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  }

  private loadImage(source: string): Promise<HTMLImageElement | null> {
    if (!source || typeof Image === "undefined") return Promise.resolve(null);
    if (!this.imageCache.has(source)) {
      this.imageCache.set(
        source,
        new Promise((resolve) => {
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.onload = () => {
            this.loadedImages.set(source, image);
            resolve(image);
          };
          image.onerror = () => resolve(null);
          image.src = source;
          if (image.complete && image.naturalWidth > 0) {
            this.loadedImages.set(source, image);
            resolve(image);
          }
        })
      );
    }
    return this.imageCache.get(source)!;
  }

  private getImageBuffer(source: string, image: HTMLImageElement): ImageBuffer | null {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (width <= 0 || height <= 0) return null;
    const key = `${source}:${width}x${height}`;
    const cached = this.imageBufferCache.get(key);
    if (cached) return cached;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0, width, height);
      const data = ctx.getImageData(0, 0, width, height).data;
      const buffer = { key, width, height, data };
      this.imageBufferCache.set(key, buffer);
      return buffer;
    } catch {
      return null;
    }
  }

  private getTerrainControlBuffer(
    control: StudioTerrainControlTexture,
    image: HTMLImageElement | null
  ): ImageBuffer | null {
    const regions = control.regions ?? [];
    if (regions.length === 0) {
      return image ? this.getImageBuffer(control.source, image) : null;
    }

    const key = `stream:${control.width}x${control.height}:${regions
      .map(
        (region) =>
          `${region.key}:${region.x},${region.y},${region.width}x${region.height}:${region.encoding}:${region.data}`
      )
      .sort()
      .join("|")}`;
    const cached = this.imageBufferCache.get(key);
    if (cached) return cached;

    const data = new Uint8ClampedArray(control.width * control.height * 4);
    for (const region of regions) {
      const pixels = decodeTerrainControlRegion(region);
      if (!pixels) continue;
      for (let y = 0; y < region.height; y += 1) {
        const sourceStart = y * region.width * 4;
        const targetStart =
          ((region.y + y) * control.width + region.x) * 4;
        data.set(
          pixels.subarray(sourceStart, sourceStart + region.width * 4),
          targetStart
        );
      }
    }
    const buffer = {
      key,
      width: control.width,
      height: control.height,
      data,
    };
    this.imageBufferCache.set(key, buffer);
    return buffer;
  }
}

function decodeTerrainControlRegion(
  region: NonNullable<StudioTerrainControlTexture["regions"]>[number]
): Uint8ClampedArray | null {
  try {
    const binary = atob(region.data);
    const encoded = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0)
    );
    const expectedLength = region.width * region.height * 4;
    if (region.encoding === "rgba8-base64") {
      return encoded.length === expectedLength
        ? new Uint8ClampedArray(encoded)
        : null;
    }

    const output = new Uint8ClampedArray(expectedLength);
    let sourceOffset = 0;
    let targetOffset = 0;
    while (
      sourceOffset + 8 <= encoded.length &&
      targetOffset < output.length
    ) {
      const run =
        (encoded[sourceOffset] |
          (encoded[sourceOffset + 1] << 8) |
          (encoded[sourceOffset + 2] << 16) |
          (encoded[sourceOffset + 3] << 24)) >>>
        0;
      const r = encoded[sourceOffset + 4];
      const g = encoded[sourceOffset + 5];
      const b = encoded[sourceOffset + 6];
      const a = encoded[sourceOffset + 7];
      sourceOffset += 8;
      for (let index = 0; index < run && targetOffset < output.length; index += 1) {
        output[targetOffset++] = r;
        output[targetOffset++] = g;
        output[targetOffset++] = b;
        output[targetOffset++] = a;
      }
    }
    return targetOffset === output.length ? output : null;
  } catch {
    return null;
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

function createTerrainControlRenderLayers(
  asset: TerrainAssetMetadata,
  palette: string[]
): TerrainControlRenderLayer[] {
  return palette
    .map((terrainTextureId, paletteIndex): TerrainControlRenderLayer | null => {
      const texture = findTerrainTexture(asset, terrainTextureId) ?? findTerrainTexture(asset, paletteIndex);
      if (!texture) return null;
      const mode = getTerrainRenderMode(texture);
      return {
        terrainTextureId,
        paletteIndex,
        priority: resolveTerrainLayerPriority(texture, paletteIndex),
        blendRadius: resolveTerrainLayerBlendRadius(asset, terrainTextureId, mode),
        mode,
      };
    })
    .filter((layer): layer is TerrainControlRenderLayer => layer !== null)
    .sort((left, right) => left.priority - right.priority || left.paletteIndex - right.paletteIndex);
}

function resolveTerrainLayerPriority(texture: ReturnType<typeof findTerrainTexture>, paletteIndex: number): number {
  const priority = Number((texture as { priority?: unknown } | null | undefined)?.priority);
  return Number.isFinite(priority) ? priority : paletteIndex;
}

function resolveTerrainLayerBlendRadius(
  asset: TerrainAssetMetadata,
  terrainTextureId: string,
  mode: TerrainRenderMode
): number {
  const transitionRadii = resolveTerrainTransitionRules(asset, terrainTextureId).map((transition) =>
    resolveTerrainModeBlendRadius(transition.mode)
  );
  return Math.max(resolveTerrainModeBlendRadius(mode), ...transitionRadii);
}

function resolveTerrainModeBlendRadius(mode: TerrainRenderMode): number {
  if (mode.type === "hard") return 0;
  if (mode.type === "fade") {
    const width = Number(mode.width);
    return Number.isFinite(width) && width > 0 ? width : 18;
  }
  if (mode.type === "water") return mode.border === false ? 8 : 16;
  if (mode.type === "custom") {
    const width = Number(mode.params?.blendRadius ?? mode.params?.width);
    return Number.isFinite(width) && width >= 0 ? width : 18;
  }
  return 18;
}

function resolveTerrainTransitionRules(
  asset: TerrainAssetMetadata,
  terrainTextureId: string
): Array<{ from: string; to: string; mode: TerrainRenderMode; priority?: number }> {
  return asset.transitions
    .filter((transition) => transition.from === terrainTextureId || transition.to === terrainTextureId)
    .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));
}

function resolveTransitionNeighborIds(
  asset: TerrainAssetMetadata,
  terrainTextureId: string,
  predicate: (mode: TerrainRenderMode) => boolean
): string[] {
  return resolveTerrainTransitionRules(asset, terrainTextureId)
    .filter((transition) => predicate(transition.mode))
    .map((transition) => (transition.from === terrainTextureId ? transition.to : transition.from))
    .filter((neighborId, index, all) => all.indexOf(neighborId) === index);
}

function composeTerrainLayerPixels(
  width: number,
  height: number,
  layers: TerrainCompositeLayer[]
): Uint8ClampedArray {
  const pixelCount = Math.max(0, Math.floor(width) * Math.floor(height));
  const output = new Uint8ClampedArray(pixelCount * 4);

  for (let offset = 0; offset < output.length; offset += 4) {
    let maskTotal = 0;
    let alphaTotal = 0;
    let red = 0;
    let green = 0;
    let blue = 0;

    for (const layer of layers) {
      const maskAlpha = layer.mask[offset + 3] / 255;
      if (maskAlpha <= 0) continue;

      const pixelAlpha = layer.pixels[offset + 3] / 255;
      const alphaWeight = maskAlpha * pixelAlpha;
      maskTotal += maskAlpha;
      if (alphaWeight <= 0) continue;

      alphaTotal += alphaWeight;
      red += layer.pixels[offset] * alphaWeight;
      green += layer.pixels[offset + 1] * alphaWeight;
      blue += layer.pixels[offset + 2] * alphaWeight;
    }

    if (maskTotal <= 0 || alphaTotal <= 0) continue;

    output[offset] = clampByte(red / alphaTotal);
    output[offset + 1] = clampByte(green / alphaTotal);
    output[offset + 2] = clampByte(blue / alphaTotal);
    output[offset + 3] = clampByte((alphaTotal / maskTotal) * 255);
  }

  return output;
}

function intersectBounds(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number }
): { x: number; y: number; width: number; height: number } | null {
  const x = Math.max(first.x, second.x);
  const y = Math.max(first.y, second.y);
  const right = Math.min(first.x + first.width, second.x + second.width);
  const bottom = Math.min(first.y + first.height, second.y + second.height);
  if (right <= x || bottom <= y) return null;
  return { x, y, width: right - x, height: bottom - y };
}

function expandBounds(
  bounds: StudioTerrainRenderBounds,
  margin: number
): StudioTerrainRenderBounds {
  return {
    x: bounds.x - margin,
    y: bounds.y - margin,
    width: bounds.width + margin * 2,
    height: bounds.height + margin * 2,
  };
}

function unionBounds(
  bounds: StudioTerrainRenderBounds[]
): StudioTerrainRenderBounds | null {
  if (bounds.length === 0) return null;
  const x = Math.min(...bounds.map((entry) => entry.x));
  const y = Math.min(...bounds.map((entry) => entry.y));
  const right = Math.max(...bounds.map((entry) => entry.x + entry.width));
  const bottom = Math.max(...bounds.map((entry) => entry.y + entry.height));
  return {
    x: Math.floor(x),
    y: Math.floor(y),
    width: Math.max(1, Math.ceil(right) - Math.floor(x)),
    height: Math.max(1, Math.ceil(bottom) - Math.floor(y)),
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

function getTerrainMorphologyHeight(feature: StudioTerrainMorphologyFeature): number {
  if (feature.kind === "hole") {
    return clampNumber(Number(feature.params.depth) || 58, 12, 160);
  }
  return clampNumber(Number(feature.params.height) || 56, 12, 160);
}

function getTerrainMorphologySmoothness(feature: StudioTerrainMorphologyFeature): number {
  return getTerrainMorphologySmoothnessFromParams(feature.params);
}

function getTerrainMorphologySmoothnessFromParams(params: StudioTerrainMorphologyFeature["params"]): number {
  return clampNumber(1 - Number(params.roughness ?? 0), 0, 1);
}

interface TerrainMorphologyFeatureMetrics {
  pointMinX: number;
  pointMinY: number;
  pointMaxX: number;
  pointMaxY: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  maxRadius: number;
}

let terrainMorphologyFeatureMetricsCache = new WeakMap<
  StudioTerrainMorphologyFeature,
  TerrainMorphologyFeatureMetrics | null
>();

function resetTerrainMorphologyFeatureMetricsCache(): void {
  terrainMorphologyFeatureMetricsCache = new WeakMap();
}

function getTerrainMorphologyFeatureMetrics(
  feature: StudioTerrainMorphologyFeature
): TerrainMorphologyFeatureMetrics | null {
  if (terrainMorphologyFeatureMetricsCache.has(feature)) {
    return terrainMorphologyFeatureMetricsCache.get(feature) ?? null;
  }

  let pointMinX = Number.POSITIVE_INFINITY;
  let pointMinY = Number.POSITIVE_INFINITY;
  let pointMaxX = Number.NEGATIVE_INFINITY;
  let pointMaxY = Number.NEGATIVE_INFINITY;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxRadius = 1;

  for (const stroke of feature.strokes) {
    const radius = Math.max(1, Number(stroke.radius) || 1);
    maxRadius = Math.max(maxRadius, radius);
    for (const point of stroke.points) {
      pointMinX = Math.min(pointMinX, point.x);
      pointMinY = Math.min(pointMinY, point.y);
      pointMaxX = Math.max(pointMaxX, point.x);
      pointMaxY = Math.max(pointMaxY, point.y);
      minX = Math.min(minX, point.x - radius);
      minY = Math.min(minY, point.y - radius);
      maxX = Math.max(maxX, point.x + radius);
      maxY = Math.max(maxY, point.y + radius);
    }
  }

  const metrics = [pointMinX, pointMinY, pointMaxX, pointMaxY, minX, minY, maxX, maxY].every(Number.isFinite)
    ? { pointMinX, pointMinY, pointMaxX, pointMaxY, minX, minY, maxX, maxY, maxRadius }
    : null;
  terrainMorphologyFeatureMetricsCache.set(feature, metrics);
  return metrics;
}

function getTerrainMorphologyBounds(
  data: StudioTerrainRenderData,
  feature: StudioTerrainMorphologyFeature,
  padding = 0
): { x: number; y: number; width: number; height: number } | null {
  const metrics = getTerrainMorphologyFeatureMetrics(feature);
  if (!metrics) return null;

  const x = Math.max(0, Math.min(data.width, Math.floor(metrics.minX - padding)));
  const y = Math.max(0, Math.min(data.height, Math.floor(metrics.minY - padding)));
  const right = Math.max(x, Math.min(data.width, Math.ceil(metrics.maxX + padding)));
  const bottom = Math.max(y, Math.min(data.height, Math.ceil(metrics.maxY + padding)));
  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

function isTerrainMorphologyPointNearLocalBounds(
  point: { x: number; y: number },
  radius: number,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number
): boolean {
  return (
    point.x + radius >= offsetX &&
    point.y + radius >= offsetY &&
    point.x - radius <= offsetX + width &&
    point.y - radius <= offsetY + height
  );
}

function isTerrainMorphologySegmentNearLocalBounds(
  from: { x: number; y: number },
  to: { x: number; y: number },
  radius: number,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number
): boolean {
  return (
    Math.max(from.x, to.x) + radius >= offsetX &&
    Math.max(from.y, to.y) + radius >= offsetY &&
    Math.min(from.x, to.x) - radius <= offsetX + width &&
    Math.min(from.y, to.y) - radius <= offsetY + height
  );
}

function drawTerrainMorphologyOrganicBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  roughness: number,
  points: number
): void {
  const shape: Array<{ x: number; y: number }> = [];
  const seed = x * 0.017 + y * 0.011 + radius * 0.029;

  for (let index = 0; index < points; index += 1) {
    const angle = (index / points) * Math.PI * 2;
    const coarse = terrainMorphologyNoise(Math.cos(angle) * 1.8 + seed, Math.sin(angle) * 1.8 - seed, 31);
    const fine = terrainMorphologyNoise(Math.cos(angle) * 4.5 - seed, Math.sin(angle) * 4.5 + seed, 37);
    const variation = (coarse - 0.5) * roughness + (fine - 0.5) * roughness * 0.42;
    const localRadius = radius * (1 + variation);
    shape.push({
      x: x + Math.cos(angle) * localRadius,
      y: y + Math.sin(angle) * localRadius,
    });
  }

  ctx.beginPath();
  for (let index = 0; index < shape.length; index += 1) {
    const current = shape[index];
    const next = shape[(index + 1) % shape.length];
    const midX = (current.x + next.x) * 0.5;
    const midY = (current.y + next.y) * 0.5;
    if (index === 0) {
      ctx.moveTo(midX, midY);
    } else {
      ctx.quadraticCurveTo(current.x, current.y, midX, midY);
    }
  }
  ctx.closePath();
}

function drawTerrainMorphologyRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const roundRect = (ctx as CanvasRenderingContext2D & { roundRect?: CanvasRenderingContext2D["roundRect"] }).roundRect;
  if (roundRect) {
    ctx.beginPath();
    roundRect.call(ctx, x, y, width, height, radius);
    return;
  }

  const clampedRadius = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + clampedRadius, y);
  ctx.lineTo(x + width - clampedRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + clampedRadius);
  ctx.lineTo(x + width, y + height - clampedRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - clampedRadius, y + height);
  ctx.lineTo(x + clampedRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - clampedRadius);
  ctx.lineTo(x, y + clampedRadius);
  ctx.quadraticCurveTo(x, y, x + clampedRadius, y);
  ctx.closePath();
}

function getTerrainMorphologyLocalMaskBounds(
  mask: TerrainMorphologyMaskBuffer
): { maxX: number; maxY: number; minX: number; minY: number } | null {
  if (mask.alphaBounds) return mask.alphaBounds;
  const data = mask.canvas.getContext("2d", { willReadFrequently: true })?.getImageData(0, 0, mask.canvas.width, mask.canvas.height).data;
  if (!data) return null;

  let minX = mask.canvas.width;
  let minY = mask.canvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < mask.canvas.height; y += 1) {
    for (let x = 0; x < mask.canvas.width; x += 1) {
      const alpha = data[(y * mask.canvas.width + x) * 4 + 3];
      if (alpha === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return maxX < 0 || maxY < 0 ? null : { maxX, maxY, minX, minY };
}

export function resolveTerrainHoleFillGeometry(
  mask: TerrainMorphologyMaskBuffer,
  feature: StudioTerrainMorphologyFeature,
  depth = getTerrainMorphologyHeight(feature)
): TerrainHoleFillGeometry | null {
  const level = clampNumber(Number(feature.params.fillHeight ?? 0) / 100, 0, 1);
  if (level <= 0) return null;

  const bounds = getTerrainMorphologyLocalMaskBounds(mask);
  if (!bounds) return null;
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const minDimension = Math.min(width, height);
  const wallMargin = Math.round(clampNumber(minDimension * 0.035, 4, 10));

  return {
    level,
    dropY: Math.round((1 - level) * depth * 0.78),
    inset: Math.round(wallMargin + minDimension * 0.05 * (1 - level)),
  };
}

function terrainMorphologyNoise(x: number, y: number, seed = 0): number {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function stringParam(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function createTerrainControlLayers(
  asset: TerrainAssetMetadata,
  palette: string[],
  imageWidth: number,
  imageHeight: number
): TerrainControlLayer[] {
  return palette
    .map((terrainTextureId, paletteIndex): TerrainControlLayer | null => {
      const texture = findTerrainTexture(asset, terrainTextureId) ??
        findTerrainTexture(asset, paletteIndex);
      if (!texture) return null;
      const source = resolveTerrainTextureSourceRect(asset, texture, imageWidth, imageHeight);
      return {
        terrainTextureId,
        paletteIndex,
        source,
      };
    })
    .filter((layer): layer is TerrainControlLayer => layer !== null);
}

function sampleTerrainControlColor(
  sourceBuffer: ImageBuffer,
  controlBuffer: ImageBuffer,
  control: StudioTerrainControlTexture,
  layers: TerrainControlLayer[],
  sourceTileSize: number,
  transitionWidth: number,
  worldX: number,
  worldY: number
): RgbaColor {
  const current = readTerrainControlPixel(controlBuffer, control, layers, worldX, worldY);
  if (!current) return TRANSPARENT;

  const baseColor = sampleTerrainLayerColor(
    sourceBuffer,
    current.layer,
    sourceTileSize,
    worldX,
    worldY,
    current.light
  );
  let r = baseColor.r;
  let g = baseColor.g;
  let b = baseColor.b;
  let outputAlpha = current.coverage;
  const searchWidth = Math.max(transitionWidth, current.coverage < 0.999 ? 12 : 0);

  if (
    searchWidth > 0 &&
    shouldSearchTerrainTransition(
      controlBuffer,
      control,
      layers,
      current.layer.paletteIndex,
      searchWidth,
      worldX,
      worldY,
      current.coverage
    )
  ) {
    let neighborR = 0;
    let neighborG = 0;
    let neighborB = 0;
    let neighborWeight = 0;
    let priorityNeighborR = 0;
    let priorityNeighborG = 0;
    let priorityNeighborB = 0;
    let priorityNeighborWeight = 0;
    let nearestPriorityDistance = searchWidth + 1;
    let softBoundary = 0;

    for (let stepIndex = 1; stepIndex <= 8; stepIndex += 1) {
      const distance = Math.max(1, searchWidth * (stepIndex / 8));
      const proximity = 1 - clampNumber(distance / Math.max(searchWidth, 1), 0, 1);

      for (let dir = 0; dir < TERRAIN_TRANSITION_DIRECTIONS.length; dir += 1) {
        const direction = TERRAIN_TRANSITION_DIRECTIONS[dir];
        const neighbor = readTerrainControlPixel(
          controlBuffer,
          control,
          layers,
          worldX + direction.x * distance,
          worldY + direction.y * distance
        );
        if (!neighbor) continue;

        const diagonalPenalty = dir >= 4 ? 0.72 : 1;
        const weight = (0.08 + proximity * proximity) * diagonalPenalty;
        if (neighbor.layer.paletteIndex === current.layer.paletteIndex) {
          if (neighbor.coverage < 0.999) {
            softBoundary = Math.max(softBoundary, proximity);
          }
          continue;
        }

        const neighborColor = sampleTerrainLayerColor(
          sourceBuffer,
          neighbor.layer,
          sourceTileSize,
          worldX,
          worldY,
          current.light
        );
        neighborR += neighborColor.r * weight;
        neighborG += neighborColor.g * weight;
        neighborB += neighborColor.b * weight;
        neighborWeight += weight;

        if (neighbor.layer.paletteIndex < current.layer.paletteIndex) {
          priorityNeighborR += neighborColor.r * weight;
          priorityNeighborG += neighborColor.g * weight;
          priorityNeighborB += neighborColor.b * weight;
          priorityNeighborWeight += weight;
          nearestPriorityDistance = Math.min(nearestPriorityDistance, distance);
        }
      }
    }

    if (current.coverage < 0.999 && neighborWeight > 0) {
      const brushCoverage = smoothstep(0, 1, current.coverage);
      r = mix(neighborR / neighborWeight, baseColor.r, brushCoverage);
      g = mix(neighborG / neighborWeight, baseColor.g, brushCoverage);
      b = mix(neighborB / neighborWeight, baseColor.b, brushCoverage);
      outputAlpha = 1;
    } else if (transitionWidth > 0 && priorityNeighborWeight > 0 && nearestPriorityDistance <= searchWidth) {
      const edge = 1 - smoothstep(0, searchWidth, nearestPriorityDistance);
      const softBoundarySuppression = 1 - smoothstep(0, 0.95, softBoundary);
      const blendAmount = clampNumber(Math.pow(edge, 0.7) * 0.52 * softBoundarySuppression, 0, 0.52);
      r = mix(baseColor.r, priorityNeighborR / priorityNeighborWeight, blendAmount);
      g = mix(baseColor.g, priorityNeighborG / priorityNeighborWeight, blendAmount);
      b = mix(baseColor.b, priorityNeighborB / priorityNeighborWeight, blendAmount);
    }
  }

  return {
    r: clampByte(r),
    g: clampByte(g),
    b: clampByte(b),
    a: clampByte(baseColor.a * outputAlpha),
  };
}

function shouldSearchTerrainTransition(
  controlBuffer: ImageBuffer,
  control: StudioTerrainControlTexture,
  layers: TerrainControlLayer[],
  paletteIndex: number,
  searchWidth: number,
  worldX: number,
  worldY: number,
  coverage: number
): boolean {
  if (coverage < 0.999) return true;
  const probeDistance = Math.max(1, searchWidth);
  for (const direction of TERRAIN_TRANSITION_DIRECTIONS) {
    const neighbor = readTerrainControlPixel(
      controlBuffer,
      control,
      layers,
      worldX + direction.x * probeDistance,
      worldY + direction.y * probeDistance
    );
    if (!neighbor || neighbor.layer.paletteIndex !== paletteIndex || neighbor.coverage < 0.999) {
      return true;
    }
  }
  return false;
}

function readTerrainControlPixel(
  controlBuffer: ImageBuffer,
  control: StudioTerrainControlTexture,
  layers: TerrainControlLayer[],
  worldX: number,
  worldY: number
): { layer: TerrainControlLayer; light: number; coverage: number } | null {
  if (worldX < 0 || worldY < 0 || worldX >= control.width || worldY >= control.height) {
    return null;
  }
  const x = clampInteger(Math.floor(worldX * (controlBuffer.width / control.width)), 0, controlBuffer.width - 1);
  const y = clampInteger(Math.floor(worldY * (controlBuffer.height / control.height)), 0, controlBuffer.height - 1);
  const offset = (y * controlBuffer.width + x) * 4;
  const coverage = controlBuffer.data[offset + 3] / 255;
  if (coverage <= 0) return null;
  const paletteIndex = controlBuffer.data[offset] + controlBuffer.data[offset + 1] * 256;
  const layer = layers.find((candidate) => candidate.paletteIndex === paletteIndex);
  if (!layer) return null;
  return {
    layer,
    light: controlBuffer.data[offset + 2] / 128,
    coverage,
  };
}

function sampleTerrainLayerColor(
  sourceBuffer: ImageBuffer,
  layer: TerrainControlLayer,
  sourceTileSize: number,
  worldX: number,
  worldY: number,
  light: number
): RgbaColor {
  const localX = resolveTerrainTextureRepeatLocal(worldX, sourceTileSize);
  const localY = resolveTerrainTextureRepeatLocal(worldY, sourceTileSize);
  const x = clampInteger(
    Math.floor(layer.source.x + localX * Math.max(1, layer.source.width - 1)),
    0,
    sourceBuffer.width - 1
  );
  const y = clampInteger(
    Math.floor(layer.source.y + localY * Math.max(1, layer.source.height - 1)),
    0,
    sourceBuffer.height - 1
  );
  const offset = (y * sourceBuffer.width + x) * 4;
  return {
    r: sourceBuffer.data[offset] * light,
    g: sourceBuffer.data[offset + 1] * light,
    b: sourceBuffer.data[offset + 2] * light,
    a: sourceBuffer.data[offset + 3],
  };
}

function resolveTerrainTransitionWidth(asset: TerrainAssetMetadata): number {
  const fadeWidths = asset.transitions
    .map((transition) => terrainRenderModeWidth(transition.mode))
    .filter((width) => width > 0);
  if (fadeWidths.length > 0) return Math.max(...fadeWidths);

  const textureWidths = asset.terrainTextures
    .map((texture) => terrainRenderModeWidth(texture.defaultRenderMode))
    .filter((width) => width > 0);
  return textureWidths.length > 0 ? Math.max(...textureWidths) : 18;
}

function terrainRenderModeWidth(mode: TerrainRenderMode | undefined): number {
  if (!mode) return 0;
  if (mode.type === "fade") {
    const width = Number(mode.width);
    return Number.isFinite(width) && width > 0 ? width : 18;
  }
  if (mode.type === "water") return mode.border === false ? 8 : 16;
  if (mode.type === "custom") {
    const width = Number(mode.params?.blendRadius ?? mode.params?.width);
    return Number.isFinite(width) && width > 0 ? width : 18;
  }
  return 0;
}

export function resolveTerrainTextureRepeatLocal(world: number, period: number): number {
  return positiveModulo(world / Math.max(period, 1), 1);
}

function drawWaterAnimationFrame(overlay: TerrainWaterOverlay): void {
  const { canvas, ctx } = overlay;
  const width = canvas.width;
  const height = canvas.height;
  resetCanvasContext(ctx);
  ctx.clearRect(0, 0, width, height);

  for (const region of overlay.regions) {
    drawWaterAnimationRegion(overlay, region);
  }
}

function drawWaterAnimationRegion(overlay: TerrainWaterOverlay, region: TerrainWaterRegion): void {
  const { canvas, ctx, frame, waveMask, surface } = overlay;
  const width = canvas.width;
  const height = canvas.height;
  const phase = region.phase + region.seed * 4;
  const frameCtx = frame.ctx;
  const renderBounds = region.bounds;
  const strength = resolveTerrainWaveRenderStrength(region.intensity);

  resetCanvasContext(frameCtx);
  frameCtx.clearRect(
    renderBounds.x,
    renderBounds.y,
    renderBounds.width,
    renderBounds.height
  );

  drawDirectionalWaterRefraction(
    frameCtx,
    surface,
    region,
    phase,
    width,
    height,
    overlay.originX,
    overlay.originY
  );

  frameCtx.save();
  frameCtx.globalCompositeOperation = "screen";
  frameCtx.globalAlpha = strength.glowAlpha;
  frameCtx.fillStyle = "#b4ebff";
  frameCtx.fillRect(
    renderBounds.x,
    renderBounds.y,
    renderBounds.width,
    renderBounds.height
  );
  frameCtx.restore();

  drawDirectionalWaveMask(
    waveMask,
    region,
    phase,
    width,
    height,
    overlay.originX,
    overlay.originY
  );
  resetCanvasContext(waveMask.ctx);

  frameCtx.save();
  frameCtx.globalAlpha = strength.waveAlpha;
  drawCanvasBounds(frameCtx, waveMask.canvas, renderBounds);
  frameCtx.restore();

  frameCtx.globalCompositeOperation = "destination-in";
  frameCtx.drawImage(region.mask, region.bounds.x, region.bounds.y);
  frameCtx.globalCompositeOperation = "source-over";
  drawCanvasBounds(ctx, frame.canvas, renderBounds);
}

function drawDirectionalWaterRefraction(
  ctx: CanvasRenderingContext2D,
  surface: HTMLCanvasElement,
  region: TerrainWaterRegion,
  phase: number,
  width: number,
  height: number,
  originX: number,
  originY: number
): void {
  const angle = degreesToRadians(region.direction - 90);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const projected = projectBoundsIntoRotatedSpace(region.bounds, centerX, centerY, cos, sin);
  const refractionBandHeight = 48;
  const drift = positiveModulo(phase * 12, refractionBandHeight);
  const flow = resolveTerrainWaveDirectionVector(region.direction);
  const across = { x: flow.y, y: -flow.x };
  const centerWorld = { x: originX + centerX, y: originY + centerY };
  const centerFlow = centerWorld.x * flow.x + centerWorld.y * flow.y;
  const globalMinY = projected.minY + centerFlow;
  const firstGlobalBand =
    Math.floor((globalMinY - drift) / refractionBandHeight) * refractionBandHeight + drift;
  const firstBand = firstGlobalBand - centerFlow;
  const strength = resolveTerrainWaveRenderStrength(region.intensity);

  ctx.globalAlpha = strength.refractionAlpha;
  for (let y = firstBand; y <= projected.maxY + refractionBandHeight; y += refractionBandHeight) {
    const globalY = y + centerFlow;
    const acrossOffset =
      Math.sin(globalY * 0.075 + phase * 2.4) * strength.refractionAcrossAmplitude;
    const flowOffset =
      Math.sin(globalY * 0.035 - phase * 1.7) * strength.refractionFlowAmplitude;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.rect(
      projected.minX - 4,
      y,
      projected.maxX - projected.minX + 8,
      refractionBandHeight + 0.5
    );
    ctx.clip();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(
      surface,
      across.x * acrossOffset + flow.x * flowOffset,
      across.y * acrossOffset + flow.y * flowOffset
    );
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawDirectionalWaveMask(
  waveMask: CanvasBuffer,
  region: TerrainWaterRegion,
  phase: number,
  width: number,
  height: number,
  originX: number,
  originY: number
): void {
  const ctx = waveMask.ctx;
  resetCanvasContext(ctx);
  ctx.clearRect(region.bounds.x, region.bounds.y, region.bounds.width, region.bounds.height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const angle = degreesToRadians(region.direction - 90);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const projected = projectBoundsIntoRotatedSpace(region.bounds, centerX, centerY, cos, sin);
  const bandSpacing = 32;
  const drift = positiveModulo(phase * 28, bandSpacing);
  const flow = resolveTerrainWaveDirectionVector(region.direction);
  const across = { x: flow.y, y: -flow.x };
  const centerWorld = { x: originX + centerX, y: originY + centerY };
  const centerFlow = centerWorld.x * flow.x + centerWorld.y * flow.y;
  const centerAcross = centerWorld.x * across.x + centerWorld.y * across.y;
  const globalMinY = projected.minY + centerFlow;
  const firstGlobalBand = Math.floor((globalMinY - drift) / bandSpacing) * bandSpacing + drift;
  const firstBand = firstGlobalBand - centerFlow;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = resolveTerrainWaveRenderStrength(region.intensity).lineWidth;
  for (let y = firstBand; y <= projected.maxY + bandSpacing; y += bandSpacing) {
    ctx.beginPath();
    for (let x = projected.minX - 18; x <= projected.maxX + 18; x += 12) {
      const globalX = x + centerAcross;
      const globalY = y + centerFlow;
      const waveY =
        y +
        Math.sin((globalX + region.seed * 31) * 0.055 + phase * 3 + globalY * 0.07) *
          (2 + region.intensity * 4);
      if (x <= projected.minX - 18) ctx.moveTo(x, waveY);
      else ctx.lineTo(x, waveY);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function projectBoundsIntoRotatedSpace(
  bounds: { x: number; y: number; width: number; height: number },
  centerX: number,
  centerY: number,
  cos: number,
  sin: number
): { minX: number; minY: number; maxX: number; maxY: number } {
  const corners = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x, y: bounds.y + bounds.height },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
  ];
  const projected = corners.map((point) => {
    const x = point.x - centerX;
    const y = point.y - centerY;
    return {
      x: x * cos + y * sin,
      y: -x * sin + y * cos,
    };
  });
  return {
    minX: Math.min(...projected.map((point) => point.x)),
    minY: Math.min(...projected.map((point) => point.y)),
    maxX: Math.max(...projected.map((point) => point.x)),
    maxY: Math.max(...projected.map((point) => point.y)),
  };
}

/** @internal */
export function resolveWaterMaskChunkIntersection(
  maskBounds: { x: number; y: number; width: number; height: number },
  alphaBounds: { x: number; y: number; width: number; height: number },
  chunkBounds: { x: number; y: number; width: number; height: number }
): {
  bounds: { x: number; y: number; width: number; height: number };
  sourceX: number;
  sourceY: number;
} | null {
  const alphaWorldX = maskBounds.x + alphaBounds.x;
  const alphaWorldY = maskBounds.y + alphaBounds.y;
  const worldX = Math.max(alphaWorldX, chunkBounds.x);
  const worldY = Math.max(alphaWorldY, chunkBounds.y);
  const worldMaxX = Math.min(
    alphaWorldX + alphaBounds.width,
    chunkBounds.x + chunkBounds.width
  );
  const worldMaxY = Math.min(
    alphaWorldY + alphaBounds.height,
    chunkBounds.y + chunkBounds.height
  );
  if (worldMaxX <= worldX || worldMaxY <= worldY) return null;

  return {
    bounds: {
      x: worldX - chunkBounds.x,
      y: worldY - chunkBounds.y,
      width: worldMaxX - worldX,
      height: worldMaxY - worldY,
    },
    sourceX: worldX - maskBounds.x,
    sourceY: worldY - maskBounds.y,
  };
}

function cropCanvasMask(
  source: HTMLCanvasElement,
  bounds: { x: number; y: number; width: number; height: number }
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(bounds.width));
  canvas.height = Math.max(1, Math.ceil(bounds.height));
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(
    source,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height
  );
  return canvas;
}

function drawCanvasBounds(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  bounds: { x: number; y: number; width: number; height: number }
): void {
  if (bounds.width <= 0 || bounds.height <= 0) return;
  ctx.drawImage(
    source,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height
  );
}

function resetCanvasContext(ctx: CanvasRenderingContext2D): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
}

/** @internal */
export function resolveTerrainWaveHighlightColor(color: RgbaColor, amount = 0.36): RgbaColor {
  const multiplier = 1 + clampNumber(amount, 0, 1);
  return {
    r: clampByte(color.r * multiplier),
    g: clampByte(color.g * multiplier),
    b: clampByte(color.b * multiplier),
    a: clampByte(color.a),
  };
}

/** @internal */
export function resolveTerrainWaveDirectionVector(direction: number): { x: number; y: number } {
  const radians = degreesToRadians(normalizeWaveDirection(direction));
  return {
    x: snapNearZero(Math.cos(radians)),
    y: snapNearZero(Math.sin(radians)),
  };
}

/** @internal */
export function resolveTerrainWaveOptions(
  options?: Partial<StudioWaterAnimationOptions> | null
): TerrainWaterWaveOptions {
  return {
    speed: clampNumber(readFiniteNumber(options?.speed) ?? 1, 0.1, 4),
    intensity: clampNumber(readFiniteNumber(options?.intensity) ?? 0.45, 0, 1),
    direction: normalizeWaveDirection(readFiniteNumber(options?.direction) ?? 90),
  };
}

/** @internal */
export function resolveTerrainHoleWaveOptions(
  feature: StudioTerrainMorphologyFeature,
  fallback?: Partial<StudioWaterAnimationOptions> | null
): TerrainWaterWaveOptions {
  const defaults = resolveTerrainWaveOptions(fallback);
  return {
    speed: clampNumber(readFiniteNumber(feature.params.waveSpeed) ?? defaults.speed, 0.1, 4),
    intensity: clampNumber(readFiniteNumber(feature.params.waveIntensity) ?? defaults.intensity, 0, 1),
    direction: normalizeWaveDirection(readFiniteNumber(feature.params.waveDirection) ?? defaults.direction),
  };
}

/** @internal */
export function resolveTerrainHoleWaveDescriptors(
  features: StudioTerrainMorphologyFeature[],
  fallback?: Partial<StudioWaterAnimationOptions> | null
): TerrainHoleWaveDescriptor[] {
  return features
    .filter(
      (feature) =>
        feature.kind === "hole" && (readFiniteNumber(feature.params.fillHeight) ?? 0) > 0
    )
    .map((feature) => ({
      feature,
      options: resolveTerrainHoleWaveOptions(feature, fallback),
    }));
}

/** @internal */
export function isTerrainWaveAnimated(options: TerrainWaterWaveOptions): boolean {
  return options.intensity > 0;
}

/** @internal */
export function resolveTerrainWaveRenderStrength(intensity: number): TerrainWaveRenderStrength {
  const value = clampNumber(intensity, 0, 1);
  return {
    refractionAlpha: Math.min(1, value * 1.3),
    refractionAcrossAmplitude: value * (2.5 + value * 2.5),
    refractionFlowAmplitude: value * (0.8 + value * 0.8),
    glowAlpha: value * 0.08,
    waveAlpha: Math.min(1, value * 1.1),
    lineWidth: 1 + value * 2,
  };
}

function resolveWaterMaskAlphaBounds(
  mask: HTMLCanvasElement
): { x: number; y: number; width: number; height: number } | null {
  const ctx = mask.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  return findAlphaBounds(
    ctx.getImageData(0, 0, mask.width, mask.height).data,
    mask.width,
    mask.height,
    { x: 0, y: 0, width: mask.width, height: mask.height }
  );
}

function readFiniteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function normalizeWaveDirection(value: number): number {
  return positiveModulo(Number.isFinite(value) ? value : 90, 360);
}

function degreesToRadians(value: number): number {
  return value * Math.PI / 180;
}

function snapNearZero(value: number): number {
  return Math.abs(value) < 1e-10 ? 0 : value;
}

function stableStringHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function updateCanvasTexture(texture: Texture): void {
  const textureLike = texture as unknown as {
    update?: () => void;
    source?: { update?: () => void };
  };
  textureLike.source?.update?.();
  textureLike.update?.();
}

function positiveModulo(value: number, modulo: number): number {
  return ((value % modulo) + modulo) % modulo;
}

function mix(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = clampNumber((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function clampByte(value: number): number {
  return clampInteger(Math.round(value), 0, 255);
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function findAlphaBounds(
  data: Uint8ClampedArray,
  canvasWidth: number,
  canvasHeight: number,
  bounds: { x: number; y: number; width: number; height: number },
  threshold = 4
): { x: number; y: number; width: number; height: number } | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const startX = clampInteger(Math.floor(bounds.x), 0, canvasWidth - 1);
  const startY = clampInteger(Math.floor(bounds.y), 0, canvasHeight - 1);
  const endX = clampInteger(Math.ceil(bounds.x + bounds.width), startX + 1, canvasWidth);
  const endY = clampInteger(Math.ceil(bounds.y + bounds.height), startY + 1, canvasHeight);

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const alpha = data[(y * canvasWidth + x) * 4 + 3];
      if (alpha <= threshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function findAlphaBands(
  data: Uint8ClampedArray,
  canvasWidth: number,
  canvasHeight: number,
  bounds: { x: number; y: number; width: number; height: number },
  threshold = 4
): Array<{ y: number; height: number }> {
  const startX = clampInteger(Math.floor(bounds.x), 0, canvasWidth - 1);
  const startY = clampInteger(Math.floor(bounds.y), 0, canvasHeight - 1);
  const endX = clampInteger(Math.ceil(bounds.x + bounds.width), startX + 1, canvasWidth);
  const endY = clampInteger(Math.ceil(bounds.y + bounds.height), startY + 1, canvasHeight);
  const bands: Array<{ y: number; height: number }> = [];
  const maxGap = 2;
  let bandStart = -1;
  let lastAlphaY = -1;

  for (let y = startY; y < endY; y += 1) {
    let hasAlpha = false;
    for (let x = startX; x < endX; x += 1) {
      if (data[(y * canvasWidth + x) * 4 + 3] > threshold) {
        hasAlpha = true;
        break;
      }
    }

    if (hasAlpha) {
      if (bandStart < 0) bandStart = y;
      lastAlphaY = y;
      continue;
    }

    if (bandStart >= 0 && y - lastAlphaY > maxGap) {
      bands.push({ y: bandStart, height: lastAlphaY - bandStart + 1 });
      bandStart = -1;
      lastAlphaY = -1;
    }
  }

  if (bandStart >= 0) {
    bands.push({ y: bandStart, height: lastAlphaY - bandStart + 1 });
  }

  return bands;
}

const TRANSPARENT: RgbaColor = { r: 0, g: 0, b: 0, a: 0 };

const TERRAIN_TRANSITION_DIRECTIONS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 0.70710678, y: 0.70710678 },
  { x: -0.70710678, y: 0.70710678 },
  { x: 0.70710678, y: -0.70710678 },
  { x: -0.70710678, y: -0.70710678 },
] as const;

function drawStrokePath(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>): void {
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
}

function featureIntersectsBounds(
  feature: StudioTerrainMorphologyFeature,
  bounds: { x: number; y: number; width: number; height: number }
): boolean {
  const metrics = getTerrainMorphologyFeatureMetrics(feature);
  if (!metrics) return false;
  const margin = Math.max(metrics.maxRadius, STUDIO_TERRAIN_TILE_SIZE) * 2 + getTerrainMorphologyHeight(feature) + 32;
  const left = metrics.pointMinX - margin;
  const top = metrics.pointMinY - margin;
  const right = metrics.pointMaxX + margin;
  const bottom = metrics.pointMaxY + margin;
  return rectsIntersect(bounds, { x: left, y: top, width: right - left, height: bottom - top });
}

function rectsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
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

function fallbackTerrainColor(textureId: string): string {
  let hash = 0;
  for (let i = 0; i < textureId.length; i += 1) {
    hash = (hash * 31 + textureId.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 32% 42%)`;
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
