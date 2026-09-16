import { TerrainMapValidationError } from "./error";
import { composeTerrainLayerPixels } from "./composite";
import { renderNineSlice } from "./nine-slice";
import { resolveTerrainMorphologyLiquidGeometry } from "./morphology";
import { builtInTerrainPresets, TerrainPreset } from "./presets";
import type {
  PrepareTerrainMapInput,
  PreparedTerrainMap,
  RasterImage,
  TerrainMorphologyFeature,
  TerrainRenderBounds,
  TerrainRenderFrame,
  TerrainRenderMode,
  TerrainTextureDefinition,
} from "./types";

interface PreparedTerrainState {
  disposed: boolean;
  overlays: Map<string, Uint8ClampedArray>;
}

const preparedState = new WeakMap<object, PreparedTerrainState>();

export function prepareTerrainMap(input: PrepareTerrainMapInput): PreparedTerrainMap {
  validateMap(input.map);
  for (const [key, image] of Object.entries(input.textures)) validateRaster(image, `textures.${key}`);
  const prepared: PreparedTerrainMap = {
    map: input.map,
    textures: { ...input.textures },
    presets: { ...builtInTerrainPresets, ...input.presets },
    get disposed(): boolean { return preparedState.get(prepared)?.disposed ?? true; },
  };
  preparedState.set(prepared, { disposed: false, overlays: new Map() });
  return prepared;
}

export function disposeTerrainMap(terrain: PreparedTerrainMap): void {
  const state = preparedState.get(terrain as object);
  if (state) {
    state.disposed = true;
    state.overlays.clear();
  }
}

export function renderTerrainRegion(
  terrain: PreparedTerrainMap,
  options: { bounds?: TerrainRenderBounds; timeMs?: number } = {},
): TerrainRenderFrame {
  if (terrain.disposed) throw new Error("Prepared terrain map has been disposed");
  const requested = clampBounds(options.bounds, terrain.map.width, terrain.map.height);
  const margin = options.bounds ? resolveRenderMargin(terrain) : 0;
  const bounds = clampBounds({
    x: requested.x - margin,
    y: requested.y - margin,
    width: requested.width + margin * 2,
    height: requested.height + margin * 2,
  }, terrain.map.width, terrain.map.height);
  const output = new Uint8ClampedArray(bounds.width * bounds.height * 4);
  renderBaseTerrain(terrain, bounds, output, options.timeMs);
  renderMorphology(terrain, bounds, output, options.timeMs);
  return bounds.x === requested.x && bounds.y === requested.y
    && bounds.width === requested.width && bounds.height === requested.height
    ? { ...requested, pixels: output }
    : cropFrame(output, bounds, requested);
}

function resolveRenderMargin(terrain: PreparedTerrainMap): number {
  const transition = terrain.map.transitions.reduce((maximum, rule) => {
    const width = rule.mode.type === "fade" ? Number(rule.mode.width) || 18 : 0;
    return Math.max(maximum, width);
  }, 0);
  const morphology = terrain.map.morphology.reduce((maximum, feature) =>
    Math.max(maximum, Number(feature.params.height ?? feature.params.depth) || 0), 0);
  return Math.ceil(Math.max(24, transition + 8, morphology + 8, terrain.map.tileSize * 3));
}

function cropFrame(
  source: Uint8ClampedArray,
  sourceBounds: TerrainRenderBounds,
  requested: TerrainRenderBounds,
): TerrainRenderFrame {
  const pixels = new Uint8ClampedArray(requested.width * requested.height * 4);
  const offsetX = requested.x - sourceBounds.x;
  const offsetY = requested.y - sourceBounds.y;
  for (let y = 0; y < requested.height; y += 1) {
    const sourceStart = ((offsetY + y) * sourceBounds.width + offsetX) * 4;
    pixels.set(source.subarray(sourceStart, sourceStart + requested.width * 4), y * requested.width * 4);
  }
  return { ...requested, pixels };
}

