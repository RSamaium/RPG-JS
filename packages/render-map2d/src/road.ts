import type { TerrainRenderMode } from "./types";

export const ROAD_TOWN_SIDEWALK_SHADER_KEY = "road-town-sidewalk";
export const ROAD_TOWN_MARKED_SHADER_KEY = "road-town-marked";

export function isTerrainRoadTownMode(mode: TerrainRenderMode | undefined): boolean {
  return mode?.type === "custom"
    && (mode.shaderKey === ROAD_TOWN_SIDEWALK_SHADER_KEY || mode.shaderKey === ROAD_TOWN_MARKED_SHADER_KEY);
}

export interface TerrainRoadOverlayOptions {
  height: number;
  marked: boolean;
  mask: Uint8ClampedArray;
  tileSize: number;
  width: number;
}

export function createTerrainRoadTownOverlayPixels(options: TerrainRoadOverlayOptions): Uint8ClampedArray {
  const { height, marked, mask, width } = options;
  const pixelCount = width * height;
  const occupied = new Uint8Array(pixelCount);
  const output = new Uint8ClampedArray(pixelCount * 4);
  const sidewalkWidth = Math.max(3, Math.min(10, Math.round(options.tileSize * 0.12)));
  const markingHalfWidth = Math.max(2, Math.min(3, Math.round(options.tileSize * 0.055)));
  const dashPeriod = Math.max(18, Math.min(40, Math.round(options.tileSize * 0.65)));
  const pavingPeriod = Math.max(8, Math.min(16, Math.round(options.tileSize * 0.25)));

  for (let index = 0; index < pixelCount; index += 1) {
    occupied[index] = mask[index * 4 + 3] >= 32 ? 1 : 0;
  }

  const distance = createTerrainRoadDistanceField(occupied, width, height);
  const sidewalkDistance = sidewalkWidth * 3;
  const marking = marked
    ? createTerrainRoadMarkingMask(
        occupied,
        distance,
        width,
        height,
        sidewalkDistance,
        markingHalfWidth,
        dashPeriod
      )
    : null;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!occupied[index]) continue;

      const sourceAlpha = mask[index * 4 + 3] / 255;
      const outputOffset = index * 4;
      const edgeDistance = distance[index];

      if (edgeDistance <= sidewalkDistance) {
        const isOuterCurb = edgeDistance <= 4;
        const isInnerCurb = edgeDistance > sidewalkDistance - 3;
        const isPavingJoint = (x * 7 + y * 11) % pavingPeriod === 0 && !isOuterCurb;
        const color: readonly [number, number, number, number] = isOuterCurb
          ? [122, 119, 112, 205]
          : isInnerCurb
            ? [226, 222, 211, 225]
            : isPavingJoint
              ? [156, 153, 146, 205]
              : [190, 187, 178, 235];
        setOverlayPixel(output, outputOffset, color, sourceAlpha);
        continue;
      }

      const markingAlpha = marking?.[index] ?? 0;
      if (markingAlpha > 0) {
        const textureGrain = (x * 13 + y * 7) % 4;
        setOverlayPixel(
          output,
          outputOffset,
          [236, 224, 181, Math.round((170 + textureGrain * 10) * markingAlpha / 255)],
          sourceAlpha
        );
      }
    }
  }

  return output;
}

function createTerrainRoadDistanceField(
  occupied: Uint8Array,
  width: number,
  height: number
): Uint32Array {
  const infinity = 0x3fffffff;
  const distance = new Uint32Array(occupied.length);
  distance.fill(infinity);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!occupied[index]) {
        distance[index] = 0;
        continue;
      }

      let best = x === 0 || y === 0 ? 3 : infinity;
      if (x > 0) best = Math.min(best, distance[index - 1] + 3);
      if (y > 0) best = Math.min(best, distance[index - width] + 3);
      if (x > 0 && y > 0) best = Math.min(best, distance[index - width - 1] + 4);
      if (x + 1 < width && y > 0) best = Math.min(best, distance[index - width + 1] + 4);
      distance[index] = best;
    }
  }

  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      const index = y * width + x;
      if (!occupied[index]) continue;

      let best = distance[index];
      if (x + 1 === width || y + 1 === height) best = Math.min(best, 3);
      if (x + 1 < width) best = Math.min(best, distance[index + 1] + 3);
      if (y + 1 < height) best = Math.min(best, distance[index + width] + 3);
      if (x + 1 < width && y + 1 < height) best = Math.min(best, distance[index + width + 1] + 4);
      if (x > 0 && y + 1 < height) best = Math.min(best, distance[index + width - 1] + 4);
      distance[index] = best;
    }
  }

  return distance;
}

