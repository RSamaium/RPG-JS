import { holeMorphologyContours } from "./morphology-contours";
import {
  type StudioCollisionPolygon,
  type StudioTerrainMorphologyFeature,
  type StudioTerrainStroke,
} from "./types";
import { createStudioTerrainRenderData } from "./map-normalizer";
import { resolveStudioElementSize } from "../studio-element-size";

interface BooleanMask {
  width: number;
  height: number;
  cells: boolean[][];
}

interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

export function buildStudioTerrainCollisionPolygons(map: any): StudioCollisionPolygon[] {
  const data = createStudioTerrainRenderData(map);
  const alwaysLowElementRects = resolveAlwaysLowElementWalkableRects(map, data.width, data.height);
  const terrainMask = createEmptyMask(data.widthTiles, data.heightTiles);

  for (let y = 0; y < data.heightTiles; y += 1) {
    for (let x = 0; x < data.widthTiles; x += 1) {
      terrainMask.cells[y][x] = data.terrainGrid[y]?.[x]?.collision === true;
    }
  }

  const polygons = pixelRectanglesToPolygons(
    subtractRects(maskRectanglesToPixelRects(maskToRectangles(terrainMask), data.tileSize), alwaysLowElementRects),
    "terrain_collision",
    "terrain",
    data.tileSize
  );

  data.morphologyFeatures.forEach((feature) => {
    if (feature.kind === "wall") {
      polygons.push(...createWallMorphologyCollisionPolygons(
        feature,
        data.width,
        data.height,
        data.tileSize,
        alwaysLowElementRects
      ));
      return;
    }

    polygons.push(...createHoleMorphologyCollisionPolygons(
      feature,
      data.width,
      data.height,
      data.tileSize,
      alwaysLowElementRects
    ));
  });

  return polygons;
}

function createEmptyMask(width: number, height: number): BooleanMask {
  return {
    width,
    height,
    cells: Array.from({ length: height }, () => Array(width).fill(false)),
  };
}

function getEffectiveMorphologyStrokes(feature: StudioTerrainMorphologyFeature): StudioTerrainStroke[] {
  if (feature.operations?.length) {
    return feature.operations.reduce<StudioTerrainStroke[]>((strokes, operation) => {
      if (operation.mode === "paint") {
        return [...strokes, operation.stroke];
      }
      return strokes.flatMap((stroke) => subtractMorphologyStroke(stroke, operation.stroke));
    }, []);
  }

  return (feature.eraserStrokes ?? []).reduce<StudioTerrainStroke[]>(
    (strokes, eraserStroke) => strokes.flatMap((stroke) => subtractMorphologyStroke(stroke, eraserStroke)),
    feature.strokes
  );
}

function subtractMorphologyStroke(stroke: StudioTerrainStroke, eraserStroke: StudioTerrainStroke): StudioTerrainStroke[] {
  const sampledPoints = sampleMorphologyStrokePoints(stroke, Math.max(4, Math.min(12, stroke.radius * 0.35, eraserStroke.radius * 0.35)));
  const visibleSegments: StudioTerrainStroke[] = [];
  let currentPoints: StudioTerrainStroke["points"] = [];

  sampledPoints.forEach((point) => {
    if (isPointInsideMorphologyStroke(point, eraserStroke)) {
      if (currentPoints.length > 0) {
        visibleSegments.push(createDerivedMorphologyStroke(stroke, visibleSegments.length, currentPoints));
        currentPoints = [];
      }
      return;
    }

    currentPoints.push(point);
  });

  if (currentPoints.length > 0) {
    visibleSegments.push(createDerivedMorphologyStroke(stroke, visibleSegments.length, currentPoints));
  }

  return visibleSegments;
}