function renderBaseTerrain(
  terrain: PreparedTerrainMap,
  bounds: TerrainRenderBounds,
  output: Uint8ClampedArray,
  timeMs?: number,
): void {
  const control = terrain.map.controlTexture;
  const controlImage = resolveControlImage(terrain);
  const layers = terrain.map.textures
    .map((texture, index) => ({
      texture,
      paletteIndex: control?.palette.indexOf(texture.id) ?? index,
      priority: texture.priority ?? (control?.palette.indexOf(texture.id) ?? index),
    }))
    .filter(({ paletteIndex }) => paletteIndex >= 0)
    .sort((left, right) => left.priority - right.priority || left.paletteIndex - right.paletteIndex);
  const masks = new Map<string, Uint8ClampedArray>();
  for (const { texture } of layers) {
    masks.set(texture.id, controlImage && control
      ? createRegionMask(controlImage, control.palette, texture.id, bounds, terrain.map.width, terrain.map.height)
      : createGridRegionMask(terrain, texture, bounds));
  }

  const composites = layers.map(({ texture }) => {
    const mode = texture.defaultRenderMode ?? { type: "fade", width: 18, curve: "smooth" };
    const rawMask = masks.get(texture.id)!;
    const mask = createSoftMask(rawMask, bounds.width, bounds.height, resolveLayerBlendRadius(terrain, texture, mode));
    applyHardTransitionCutouts(mask, terrain, texture.id, masks);
    const pixels = mode.type === "nine-slice"
      ? renderPreparedOverlay(terrain, texture, mode, bounds, timeMs) ?? new Uint8ClampedArray(rawMask.length)
      : createTexturePixels(terrain, texture, bounds);
    return { pixels, mask };
  });
  output.set(composeTerrainLayerPixels(bounds.width, bounds.height, composites));

  for (const { texture } of layers) {
    const mode = texture.defaultRenderMode ?? { type: "fade", width: 18, curve: "smooth" };
    if (mode.type === "nine-slice") continue;
    const mask = masks.get(texture.id)!;
    applyMode(terrain, texture, mode, mask, bounds, output, timeMs);
  }
}

function createTexturePixels(
  terrain: PreparedTerrainMap,
  texture: TerrainTextureDefinition,
  bounds: TerrainRenderBounds,
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(bounds.width * bounds.height * 4);
  for (let y = 0; y < bounds.height; y += 1) for (let x = 0; x < bounds.width; x += 1) {
    const color = sampleTexture(terrain, texture, bounds.x + x, bounds.y + y);
    pixels.set(color, (y * bounds.width + x) * 4);
  }
  return pixels;
}

function resolveLayerBlendRadius(
  terrain: PreparedTerrainMap,
  texture: TerrainTextureDefinition,
  mode: TerrainRenderMode,
): number {
  if (isHardTopologyMode(mode)) return 0;
  const transitionRadii = terrain.map.transitions
    .filter((rule) => rule.from === texture.id || rule.to === texture.id)
    .map((rule) => resolveModeBlendRadius(rule.mode));
  return Math.max(resolveModeBlendRadius(mode), ...transitionRadii);
}

function resolveModeBlendRadius(mode: TerrainRenderMode): number {
  if (mode.type === "hard" || mode.type === "nine-slice") return 0;
  if (mode.type === "fade") return positiveNumber(mode.width, 18);
  if (mode.type === "water") return mode.border === false ? 8 : 16;
  const width = Number(mode.params?.blendRadius ?? mode.params?.width);
  return Number.isFinite(width) && width >= 0 ? width : 18;
}

function isHardTopologyMode(mode: TerrainRenderMode): boolean {
  return mode.type === "nine-slice" || (mode.type === "custom" && [
    TerrainPreset.Carpet,
    TerrainPreset.RoadTownMarked,
    TerrainPreset.RoadTownSidewalk,
    "carpet-border",
    "road-town-marked",
    "road-town-sidewalk",
  ].includes(mode.shaderKey));
}