function createTerrainRoadMarkingMask(
  occupied: Uint8Array,
  distance: Uint32Array,
  width: number,
  height: number,
  sidewalkDistance: number,
  markingHalfWidth: number,
  dashPeriod: number
): Uint8Array {
  const ridge = new Uint8Array(occupied.length);
  const minimumCenterDistance = sidewalkDistance + markingHalfWidth * 3;
  const directionPairs = [
    [-width, width],
    [-1, 1],
    [-width - 1, width + 1],
    [-width + 1, width - 1],
  ] as const;

  for (let y = 1; y + 1 < height; y += 1) {
    for (let x = 1; x + 1 < width; x += 1) {
      const index = y * width + x;
      const centerDistance = distance[index];
      if (!occupied[index] || centerDistance <= minimumCenterDistance) continue;

      ridge[index] = directionPairs.some(([beforeOffset, afterOffset]) => {
        const before = distance[index + beforeOffset];
        const after = distance[index + afterOffset];
        return centerDistance >= before && centerDistance >= after && centerDistance * 2 > before + after;
      }) ? 1 : 0;
    }
  }

  const thinnedSkeleton = thinTerrainRoadRidge(ridge, width, height);
  const prunedSkeleton = pruneTerrainRoadCapSpurs(thinnedSkeleton, distance, width, height);
  const skeleton = extendTerrainRoadEndpoints(
    prunedSkeleton,
    occupied,
    distance,
    width,
    height,
    sidewalkDistance + markingHalfWidth * 2
  );
  return rasterizeTerrainRoadRoutes(
    createTerrainRoadRoutes(skeleton, width, height),
    occupied,
    distance,
    width,
    height,
    sidewalkDistance,
    markingHalfWidth,
    dashPeriod
  );
}

function thinTerrainRoadRidge(source: Uint8Array, width: number, height: number): Uint8Array {
  const skeleton = new Uint8Array(source);
  const removals: number[] = [];

  for (let iteration = 0; iteration < 16; iteration += 1) {
    let changed = false;
    for (let step = 0; step < 2; step += 1) {
      removals.length = 0;
      for (let y = 1; y + 1 < height; y += 1) {
        for (let x = 1; x + 1 < width; x += 1) {
          const index = y * width + x;
          if (!skeleton[index]) continue;
          const neighbors = [
            skeleton[index - width],
            skeleton[index - width + 1],
            skeleton[index + 1],
            skeleton[index + width + 1],
            skeleton[index + width],
            skeleton[index + width - 1],
            skeleton[index - 1],
            skeleton[index - width - 1],
          ];
          const count = neighbors.reduce((sum, value) => sum + value, 0);
          if (count < 2 || count > 6) continue;

          let transitions = 0;
          for (let neighborIndex = 0; neighborIndex < neighbors.length; neighborIndex += 1) {
            if (!neighbors[neighborIndex] && neighbors[(neighborIndex + 1) % neighbors.length]) transitions += 1;
          }
          if (transitions !== 1) continue;

          const [north, , east, , south, , west] = neighbors;
          const preservesFirstSide = step === 0
            ? north * east * south === 0 && east * south * west === 0
            : north * east * west === 0 && north * south * west === 0;
          if (preservesFirstSide) removals.push(index);
        }
      }
      for (const index of removals) skeleton[index] = 0;
      changed ||= removals.length > 0;
    }
    if (!changed) break;
  }

  return skeleton;
}