function sampleMorphologyStrokePoints(stroke: StudioTerrainStroke, spacing: number): StudioTerrainStroke["points"] {
  if (stroke.points.length <= 1) return stroke.points;
  const points: StudioTerrainStroke["points"] = [];

  stroke.points.forEach((point, index) => {
    const previous = stroke.points[index - 1];
    if (!previous) {
      points.push(point);
      return;
    }

    const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
    const steps = Math.max(1, Math.ceil(distance / spacing));
    for (let step = 1; step <= steps; step += 1) {
      const ratio = step / steps;
      points.push({
        x: previous.x + (point.x - previous.x) * ratio,
        y: previous.y + (point.y - previous.y) * ratio,
      });
    }
  });

  return points;
}

function createDerivedMorphologyStroke(
  source: StudioTerrainStroke,
  index: number,
  points: StudioTerrainStroke["points"]
): StudioTerrainStroke {
  return {
    ...source,
    id: `${source.id}_visible_${index}`,
    points,
  };
}

function isPointInsideMorphologyStroke(point: Point, stroke: StudioTerrainStroke): boolean {
  if (stroke.points.length === 0) return false;
  if (stroke.points.length === 1) {
    return Math.hypot(point.x - stroke.points[0].x, point.y - stroke.points[0].y) <= stroke.radius;
  }

  for (let index = 1; index < stroke.points.length; index += 1) {
    if (distanceToSegment(point, stroke.points[index - 1], stroke.points[index]) <= stroke.radius) {
      return true;
    }
  }

  return false;
}

function distanceToSegment(point: Point, from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 0.000001) {
    return Math.hypot(point.x - from.x, point.y - from.y);
  }

  const ratio = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (from.x + dx * ratio), point.y - (from.y + dy * ratio));
}

function resolveWallBackCollisionOffset(feature: StudioTerrainMorphologyFeature, tileSize: number): number {
  const explicitOffset = Number(feature.params.backCollisionOffset ?? feature.params.collisionOffsetY);
  if (Number.isFinite(explicitOffset) && explicitOffset >= 0) {
    return Math.min(tileSize * 4, explicitOffset);
  }

  const wallHeight = Number(feature.params.height);
  const resolvedHeight = Number.isFinite(wallHeight) && wallHeight > 0 ? wallHeight : tileSize;
  return Math.max(tileSize * 0.45, Math.min(tileSize * 4, resolvedHeight));
}

function createHoleMorphologyCollisionPolygons(
  feature: StudioTerrainMorphologyFeature,
  mapWidth: number,
  mapHeight: number,
  tileSize: number,
  clearRects: PixelRect[]
): StudioCollisionPolygon[] {
  const thickness = resolveHoleCollisionThickness(feature, tileSize);
  const polygons: StudioCollisionPolygon[] = [];

  holeMorphologyContours(feature, mapWidth, mapHeight).forEach((contour, contourIndex) => {
    const normals = contour.map((point, index) => {
      const next = contour[(index + 1) % contour.length];
      const length = Math.hypot(next.x - point.x, next.y - point.y);
      return { x: -(next.y - point.y) / length, y: (next.x - point.x) / length };
    });
    const offsets = normals.map((normal, index) => {
      const previous = normals[(index + normals.length - 1) % normals.length];
      const scale = Math.min(thickness, thickness * 0.5 / Math.max(0.25, 1 + normal.x * previous.x + normal.y * previous.y));
      return { x: (normal.x + previous.x) * scale, y: (normal.y + previous.y) * scale };
    });
    contour.forEach((point, index) => {
      const next = (index + 1) % contour.length;
      pushHolePolygon(polygons, [
        offsetPoint(point, offsets[index], -1),
        offsetPoint(contour[next], offsets[next], -1),
        offsetPoint(contour[next], offsets[next], 1),
        offsetPoint(point, offsets[index], 1),
      ], mapWidth, mapHeight, feature.id, `${contourIndex}_${index}`, clearRects);
    });
  });

  return polygons;
}

function resolveHoleCollisionThickness(feature: StudioTerrainMorphologyFeature, tileSize: number): number {
  const explicitThickness = Number(feature.params.collisionThickness ?? feature.params.edgeCollisionWidth);
  if (Number.isFinite(explicitThickness) && explicitThickness > 0) {
    return Math.min(tileSize * 0.6, explicitThickness);
  }
  return Math.max(8, Math.min(tileSize * 0.28, 14));
}