function createSoftMask(
  rawMask: Uint8ClampedArray,
  width: number,
  height: number,
  radiusValue: number,
): Uint8ClampedArray {
  const radius = Math.max(0, Math.round(radiusValue));
  if (radius === 0) return rawMask.slice();
  const horizontal = new Float64Array(width * height);
  const output = new Uint8ClampedArray(rawMask.length);
  const diameter = radius * 2 + 1;
  for (let y = 0; y < height; y += 1) {
    let sum = 0;
    for (let x = -radius; x <= radius; x += 1) if (x >= 0 && x < width) sum += rawMask[(y * width + x) * 4 + 3];
    for (let x = 0; x < width; x += 1) {
      horizontal[y * width + x] = sum / diameter;
      const removeX = x - radius;
      const addX = x + radius + 1;
      if (removeX >= 0) sum -= rawMask[(y * width + removeX) * 4 + 3];
      if (addX < width) sum += rawMask[(y * width + addX) * 4 + 3];
    }
  }
  for (let x = 0; x < width; x += 1) {
    let sum = 0;
    for (let y = -radius; y <= radius; y += 1) if (y >= 0 && y < height) sum += horizontal[y * width + x];
    for (let y = 0; y < height; y += 1) {
      const alpha = Math.round(sum / diameter);
      const offset = (y * width + x) * 4;
      output[offset] = output[offset + 1] = output[offset + 2] = alpha > 0 ? 255 : 0;
      output[offset + 3] = alpha;
      const removeY = y - radius;
      const addY = y + radius + 1;
      if (removeY >= 0) sum -= horizontal[removeY * width + x];
      if (addY < height) sum += horizontal[addY * width + x];
    }
  }
  return output;
}

function applyHardTransitionCutouts(
  mask: Uint8ClampedArray,
  terrain: PreparedTerrainMap,
  textureId: string,
  masks: ReadonlyMap<string, Uint8ClampedArray>,
): void {
  const hardNeighbors = new Set(terrain.map.transitions
    .filter((rule) => rule.mode.type === "hard" && (rule.from === textureId || rule.to === textureId))
    .map((rule) => rule.from === textureId ? rule.to : rule.from));
  for (const texture of terrain.map.textures) {
    if (texture.id !== textureId && texture.defaultRenderMode?.type === "nine-slice") hardNeighbors.add(texture.id);
  }
  for (const neighborId of hardNeighbors) {
    const neighbor = masks.get(neighborId);
    if (!neighbor) continue;
    for (let offset = 3; offset < mask.length; offset += 4) if (neighbor[offset] > 0) mask[offset] = 0;
  }
}

function createGridRegionMask(
  terrain: PreparedTerrainMap,
  texture: TerrainTextureDefinition,
  bounds: TerrainRenderBounds,
): Uint8ClampedArray {
  const mask = new Uint8ClampedArray(bounds.width * bounds.height * 4);
  const grid = terrain.map.terrain;
  if (!grid) return mask;
  for (let y = 0; y < bounds.height; y += 1) for (let x = 0; x < bounds.width; x += 1) {
    const tileX = Math.floor((bounds.x + x) / terrain.map.tileSize);
    const tileY = Math.floor((bounds.y + y) / terrain.map.tileSize);
    if ((grid[tileY]?.[tileX] ?? 0) !== texture.index) continue;
    const offset = (y * bounds.width + x) * 4;
    mask[offset] = mask[offset + 1] = mask[offset + 2] = mask[offset + 3] = 255;
  }
  return mask;
}

function applyMode(
  terrain: PreparedTerrainMap,
  texture: TerrainTextureDefinition,
  mode: TerrainRenderMode,
  mask: Uint8ClampedArray,
  bounds: TerrainRenderBounds,
  output: Uint8ClampedArray,
  timeMs?: number,
): void {
  if (mode.type === "nine-slice" || mode.type === "custom") {
    const overlay = renderPreparedOverlay(terrain, texture, mode, bounds, timeMs);
    if (overlay) blendOverlay(output, overlay);
    return;
  }
  let overlay: Uint8ClampedArray | undefined;
  if (mode.type === "water" || texture.specialType === "water") {
    overlay = renderWaterOverlay(mask, bounds, terrain.map.width, terrain.map.waterAnimation, timeMs, mode.type === "water" ? mode : undefined);
  } else if (mode.type === "fade" && Number(mode.width) === 12 && mode.curve === "sharp") {
    overlay = renderEdgeOverlay(mask, bounds.width, bounds.height, [216, 236, 133, 48]);
  }
  if (overlay) {
    validatePresetOutput(overlay, bounds, mode.type);
    blendOverlay(output, overlay);
  }
}