function pruneTerrainRoadCapSpurs(
  source: Uint8Array,
  distance: Uint32Array,
  width: number,
  height: number
): Uint8Array {
  const skeleton = new Uint8Array(source);

  for (let pass = 0; pass < 4; pass += 1) {
    const removals = new Set<number>();
    for (let endpoint = 0; endpoint < skeleton.length; endpoint += 1) {
      if (!skeleton[endpoint] || terrainRoadSkeletonNeighbors(endpoint, skeleton, width, height).length !== 1) continue;
      const path = [endpoint];
      let previous = -1;
      let current = endpoint;
      let length = 0;

      while (true) {
        const neighbors = terrainRoadSkeletonNeighbors(current, skeleton, width, height);
        if (current !== endpoint && neighbors.length !== 2) break;
        const next = neighbors.find((candidate) => candidate !== previous);
        if (next === undefined) break;
        length += terrainRoadPixelDistance(current, next, width);
        previous = current;
        current = next;
        path.push(current);
      }

      const junctionDegree = terrainRoadSkeletonNeighbors(current, skeleton, width, height).length;
      const localHalfWidth = distance[current] / 3;
      if (junctionDegree >= 3 && length < Math.max(18, localHalfWidth * 2.2)) {
        for (const pixel of path.slice(0, -1)) removals.add(pixel);
      }
    }
    if (removals.size === 0) break;
    for (const pixel of removals) skeleton[pixel] = 0;
  }

  return skeleton;
}

function extendTerrainRoadEndpoints(
  source: Uint8Array,
  occupied: Uint8Array,
  distance: Uint32Array,
  width: number,
  height: number,
  minimumDistance: number
): Uint8Array {
  const skeleton = new Uint8Array(source);
  const endpoints: number[] = [];
  for (let index = 0; index < skeleton.length; index += 1) {
    if (skeleton[index] && terrainRoadSkeletonNeighbors(index, skeleton, width, height).length === 1) {
      endpoints.push(index);
    }
  }

  for (const endpoint of endpoints) {
    const inwardPath = [endpoint];
    let previous = -1;
    let current = endpoint;
    while (inwardPath.length < 10) {
      const next = terrainRoadSkeletonNeighbors(current, skeleton, width, height)
        .find((candidate) => candidate !== previous);
      if (next === undefined) break;
      inwardPath.push(next);
      previous = current;
      current = next;
    }
    if (inwardPath.length < 3) continue;

    const sample = inwardPath[inwardPath.length - 1];
    const endpointX = endpoint % width;
    const endpointY = Math.floor(endpoint / width);
    const dx = endpointX - sample % width;
    const dy = endpointY - Math.floor(sample / width);
    const vectorLength = Math.hypot(dx, dy);
    if (vectorLength <= 0) continue;
    const directionX = dx / vectorLength;
    const directionY = dy / vectorLength;
    let previousX = endpointX;
    let previousY = endpointY;

    for (let step = 1; step <= 128; step += 1) {
      const x = Math.round(endpointX + directionX * step);
      const y = Math.round(endpointY + directionY * step);
      if (x < 0 || x >= width || y < 0 || y >= height) break;
      const target = y * width + x;
      if (!occupied[target] || distance[target] <= minimumDistance) break;
      drawTerrainRoadSkeletonSegment(skeleton, previousX, previousY, x, y, width, height);
      previousX = x;
      previousY = y;
    }
  }

  return skeleton;
}

function drawTerrainRoadSkeletonSegment(
  skeleton: Uint8Array,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  width: number,
  height: number
): void {
  const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY));
  for (let step = 0; step <= steps; step += 1) {
    const ratio = steps === 0 ? 0 : step / steps;
    const x = Math.round(startX + (endX - startX) * ratio);
    const y = Math.round(startY + (endY - startY) * ratio);
    if (x >= 0 && x < width && y >= 0 && y < height) skeleton[y * width + x] = 1;
  }
}

interface TerrainRoadSkeletonEdge {
  end: number;
  pixels: number[];
  start: number;
}

interface TerrainRoadPoint {
  x: number;
  y: number;
}

interface TerrainRoadRoute {
  closed: boolean;
  points: TerrainRoadPoint[];
}

function createTerrainRoadRoutes(
  skeleton: Uint8Array,
  width: number,
  height: number
): TerrainRoadRoute[] {
  const edges = createTerrainRoadSkeletonEdges(skeleton, width, height);
  const pairings = pairTerrainRoadEdges(edges, width);
  const visited = new Uint8Array(edges.length);
  const routes: TerrainRoadRoute[] = [];

  for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex += 1) {
    if (visited[edgeIndex]) continue;
    const edge = edges[edgeIndex];
    const startEndpoint = edgeIndex * 2;
    const endEndpoint = startEndpoint + 1;
    if (!pairings.has(startEndpoint)) {
      routes.push(traceTerrainRoadRoute(edgeIndex, false, edges, pairings, visited, width));
    } else if (!pairings.has(endEndpoint)) {
      routes.push(traceTerrainRoadRoute(edgeIndex, true, edges, pairings, visited, width));
    }
  }

  for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex += 1) {
    if (!visited[edgeIndex]) {
      routes.push(traceTerrainRoadRoute(edgeIndex, false, edges, pairings, visited, width));
    }
  }

  return routes
    .filter((route) => route.points.length > 1)
    .map((route) => ({ ...route, points: smoothTerrainRoadRoute(route.points, route.closed) }));
}