function pushHolePolygon(
  polygons: StudioCollisionPolygon[],
  points: Point[],
  mapWidth: number,
  mapHeight: number,
  sourceId: string,
  segmentId: string,
  clearRects: PixelRect[]
): void {
  let pieces = [convexHull(clampPolygonPoints(points, mapWidth, mapHeight))];
  for (const rect of clearRects) {
    pieces = pieces.flatMap(piece => subtractPolygonRect(piece, rect));
  }
  pieces.forEach((piece, index) => {
    const rounded = convexHull(piece.map(point => ({ x: Math.round(point.x), y: Math.round(point.y) })));
    if (rounded.length < 3 || Math.abs(polygonArea(rounded)) < 1) return;
    polygons.push(pointsToCollisionPolygon(
      rounded, "morphology_hole_edge_collision", sourceId, `${segmentId}_${index}`, "edge"
    ));
  });
}

function pointsToCollisionPolygon(
  points: Point[],
  type: StudioCollisionPolygon["type"],
  sourceId: string,
  segmentId: string,
  role?: string
): StudioCollisionPolygon {
  const roundedPoints = points.map((point) => [Math.round(point.x), Math.round(point.y)] as [number, number]);
  const xs = roundedPoints.map((point) => point[0]);
  const ys = roundedPoints.map((point) => point[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const width = Math.max(1, Math.max(...xs) - x);
  const height = Math.max(1, Math.max(...ys) - y);
  return {
    id: `${type}_${sourceId}_${segmentId}_${x}_${y}`,
    type,
    x,
    y,
    width,
    height,
    points: roundedPoints,
    properties: {
      source: sourceId,
      segment: segmentId,
      ...(role ? { role } : {}),
    },
  };
}

function createWallMorphologyCollisionPolygons(
  feature: StudioTerrainMorphologyFeature,
  mapWidth: number,
  mapHeight: number,
  tileSize: number,
  clearRects: PixelRect[]
): StudioCollisionPolygon[] {
  const thickness = resolveWallCollisionThickness(feature, tileSize);
  const backCollisionOffset = resolveWallBackCollisionOffset(feature, tileSize);
  const polygons: StudioCollisionPolygon[] = [];

  getEffectiveMorphologyStrokes(feature).forEach((stroke) => {
    if (stroke.points.length === 1) {
      pushWallCollisionRect(
        polygons,
        createWallSegmentCollisionRect(stroke.points[0], stroke.points[0], stroke.radius, thickness, backCollisionOffset, mapHeight),
        mapWidth,
        mapHeight,
        feature.id,
        stroke.id,
        clearRects
      );
      pushWallBodyCollisionRect(
        polygons,
        feature,
        stroke.points[0],
        stroke.points[0],
        stroke.radius,
        thickness,
        backCollisionOffset,
        mapWidth,
        mapHeight,
        tileSize,
        stroke.id,
        clearRects
      );
      return;
    }

    for (let index = 1; index < stroke.points.length; index += 1) {
      const segmentId = `${stroke.id}_${index}`;
      pushWallCollisionRect(
        polygons,
        createWallSegmentCollisionRect(
          stroke.points[index - 1],
          stroke.points[index],
          stroke.radius,
          thickness,
          backCollisionOffset,
          mapHeight
        ),
        mapWidth,
        mapHeight,
        feature.id,
        segmentId,
        clearRects
      );
      pushWallBodyCollisionRect(
        polygons,
        feature,
        stroke.points[index - 1],
        stroke.points[index],
        stroke.radius,
        thickness,
        backCollisionOffset,
        mapWidth,
        mapHeight,
        tileSize,
        segmentId,
        clearRects
      );
    }
  });

  return polygons;
}

function resolveWallCollisionThickness(feature: StudioTerrainMorphologyFeature, tileSize: number): number {
  const explicitThickness = Number(feature.params.collisionThickness ?? feature.params.edgeCollisionWidth);
  if (Number.isFinite(explicitThickness) && explicitThickness > 0) {
    return Math.min(tileSize, explicitThickness);
  }
  return Math.max(18, Math.min(tileSize * 0.58, 28));
}

function shouldCreateWallBodyCollision(
  feature: StudioTerrainMorphologyFeature,
  radius: number,
  tileSize: number
): boolean {
  if (feature.params.bodyCollision === false || feature.params.collisionMode === "edge") {
    return false;
  }
  if (feature.params.bodyCollision === true || feature.params.collisionMode === "body") {
    return true;
  }
  return radius >= tileSize * 1.1;
}

function pushWallBodyCollisionRect(
  polygons: StudioCollisionPolygon[],
  feature: StudioTerrainMorphologyFeature,
  from: { x: number; y: number },
  to: { x: number; y: number },
  radius: number,
  thickness: number,
  backCollisionOffset: number,
  mapWidth: number,
  mapHeight: number,
  tileSize: number,
  segmentId: string,
  clearRects: PixelRect[]
): void {
  if (!shouldCreateWallBodyCollision(feature, radius, tileSize)) return;
  pushWallCollisionRect(
    polygons,
    createWallSegmentBodyCollisionRect(
      from,
      to,
      radius,
      thickness,
      backCollisionOffset,
      mapHeight
    ),
    mapWidth,
    mapHeight,
    feature.id,
    `${segmentId}_body`,
    clearRects,
    "body"
  );
}

function createWallSegmentCollisionRect(
  from: { x: number; y: number },
  to: { x: number; y: number },
  radius: number,
  thickness: number,
  backCollisionOffset: number,
  mapHeight: number
): { x: number; y: number; width: number; height: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const isHorizontalWallFace = Math.abs(dy) <= Math.max(1, thickness * 0.25);
  const isVerticalWallSide = Math.abs(dx) <= Math.max(1, thickness * 0.25);
  const padding = Math.max(thickness * 0.5, Math.min(radius, thickness));

  if (isHorizontalWallFace) {
    const targetY = (from.y + to.y) / 2 + backCollisionOffset;
    const y =
      targetY + thickness * 0.5 > mapHeight
        ? mapHeight - thickness
        : targetY - thickness * 0.5;
    return {
      x: Math.min(from.x, to.x) - padding,
      y,
      width: Math.abs(dx) + padding * 2,
      height: thickness,
    };
  }

  if (isVerticalWallSide) {
    return {
      x: (from.x + to.x) / 2 - thickness * 0.5,
      y: Math.min(from.y, to.y) - padding,
      width: thickness,
      height: Math.abs(dy) + padding * 2,
    };
  }

  return {
    x: Math.min(from.x, to.x) - padding,
    y: Math.min(from.y, to.y) - padding,
    width: Math.abs(dx) + padding * 2,
    height: Math.abs(dy) + padding * 2,
  };
}

function createWallSegmentBodyCollisionRect(
  from: { x: number; y: number },
  to: { x: number; y: number },
  radius: number,
  thickness: number,
  backCollisionOffset: number,
  mapHeight: number
): { x: number; y: number; width: number; height: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const padding = Math.max(thickness * 0.5, radius);
  const isHorizontalWallFace = Math.abs(dy) <= Math.max(1, thickness * 0.25);
  const isVerticalWallSide = Math.abs(dx) <= Math.max(1, thickness * 0.25);

  if (isHorizontalWallFace) {
    const { top, bottom } = resolveWallBodyVerticalExtent(
      from,
      to,
      radius,
      thickness,
      backCollisionOffset,
      mapHeight
    );
    return {
      x: Math.min(from.x, to.x) - padding,
      y: top,
      width: Math.abs(dx) + padding * 2,
      height: Math.max(thickness, bottom - top),
    };
  }

  if (isVerticalWallSide) {
    const { top, bottom } = resolveWallBodyVerticalExtent(
      from,
      to,
      radius,
      thickness,
      backCollisionOffset,
      mapHeight
    );
    return {
      x: (from.x + to.x) / 2 - padding,
      y: top,
      width: padding * 2,
      height: Math.max(thickness, bottom - top),
    };
  }

  const { top, bottom } = resolveWallBodyVerticalExtent(
    from,
    to,
    radius,
    thickness,
    backCollisionOffset,
    mapHeight
  );
  return {
    x: Math.min(from.x, to.x) - padding,
    y: top,
    width: Math.abs(dx) + padding * 2,
    height: Math.max(thickness, bottom - top),
  };
}

function resolveWallBodyVerticalExtent(
  from: { x: number; y: number },
  to: { x: number; y: number },
  radius: number,
  thickness: number,
  backCollisionOffset: number,
  mapHeight: number
): { top: number; bottom: number } {
  const maskBottom = Math.max(from.y, to.y) + radius;
  const bottom = Math.min(mapHeight, maskBottom + backCollisionOffset);
  const bodyDepth = Math.max(thickness, Math.min(radius, backCollisionOffset));
  return {
    top: Math.min(bottom - thickness, bottom - bodyDepth),
    bottom,
  };
}

function pushWallCollisionRect(
  polygons: StudioCollisionPolygon[],
  rect: { x: number; y: number; width: number; height: number },
  mapWidth: number,
  mapHeight: number,
  sourceId: string,
  segmentId: string,
  clearRects: PixelRect[],
  role = "edge"
): void {
  const clamped = clampPixelRect(rect, mapWidth, mapHeight);
  if (!clamped) return;
  subtractRects([clamped], clearRects).forEach((remainingRect) => {
    polygons.push(pixelRectToPolygon(remainingRect, "morphology_wall_edge_collision", sourceId, segmentId, role));
  });
}

function clampPixelRect(
  rect: { x: number; y: number; width: number; height: number },
  mapWidth: number,
  mapHeight: number
): { x: number; y: number; width: number; height: number } | null {
  if (rect.width <= 0 || rect.height <= 0 || mapWidth <= 0 || mapHeight <= 0) return null;
  const x = Math.max(0, Math.min(mapWidth, rect.x));
  const y = Math.max(0, Math.min(mapHeight, rect.y));
  const right = Math.max(x, Math.min(mapWidth, rect.x + rect.width));
  const bottom = Math.max(y, Math.min(mapHeight, rect.y + rect.height));
  if (right - x < 1 || bottom - y < 1) return null;
  return { x, y, width: right - x, height: bottom - y };
}

function pixelRectToPolygon(
  rect: { x: number; y: number; width: number; height: number },
  type: StudioCollisionPolygon["type"],
  sourceId: string,
  segmentId: string,
  role?: string
): StudioCollisionPolygon {
  const x = Math.round(rect.x);
  const y = Math.round(rect.y);
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  return {
    id: `${type}_${sourceId}_${segmentId}_${x}_${y}`,
    type,
    x,
    y,
    width,
    height,
    points: [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
    ],
    properties: {
      source: sourceId,
      segment: segmentId,
      ...(role ? { role } : {}),
    },
  };
}

function maskToRectangles(mask: BooleanMask): Array<{ x: number; y: number; width: number; height: number }> {
  const visited = Array.from({ length: mask.height }, () => Array(mask.width).fill(false));
  const rectangles: Array<{ x: number; y: number; width: number; height: number }> = [];

  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      if (!mask.cells[y][x] || visited[y][x]) continue;

      let width = 1;
      while (x + width < mask.width && mask.cells[y][x + width] && !visited[y][x + width]) {
        width += 1;
      }

      let height = 1;
      let canGrow = true;
      while (y + height < mask.height && canGrow) {
        for (let dx = 0; dx < width; dx += 1) {
          if (!mask.cells[y + height][x + dx] || visited[y + height][x + dx]) {
            canGrow = false;
            break;
          }
        }
        if (canGrow) height += 1;
      }

      for (let dy = 0; dy < height; dy += 1) {
        for (let dx = 0; dx < width; dx += 1) {
          visited[y + dy][x + dx] = true;
        }
      }

      rectangles.push({ x, y, width, height });
    }
  }

  return rectangles;
}