function renderPreparedOverlay(
  terrain: PreparedTerrainMap,
  texture: TerrainTextureDefinition,
  mode: Extract<TerrainRenderMode, { type: "nine-slice" | "custom" }>,
  bounds: TerrainRenderBounds,
  timeMs?: number,
): Uint8ClampedArray | undefined {
  const state = preparedState.get(terrain as object);
  if (!state) return undefined;
  const cacheKey = `${texture.id}:${JSON.stringify(mode)}`;
  let fullOverlay = timeMs === undefined ? state.overlays.get(cacheKey) : undefined;
  if (!fullOverlay) {
    const fullBounds = { x: 0, y: 0, width: terrain.map.width, height: terrain.map.height };
    const control = terrain.map.controlTexture;
    const controlImage = resolveControlImage(terrain);
    const fullMask = control && controlImage
      ? createRegionMask(controlImage, control.palette, texture.id, fullBounds, terrain.map.width, terrain.map.height)
      : createGridRegionMask(terrain, texture, fullBounds);
    if (mode.type === "nine-slice") {
      const source = extractTextureRaster(terrain, texture);
      if (source) {
        fullOverlay = renderNineSlice({
          width: fullBounds.width,
          height: fullBounds.height,
          mask: fullMask,
          source,
          center: mode.center,
          renderTileSize: texture.renderTileSize ?? terrain.map.tileSize,
        });
      }
    } else {
      fullOverlay = terrain.presets[mode.shaderKey]?.({
          width: fullBounds.width,
          height: fullBounds.height,
          tileSize: terrain.map.tileSize,
          mask: fullMask,
          params: mode.params ?? {},
          originX: 0,
          originY: 0,
          timeMs,
        });
    }
    if (fullOverlay) {
      validatePresetOutput(fullOverlay, fullBounds, mode.type === "custom" ? mode.shaderKey : mode.type);
      if (timeMs === undefined) state.overlays.set(cacheKey, fullOverlay);
    }
  }
  return fullOverlay ? cropPixels(fullOverlay, terrain.map.width, bounds) : undefined;
}

function cropPixels(
  source: Uint8ClampedArray,
  sourceWidth: number,
  bounds: TerrainRenderBounds,
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(bounds.width * bounds.height * 4);
  for (let y = 0; y < bounds.height; y += 1) {
    const start = ((bounds.y + y) * sourceWidth + bounds.x) * 4;
    pixels.set(source.subarray(start, start + bounds.width * 4), y * bounds.width * 4);
  }
  return pixels;
}

function createRegionMask(
  control: RasterImage,
  palette: string[],
  textureId: string,
  bounds: TerrainRenderBounds,
  mapWidth: number,
  mapHeight: number,
): Uint8ClampedArray {
  const mask = new Uint8ClampedArray(bounds.width * bounds.height * 4);
  const wanted = palette.indexOf(textureId);
  if (wanted < 0) return mask;
  for (let y = 0; y < bounds.height; y += 1) for (let x = 0; x < bounds.width; x += 1) {
    const cx = Math.min(control.width - 1, Math.floor((bounds.x + x) * control.width / mapWidth));
    const cy = Math.min(control.height - 1, Math.floor((bounds.y + y) * control.height / mapHeight));
    const source = (cy * control.width + cx) * 4;
    if (control.pixels[source] + control.pixels[source + 1] * 256 !== wanted) continue;
    const target = (y * bounds.width + x) * 4;
    mask[target] = mask[target + 1] = mask[target + 2] = 255;
    mask[target + 3] = control.pixels[source + 3];
  }
  return mask;
}

function sampleTexture(terrain: PreparedTerrainMap, definition: TerrainTextureDefinition, x: number, y: number): readonly [number, number, number, number] {
  const image = resolveTexture(terrain, definition);
  if (!image) return fallbackColor(definition.id);
  const grid = terrain.map.textureGrid;
  const rect = definition.sourceRect ?? {
    x: (definition.index % grid.columns) * grid.tileSize,
    y: Math.floor(definition.index / grid.columns) * grid.tileSize,
    width: grid.tileSize,
    height: grid.tileSize,
  };
  const period = definition.renderTileSize ?? terrain.map.tileSize;
  const sx = Math.min(image.width - 1, rect.x + Math.floor(mod(x, period) / period * rect.width));
  const sy = Math.min(image.height - 1, rect.y + Math.floor(mod(y, period) / period * rect.height));
  const offset = (sy * image.width + sx) * 4;
  return [image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2], image.pixels[offset + 3]];
}