function createTerrainRoadSkeletonEdges(
  skeleton: Uint8Array,
  width: number,
  height: number
): TerrainRoadSkeletonEdge[] {
  const visitedEdges = new Set<number>();
  const nodes: number[] = [];
  const edges: TerrainRoadSkeletonEdge[] = [];

  for (let index = 0; index < skeleton.length; index += 1) {
    if (!skeleton[index]) continue;
    const degree = terrainRoadSkeletonNeighbors(index, skeleton, width, height).length;
    if (degree !== 2) nodes.push(index);
  }

  for (const node of nodes) {
    for (const neighbor of terrainRoadSkeletonNeighbors(node, skeleton, width, height)) {
      if (visitedEdges.has(terrainRoadEdgeKey(node, neighbor, skeleton.length))) continue;
      const pixels = traceTerrainRoadSkeletonPath(node, neighbor, skeleton, width, height, visitedEdges);
      edges.push({ start: pixels[0], end: pixels[pixels.length - 1], pixels });
    }
  }

  for (let index = 0; index < skeleton.length; index += 1) {
    if (!skeleton[index]) continue;
    const neighbor = terrainRoadSkeletonNeighbors(index, skeleton, width, height)
      .find((candidate) => !visitedEdges.has(terrainRoadEdgeKey(index, candidate, skeleton.length)));
    if (neighbor === undefined) continue;
    const pixels = traceTerrainRoadSkeletonPath(index, neighbor, skeleton, width, height, visitedEdges);
    edges.push({ start: pixels[0], end: pixels[pixels.length - 1], pixels });
  }

  return edges;
}

function traceTerrainRoadSkeletonPath(
  start: number,
  firstNeighbor: number,
  skeleton: Uint8Array,
  width: number,
  height: number,
  visitedEdges: Set<number>
): number[] {
  const pixels = [start];
  let previous = start;
  let current = firstNeighbor;

  while (true) {
    visitedEdges.add(terrainRoadEdgeKey(previous, current, skeleton.length));
    pixels.push(current);
    if (current === start) break;

    const neighbors = terrainRoadSkeletonNeighbors(current, skeleton, width, height);
    if (neighbors.length !== 2) break;
    const next = neighbors.find((candidate) => candidate !== previous);
    if (next === undefined) break;
    const edgeKey = terrainRoadEdgeKey(current, next, skeleton.length);
    if (visitedEdges.has(edgeKey)) break;
    previous = current;
    current = next;
  }

  return pixels;
}

function pairTerrainRoadEdges(edges: TerrainRoadSkeletonEdge[], width: number): Map<number, number> {
  const endpointsByNode = new Map<number, number[]>();
  for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex += 1) {
    const edge = edges[edgeIndex];
    addTerrainRoadEndpoint(endpointsByNode, edge.start, edgeIndex * 2);
    addTerrainRoadEndpoint(endpointsByNode, edge.end, edgeIndex * 2 + 1);
  }

  const pairings = new Map<number, number>();
  for (const endpoints of endpointsByNode.values()) {
    const remaining = [...endpoints];
    while (remaining.length > 1) {
      let bestLeft = -1;
      let bestRight = -1;
      let bestScore = -0.35;
      for (let leftIndex = 0; leftIndex < remaining.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < remaining.length; rightIndex += 1) {
          const leftTangent = terrainRoadEndpointTangent(edges, remaining[leftIndex], width);
          const rightTangent = terrainRoadEndpointTangent(edges, remaining[rightIndex], width);
          const score = -(leftTangent.x * rightTangent.x + leftTangent.y * rightTangent.y);
          if (score > bestScore) {
            bestScore = score;
            bestLeft = leftIndex;
            bestRight = rightIndex;
          }
        }
      }
      if (bestLeft < 0 || bestRight < 0) break;
      const leftEndpoint = remaining[bestLeft];
      const rightEndpoint = remaining[bestRight];
      pairings.set(leftEndpoint, rightEndpoint);
      pairings.set(rightEndpoint, leftEndpoint);
      remaining.splice(bestRight, 1);
      remaining.splice(bestLeft, 1);
    }
  }

  return pairings;
}

