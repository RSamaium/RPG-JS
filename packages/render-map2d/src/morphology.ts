export interface TerrainMorphologyAlphaBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface TerrainMorphologyLiquidEdgeMetrics {
  antiAliasWidth: number;
  contactWidth: number;
  contourSmoothingRadius: number;
  innerTransitionWidth: number;
  meniscusWidth: number;
  nearEdgeWidth: number;
}

export interface TerrainMorphologyLiquidGeometry {
  dropY: number;
  inset: number;
  level: number;
  metrics: TerrainMorphologyLiquidEdgeMetrics;
  wallAlpha: number;
}

export interface ResolveTerrainMorphologyLiquidGeometryInput {
  bounds: TerrainMorphologyAlphaBounds;
  depth: number;
  fillHeight: number;
  tileSize: number;
}

/**
 * Resolves the shared geometry used to render a liquid inside a recessed
 * morphology. It is deliberately independent from Canvas and Pixi so every
 * adapter uses the same level, inset and edge widths.
 */
export function resolveTerrainMorphologyLiquidGeometry(
  input: ResolveTerrainMorphologyLiquidGeometryInput,
): TerrainMorphologyLiquidGeometry {
  const level = clamp(Number(input.fillHeight) / 100, 0, 1);
  const tileSize = Math.max(1, Number(input.tileSize) || 48);
  const metrics = resolveTerrainMorphologyLiquidEdgeMetrics(tileSize);
  const width = Math.max(1, input.bounds.maxX - input.bounds.minX + 1);
  const height = Math.max(1, input.bounds.maxY - input.bounds.minY + 1);
  const maxInset = Math.max(1, Math.floor(Math.min(width, height) * 0.24));
  const liquidLevelInset = Math.round((1 - level) * tileSize * 0.12);

  return {
    dropY: Math.round((1 - level) * Math.max(1, Number(input.depth) || 1) * 0.78),
    inset: Math.min(maxInset, metrics.contactWidth + metrics.meniscusWidth + liquidLevelInset),
    level,
    metrics,
    wallAlpha: clamp((1 - level) * 1.8, 0, 0.72),
  };
}

export function resolveTerrainMorphologyLiquidEdgeMetrics(
  tileSize: number,
): TerrainMorphologyLiquidEdgeMetrics {
  const size = Math.max(1, Number(tileSize) || 48);
  return {
    antiAliasWidth: 1,
    contactWidth: Math.round(clamp(size * 0.04, 1, 3)),
    contourSmoothingRadius: Math.round(clamp(size * 0.12, 3, 7)),
    innerTransitionWidth: Math.round(clamp(size * 0.17, 6, 10)),
    meniscusWidth: Math.round(clamp(size * 0.03, 1, 2)),
    nearEdgeWidth: Math.round(clamp(size * 0.1, 4, 6)),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