function resolveTexture(terrain: PreparedTerrainMap, definition: TerrainTextureDefinition): RasterImage | undefined {
  return terrain.textures[definition.source ?? ""] ?? terrain.textures[definition.id]
    ?? (terrain.map.sourceTexture ? terrain.textures[terrain.map.sourceTexture] : undefined);
}

function resolveControlImage(terrain: PreparedTerrainMap): RasterImage | undefined {
  const control = terrain.map.controlTexture;
  return control?.pixels
    ? { width: control.width, height: control.height, pixels: control.pixels }
    : control?.source ? terrain.textures[control.source] : undefined;
}

function extractTextureRaster(terrain: PreparedTerrainMap, definition: TerrainTextureDefinition): RasterImage | undefined {
  const source = resolveTexture(terrain, definition);
  if (!source) return undefined;
  const grid = terrain.map.textureGrid;
  const rect = definition.sourceRect ?? {
    x: (definition.index % grid.columns) * grid.tileSize,
    y: Math.floor(definition.index / grid.columns) * grid.tileSize,
    width: grid.tileSize,
    height: grid.tileSize,
  };
  const width = Math.max(1, Math.min(source.width - rect.x, rect.width));
  const height = Math.max(1, Math.min(source.height - rect.y, rect.height));
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const start = ((rect.y + y) * source.width + rect.x) * 4;
    pixels.set(source.pixels.subarray(start, start + width * 4), y * width * 4);
  }
  return { width, height, pixels };
}

function renderMorphology(terrain: PreparedTerrainMap, bounds: TerrainRenderBounds, output: Uint8ClampedArray, timeMs?: number): void {
  for (const feature of terrain.map.morphology) {
    const mask = rasterizeFeature(feature, bounds);
    const featureBounds = resolveFeatureBounds(feature);
    const height = Math.max(2, Number(feature.params.height ?? feature.params.depth) || terrain.map.tileSize * 0.35);
    const fillHeight = clamp(Number(feature.params.fillHeight ?? 0), 0, 100);
    const fillTextureId = typeof feature.params.fillTextureId === "string" ? feature.params.fillTextureId : undefined;
    const fillTexture = fillTextureId ? terrain.map.textures.find((texture) => texture.id === fillTextureId) : undefined;
    const fillLevel = featureBounds.y + featureBounds.height * (1 - fillHeight / 100);
    const liquidGeometry = resolveTerrainMorphologyLiquidGeometry({
      bounds: {
        minX: 0,
        minY: 0,
        maxX: Math.max(0, featureBounds.width - 1),
        maxY: Math.max(0, featureBounds.height - 1),
      },
      depth: height,
      fillHeight,
      tileSize: terrain.map.tileSize,
    });
    const color = parseColor(typeof feature.params.fillColor === "string" ? feature.params.fillColor : undefined,
      feature.kind === "hole" ? [26, 22, 20, 235] : [103, 83, 57, 220]);
    for (let index = 0; index < mask.length; index += 1) {
      if (!mask[index]) continue;
      const offset = index * 4;
      const y = Math.floor(index / bounds.width);
      const edge = isMaskEdge(mask, bounds.width, bounds.height, index);
      if (edge && (feature.kind !== "hole" || liquidGeometry.wallAlpha > 0)) {
        blendPixel(output, offset, feature.kind === "hole"
          ? [25, 18, 15, liquidGeometry.wallAlpha * 255]
          : [235, 218, 176, 170]);
      }
      else blendPixel(output, offset, color);
      if (feature.kind === "hole" && fillHeight > 0) {
        const worldX = bounds.x + index % bounds.width;
        const worldY = bounds.y + y;
        if (worldY >= fillLevel || fillHeight === 100) {
          const worldIndex = worldY * terrain.map.width + worldX;
          const wave = timeMs === undefined ? 0 : Math.sin((timeMs * 0.002 + worldIndex * 0.07) * terrain.map.waterAnimation.speed) * terrain.map.waterAnimation.intensity;
          const sampled = fillTexture ? sampleTexture(terrain, fillTexture, worldX, worldY) : undefined;
          blendPixel(output, offset, sampled
            ? [sampled[0] + wave * 8, sampled[1] + wave * 10, sampled[2] + wave * 12, Math.min(235, sampled[3])]
            : [60 + wave * 12, 128 + wave * 16, 151 + wave * 18, 220]);
        }
      } else if (feature.kind === "wall" && y + height < bounds.height && mask[index + Math.round(height) * bounds.width] === 0) {
        blendPixel(output, offset, [30, 22, 16, 90]);
      }
    }
  }
}