function maskRectanglesToPixelRects(
  rectangles: Array<{ x: number; y: number; width: number; height: number }>,
  tileSize: number
): PixelRect[] {
  return rectangles.map((rect) => ({
    x: rect.x * tileSize,
    y: rect.y * tileSize,
    width: rect.width * tileSize,
    height: rect.height * tileSize,
  }));
}

function pixelRectanglesToPolygons(
  rectangles: PixelRect[],
  type: StudioCollisionPolygon["type"],
  sourceId: string,
  tileSize: number
): StudioCollisionPolygon[] {
  return rectangles.map((rect, index) => {
    const polygon = pixelRectToPolygon(rect, type, sourceId, String(index));
    polygon.properties = {
      ...polygon.properties,
      tileX: rect.x / tileSize,
      tileY: rect.y / tileSize,
      tileWidth: rect.width / tileSize,
      tileHeight: rect.height / tileSize,
    };
    return polygon;
  });
}

function subtractRects(rects: PixelRect[], clearRects: PixelRect[]): PixelRect[] {
  if (rects.length === 0 || clearRects.length === 0) return rects;

  return clearRects.reduce((remaining, clearRect) => {
    return remaining.flatMap((rect) => subtractRect(rect, clearRect));
  }, rects);
}

function subtractRect(rect: PixelRect, clearRect: PixelRect): PixelRect[] {
  const left = Math.max(rect.x, clearRect.x);
  const top = Math.max(rect.y, clearRect.y);
  const right = Math.min(rect.x + rect.width, clearRect.x + clearRect.width);
  const bottom = Math.min(rect.y + rect.height, clearRect.y + clearRect.height);

  if (right <= left || bottom <= top) return [rect];

  const pieces: PixelRect[] = [];
  const rectRight = rect.x + rect.width;
  const rectBottom = rect.y + rect.height;

  if (top > rect.y) {
    pieces.push({ x: rect.x, y: rect.y, width: rect.width, height: top - rect.y });
  }

  if (bottom < rectBottom) {
    pieces.push({ x: rect.x, y: bottom, width: rect.width, height: rectBottom - bottom });
  }

  if (left > rect.x) {
    pieces.push({ x: rect.x, y: top, width: left - rect.x, height: bottom - top });
  }

  if (right < rectRight) {
    pieces.push({ x: right, y: top, width: rectRight - right, height: bottom - top });
  }

  return pieces.filter((piece) => piece.width >= 1 && piece.height >= 1);
}