function addTerrainRoadEndpoint(endpoints: Map<number, number[]>, node: number, endpoint: number): void {
  endpoints.set(node, [...(endpoints.get(node) ?? []), endpoint]);
}

function terrainRoadEndpointTangent(
  edges: TerrainRoadSkeletonEdge[],
  endpoint: number,
  width: number
): TerrainRoadPoint {
  const edge = edges[Math.floor(endpoint / 2)];
  const fromStart = endpoint % 2 === 0;
  const nodePixel = fromStart ? edge.pixels[0] : edge.pixels[edge.pixels.length - 1];
  const sampleIndex = Math.min(8, edge.pixels.length - 1);
  const samplePixel = fromStart
    ? edge.pixels[sampleIndex]
    : edge.pixels[edge.pixels.length - 1 - sampleIndex];
  const dx = samplePixel % width - nodePixel % width;
  const dy = Math.floor(samplePixel / width) - Math.floor(nodePixel / width);
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

function traceTerrainRoadRoute(
  startEdgeIndex: number,
  startFromEnd: boolean,
  edges: TerrainRoadSkeletonEdge[],
  pairings: Map<number, number>,
  visited: Uint8Array,
  width: number
): TerrainRoadRoute {
  const startEndpoint = startEdgeIndex * 2 + (startFromEnd ? 1 : 0);
  const points: TerrainRoadPoint[] = [];
  let endpoint = startEndpoint;
  let closed = false;

  while (true) {
    const edgeIndex = Math.floor(endpoint / 2);
    if (visited[edgeIndex]) {
      closed = endpoint === startEndpoint;
      break;
    }
    visited[edgeIndex] = 1;
    const edge = edges[edgeIndex];
    const pixels = endpoint % 2 === 0 ? edge.pixels : [...edge.pixels].reverse();
    for (let index = 0; index < pixels.length; index += 1) {
      if (points.length > 0 && index === 0) continue;
      points.push({ x: pixels[index] % width + 0.5, y: Math.floor(pixels[index] / width) + 0.5 });
    }

    const exitEndpoint = edgeIndex * 2 + (endpoint % 2 === 0 ? 1 : 0);
    const nextEndpoint = pairings.get(exitEndpoint);
    if (nextEndpoint === undefined) break;
    if (nextEndpoint === startEndpoint) {
      closed = true;
      break;
    }
    endpoint = nextEndpoint;
  }

  return { closed, points: resampleTerrainRoadRoute(points, closed) };
}

function resampleTerrainRoadRoute(points: TerrainRoadPoint[], closed: boolean): TerrainRoadPoint[] {
  if (points.length < 3) return points;
  const sampled: TerrainRoadPoint[] = [points[0]];
  let carried = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const segmentLength = Math.hypot(current.x - previous.x, current.y - previous.y);
    carried += segmentLength;
    if (carried >= 2.5) {
      sampled.push(current);
      carried = 0;
    }
  }
  if (!closed && sampled[sampled.length - 1] !== points[points.length - 1]) {
    sampled.push(points[points.length - 1]);
  }
  return sampled;
}

function smoothTerrainRoadRoute(points: TerrainRoadPoint[], closed: boolean): TerrainRoadPoint[] {
  let smoothed = points;
  for (let pass = 0; pass < 3; pass += 1) {
    smoothed = smoothed.map((point, index, all) => {
      if (!closed && (index === 0 || index === all.length - 1)) return point;
      const previous = all[(index - 1 + all.length) % all.length];
      const next = all[(index + 1) % all.length];
      return {
        x: previous.x * 0.25 + point.x * 0.5 + next.x * 0.25,
        y: previous.y * 0.25 + point.y * 0.5 + next.y * 0.25,
      };
    });
  }
  return smoothed;
}