function resolveFeatureBounds(feature: TerrainMorphologyFeature): TerrainRenderBounds {
  const strokes = [
    ...feature.strokes,
    ...(feature.eraserStrokes ?? []),
    ...(feature.operations ?? []).map((operation) => operation.stroke),
  ];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const stroke of strokes) for (const point of stroke.points) {
    minX = Math.min(minX, point.x - stroke.radius);
    minY = Math.min(minY, point.y - stroke.radius);
    maxX = Math.max(maxX, point.x + stroke.radius);
    maxY = Math.max(maxY, point.y + stroke.radius);
  }
  return Number.isFinite(minX)
    ? { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) }
    : { x: 0, y: 0, width: 1, height: 1 };
}

function rasterizeFeature(feature: TerrainMorphologyFeature, bounds: TerrainRenderBounds): Uint8Array {
  const mask = new Uint8Array(bounds.width * bounds.height);
  const operations = feature.operations?.length ? feature.operations : [
    ...feature.strokes.map((stroke) => ({ mode: "paint" as const, stroke })),
    ...(feature.eraserStrokes ?? []).map((stroke) => ({ mode: "erase" as const, stroke })),
  ];
  for (const operation of operations) rasterizeStroke(mask, bounds, operation.stroke.points, operation.stroke.radius, operation.mode === "paint");
  return mask;
}

function rasterizeStroke(mask: Uint8Array, bounds: TerrainRenderBounds, points: Array<{ x: number; y: number }>, radius: number, paint: boolean): void {
  for (let segment = 0; segment < Math.max(1, points.length - 1); segment += 1) {
    const from = points[segment]; const to = points[Math.min(points.length - 1, segment + 1)];
    const minX = Math.max(bounds.x, Math.floor(Math.min(from.x, to.x) - radius));
    const maxX = Math.min(bounds.x + bounds.width - 1, Math.ceil(Math.max(from.x, to.x) + radius));
    const minY = Math.max(bounds.y, Math.floor(Math.min(from.y, to.y) - radius));
    const maxY = Math.min(bounds.y + bounds.height - 1, Math.ceil(Math.max(from.y, to.y) + radius));
    for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
      if (distanceToSegment(x, y, from, to) <= radius) mask[(y - bounds.y) * bounds.width + x - bounds.x] = paint ? 1 : 0;
    }
  }
}

function renderWaterOverlay(mask: Uint8ClampedArray, bounds: TerrainRenderBounds, mapWidth: number, animation: { enabled: boolean; speed: number; intensity: number }, timeMs?: number, mode?: { border?: boolean; foam?: boolean }): Uint8ClampedArray {
  const { width, height } = bounds;
  const output = new Uint8ClampedArray(mask.length);
  for (let index = 0; index < width * height; index += 1) {
    if (!mask[index * 4 + 3]) continue;
    const edge = isRgbaMaskEdge(mask, width, height, index);
    const x = index % width;
    const y = Math.floor(index / width);
    const worldIndex = (bounds.y + y) * mapWidth + bounds.x + x;
    const wave = timeMs === undefined || !animation.enabled ? 0 : Math.sin(timeMs * 0.002 * animation.speed + worldIndex * 0.05) * animation.intensity;
    const offset = index * 4;
    output[offset] = 95 + wave * 20; output[offset + 1] = 185 + wave * 25; output[offset + 2] = 220 + wave * 25;
    output[offset + 3] = edge && mode?.border !== false ? (mode?.foam === false ? 85 : 145) : 35;
  }
  return output;
}

function renderEdgeOverlay(mask: Uint8ClampedArray, width: number, height: number, color: readonly number[]): Uint8ClampedArray {
  const output = new Uint8ClampedArray(mask.length);
  for (let index = 0; index < width * height; index += 1) if (mask[index * 4 + 3] && isRgbaMaskEdge(mask, width, height, index)) {
    output.set(color, index * 4);
  }
  return output;
}