function offsetPoint(point: Point, normal: Point, distance: number): Point {
  return {
    x: point.x + normal.x * distance,
    y: point.y + normal.y * distance,
  };
}

function clampPolygonPoints(points: Point[], mapWidth: number, mapHeight: number): Point[] {
  const unique = new Set<string>();
  const clamped: Point[] = [];

  points.forEach((point) => {
    const x = Math.max(0, Math.min(mapWidth, point.x));
    const y = Math.max(0, Math.min(mapHeight, point.y));
    const key = `${Math.round(x * 1000)}:${Math.round(y * 1000)}`;
    if (unique.has(key)) return;
    unique.add(key);
    clamped.push({ x, y });
  });

  return clamped;
}

function polygonArea(points: Point[]): number {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area * 0.5;
}

// Very short contour edges can have crossing miter offsets at sharp corners.
// SAT colliders require convex vertices in winding order, never a bow-tie.
function convexHull(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (a: Point, b: Point, c: Point) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const half = (input: Point[]) => {
    const result: Point[] = [];
    for (const point of input) {
      while (result.length >= 2 && cross(result[result.length - 2], result[result.length - 1], point) <= 0) result.pop();
      result.push(point);
    }
    return result.slice(0, -1);
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

// Each outside piece remains convex. Dropping a whole simplified edge when
// it touches a bridge would open the bank on both sides of the bridge.
function subtractPolygonRect(points: Point[], rect: PixelRect): Point[][] {
  let inside = points;
  const outside: Point[][] = [];
  const planes: Array<["x" | "y", number, boolean]> = [
    ["x", rect.x, true], ["x", rect.x + rect.width, false],
    ["y", rect.y, true], ["y", rect.y + rect.height, false],
  ];
  for (const [axis, boundary, greater] of planes) {
    const piece = clipPolygon(inside, axis, boundary, !greater);
    if (piece.length >= 3 && Math.abs(polygonArea(piece)) >= 1) outside.push(piece);
    inside = clipPolygon(inside, axis, boundary, greater);
    if (!inside.length) break;
  }
  return outside;
}

function clipPolygon(points: Point[], axis: "x" | "y", boundary: number, greater: boolean): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const aInside = greater ? a[axis] >= boundary : a[axis] <= boundary;
    const bInside = greater ? b[axis] >= boundary : b[axis] <= boundary;
    if (aInside) result.push(a);
    if (aInside !== bInside) {
      const t = (boundary - a[axis]) / (b[axis] - a[axis]);
      result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return result;
}

function resolveAlwaysLowElementWalkableRects(map: any, mapWidth: number, mapHeight: number): PixelRect[] {
  const elementsAlwaysLow = parseArray(map?.elementsAlwaysLow);
  if (elementsAlwaysLow.length === 0) return [];

  const tilesets = normalizeTilesets([
    map?.params?.tileset,
    map?.params?.primaryElementTileset,
    ...normalizeTilesets(map?.params?.elementTilesets),
  ]);
  const tilesetsById = new Map<string, any>();
  tilesets.forEach((tileset) => {
    const tilesetId = toIdentifierString(tileset?._id) || toIdentifierString(tileset?.id);
    if (tilesetId) tilesetsById.set(tilesetId, tileset);
  });

  const fallbackTileset = tilesets[0];

  return elementsAlwaysLow
    .map((element) => resolveElementRect(element, tilesetsById, fallbackTileset))
    .filter((rect): rect is PixelRect => rect !== null)
    .map((rect) => clampPixelRect(rect, mapWidth, mapHeight))
    .filter((rect): rect is PixelRect => rect !== null);
}

function resolveElementRect(
  element: any,
  tilesetsById: Map<string, any>,
  fallbackTileset: any
): PixelRect | null {
  const x = toFiniteNumber(element?.x);
  const y = toFiniteNumber(element?.y);
  if (x === null || y === null) return null;

  const tilesetId = toIdentifierString(element?.tilesetId);
  const tileset = (tilesetId ? tilesetsById.get(tilesetId) : null) || fallbackTileset;
  const tilesetElement = resolveTilesetElement(tileset, element?.id);
  const sourceRect = Array.isArray(tilesetElement?.rect) ? tilesetElement.rect : null;
  const sourceWidth = sourceRect ? toFiniteNumber(sourceRect[2]) : null;
  const sourceHeight = sourceRect ? toFiniteNumber(sourceRect[3]) : null;
  if (sourceWidth === null || sourceHeight === null || sourceWidth <= 0 || sourceHeight <= 0) return null;

  const size = resolveStudioElementSize(element, tilesetElement, tileset?.metadata, sourceWidth, sourceHeight);
  return {
    x,
    y,
    width: size.targetWidth,
    height: size.targetHeight,
  };
}

function resolveTilesetElement(tileset: any, elementId: unknown): any | null {
  if (!tileset || elementId === undefined || elementId === null) return null;
  const elements = parseArray(tileset?.metadata?.elements);
  const key = String(elementId);
  return elements.find((element, index) => String(element?.id ?? index) === key || String(index) === key) ?? null;
}

function normalizeTilesets(value: unknown): any[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeTilesets(entry));
  }
  return typeof value === "object" ? [value] : [];
}

function parseArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toFiniteNumber(value: unknown): number | null {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toIdentifierString(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    const normalized = String(value).trim();
    return normalized.startsWith("#") ? normalized.slice(1) : normalized;
  }

  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  return (
    toIdentifierString(record.$oid) ||
    toIdentifierString(record.oid) ||
    toIdentifierString(record._id) ||
    toIdentifierString(record.id) ||
    toIdentifierString(record.value) ||
    toIdentifierString(record.uuid)
  );
}