function rasterizeTerrainRoadRoutes(
  routes: TerrainRoadRoute[],
  occupied: Uint8Array,
  distance: Uint32Array,
  width: number,
  height: number,
  sidewalkDistance: number,
  markingHalfWidth: number,
  preferredPeriod: number
): Uint8Array {
  const marking = new Uint8Array(occupied.length);
  for (const route of routes) {
    const points = route.closed && route.points.length > 2
      ? [...route.points, route.points[0]]
      : route.points;
    const cumulative = new Float32Array(points.length);
    for (let index = 1; index < points.length; index += 1) {
      cumulative[index] = cumulative[index - 1] + Math.hypot(
        points[index].x - points[index - 1].x,
        points[index].y - points[index - 1].y
      );
    }
    const totalLength = cumulative[cumulative.length - 1] ?? 0;
    if (totalLength <= 0) continue;
    const periodCount = Math.max(1, Math.round(totalLength / preferredPeriod));
    const period = route.closed ? totalLength / periodCount : preferredPeriod;
    const dashLength = period * 0.54;

    for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
      rasterizeTerrainRoadSegment(
        marking,
        occupied,
        distance,
        width,
        height,
        sidewalkDistance,
        markingHalfWidth,
        points[pointIndex - 1],
        points[pointIndex],
        cumulative[pointIndex - 1],
        period,
        dashLength
      );
    }
  }
  return marking;
}

function rasterizeTerrainRoadSegment(
  marking: Uint8Array,
  occupied: Uint8Array,
  distance: Uint32Array,
  width: number,
  height: number,
  sidewalkDistance: number,
  radius: number,
  start: TerrainRoadPoint,
  end: TerrainRoadPoint,
  startDistance: number,
  period: number,
  dashLength: number
): void {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 0) return;
  const segmentLength = Math.sqrt(lengthSquared);
  const antialiasRadius = radius + 0.75;
  const left = Math.max(0, Math.floor(Math.min(start.x, end.x) - antialiasRadius));
  const right = Math.min(width - 1, Math.ceil(Math.max(start.x, end.x) + antialiasRadius));
  const top = Math.max(0, Math.floor(Math.min(start.y, end.y) - antialiasRadius));
  const bottom = Math.min(height - 1, Math.ceil(Math.max(start.y, end.y) + antialiasRadius));

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const index = y * width + x;
      if (!occupied[index] || distance[index] <= sidewalkDistance) continue;
      const t = Math.max(0, Math.min(1, ((x + 0.5 - start.x) * dx + (y + 0.5 - start.y) * dy) / lengthSquared));
      const phase = (startDistance + t * segmentLength) % period;
      if (phase > dashLength) continue;
      const nearestX = start.x + dx * t;
      const nearestY = start.y + dy * t;
      const pixelDistance = Math.hypot(x + 0.5 - nearestX, y + 0.5 - nearestY);
      if (pixelDistance > antialiasRadius) continue;
      const alpha = Math.round(255 * Math.max(0, Math.min(1, antialiasRadius - pixelDistance)));
      marking[index] = Math.max(marking[index], alpha);
    }
  }
}

function terrainRoadSkeletonNeighbors(
  index: number,
  skeleton: Uint8Array,
  width: number,
  height: number
): number[] {
  const x = index % width;
  const y = Math.floor(index / width);
  const neighbors: number[] = [];
  const directions = [
    [0, -1], [1, 0], [0, 1], [-1, 0],
    [1, -1], [1, 1], [-1, 1], [-1, -1],
  ] as const;

  for (const [offsetX, offsetY] of directions) {
    const targetX = x + offsetX;
    const targetY = y + offsetY;
    if (targetX < 0 || targetX >= width || targetY < 0 || targetY >= height) continue;
    const target = targetY * width + targetX;
    if (!skeleton[target]) continue;
    if (offsetX !== 0 && offsetY !== 0) {
      const horizontalBridge = y * width + targetX;
      const verticalBridge = targetY * width + x;
      if (skeleton[horizontalBridge] || skeleton[verticalBridge]) continue;
    }
    neighbors.push(target);
  }

  return neighbors;
}

function terrainRoadEdgeKey(left: number, right: number, pixelCount: number): number {
  return Math.min(left, right) * pixelCount + Math.max(left, right);
}

function terrainRoadPixelDistance(left: number, right: number, width: number): number {
  return Math.abs(left - right) === width || Math.abs(left - right) === 1 ? 1 : Math.SQRT2;
}

function setOverlayPixel(
  output: Uint8ClampedArray,
  offset: number,
  color: readonly [number, number, number, number],
  sourceAlpha: number
): void {
  output[offset] = color[0];
  output[offset + 1] = color[1];
  output[offset + 2] = color[2];
  output[offset + 3] = Math.round(color[3] * sourceAlpha);
}