function blendOverlay(target: Uint8ClampedArray, overlay: Uint8ClampedArray): void {
  for (let offset = 0; offset < target.length; offset += 4) if (overlay[offset + 3]) blendPixel(target, offset, [overlay[offset], overlay[offset + 1], overlay[offset + 2], overlay[offset + 3]]);
}
function blendPixel(target: Uint8ClampedArray, offset: number, color: readonly number[]): void {
  const alpha = clamp((color[3] ?? 255) / 255, 0, 1);
  target[offset] = target[offset] * (1 - alpha) + color[0] * alpha;
  target[offset + 1] = target[offset + 1] * (1 - alpha) + color[1] * alpha;
  target[offset + 2] = target[offset + 2] * (1 - alpha) + color[2] * alpha;
  target[offset + 3] = Math.max(target[offset + 3], alpha * 255);
}
function isRgbaMaskEdge(mask: Uint8ClampedArray, width: number, height: number, index: number): boolean {
  const x = index % width; const y = Math.floor(index / width);
  return x === 0 || y === 0 || x === width - 1 || y === height - 1
    || !mask[(index - 1) * 4 + 3] || !mask[(index + 1) * 4 + 3]
    || !mask[(index - width) * 4 + 3] || !mask[(index + width) * 4 + 3];
}
function isMaskEdge(mask: Uint8Array, width: number, height: number, index: number): boolean {
  const x = index % width; const y = Math.floor(index / width);
  return x === 0 || y === 0 || x === width - 1 || y === height - 1 || !mask[index - 1] || !mask[index + 1] || !mask[index - width] || !mask[index + width];
}
function distanceToSegment(x: number, y: number, from: { x: number; y: number }, to: { x: number; y: number }): number {
  const dx = to.x - from.x; const dy = to.y - from.y; const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : clamp(((x - from.x) * dx + (y - from.y) * dy) / length, 0, 1);
  return Math.hypot(x - (from.x + dx * t), y - (from.y + dy * t));
}
function parseColor(value: string | undefined, fallback: readonly [number, number, number, number]): readonly [number, number, number, number] {
  if (!value) return fallback;
  const match = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3]), match[4] ? Number(match[4]) * 255 : 255] : fallback;
}
function fallbackColor(value: string): readonly [number, number, number, number] {
  let hash = 2166136261; for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return [64 + (hash & 63), 72 + ((hash >>> 8) & 63), 64 + ((hash >>> 16) & 63), 255];
}
function clampBounds(value: TerrainRenderBounds | undefined, width: number, height: number): TerrainRenderBounds {
  if (!value) return { x: 0, y: 0, width, height };
  const x = Math.max(0, Math.min(width, Math.floor(value.x))); const y = Math.max(0, Math.min(height, Math.floor(value.y)));
  return { x, y, width: Math.max(0, Math.min(width - x, Math.ceil(value.width))), height: Math.max(0, Math.min(height - y, Math.ceil(value.height))) };
}
function validateMap(map: PrepareTerrainMapInput["map"]): void {
  if (!map || typeof map !== "object") throw new TerrainMapValidationError("map", "expected an object");
  if (!(map.width > 0)) throw new TerrainMapValidationError("map.width", "expected a positive number");
  if (!(map.height > 0)) throw new TerrainMapValidationError("map.height", "expected a positive number");
  if (!map.textures.length) throw new TerrainMapValidationError("map.textures", "expected at least one texture");
}
function validateRaster(image: RasterImage, path: string): void {
  if (!(image.width > 0) || !(image.height > 0)) throw new TerrainMapValidationError(path, "invalid dimensions");
  if (!(image.pixels instanceof Uint8ClampedArray) || image.pixels.length !== image.width * image.height * 4) throw new TerrainMapValidationError(`${path}.pixels`, "expected width * height * 4 RGBA bytes");
}
function validatePresetOutput(output: Uint8ClampedArray, bounds: TerrainRenderBounds, key: string): void {
  if (!(output instanceof Uint8ClampedArray) || output.length !== bounds.width * bounds.height * 4) {
    throw new TerrainMapValidationError(`presets.${key}`, "expected width * height * 4 RGBA bytes");
  }
}
function positiveNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}
function mod(value: number, divisor: number): number { return ((value % divisor) + divisor) % divisor; }
function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
