import type { StudioTerrainRockTexture } from "../types";

/** Deterministic value in [0, 1] for two integers. */
function hash2(a: number, b: number): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/**
 * RGBA pixels of a seamless procedural rock face texture. Tiles in both directions; the same
 * input always gives the same pixels (the Studio map editor and the game render alike). Rows
 * run along the rock edge when rendered by `renderRockFacePixels`.
 * - `masonry`: courses of cut stone of varying heights, split into offset blocks, with lit
 *   course tops and dark joints.
 * - `natural`: large irregular facets of weathered rock, each tilted to the light, with
 *   rounded borders, some open cracks, soft strata and mottled color.
 */
export function createRockFacePixels(texture: StudioTerrainRockTexture = "masonry", width = 256, height = 128): Uint8ClampedArray {
  return texture === "natural" ? createNaturalRockPixels(width, height) : createMasonryRockPixels(width, height);
}

function createMasonryRockPixels(width: number, height: number, bandHeight = 8): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  // Course heights vary from about 0.6 to 1.6 times `bandHeight`, and sum up to `height`.
  const courses: Array<{ top: number; bottom: number }> = [];
  let top = 0;
  for (let index = 0; top < height; index += 1) {
    const size = Math.max(3, Math.round(bandHeight * (0.6 + hash2(index, 3) * 1.0)));
    const bottom = Math.min(height, top + size);
    courses.push({ top, bottom: height - bottom < 3 ? height : bottom });
    top = courses[courses.length - 1].bottom;
  }

  for (let y = 0; y < height; y += 1) {
    const courseIndex = courses.findIndex((course) => y >= course.top && y < course.bottom);
    const course = courses[courseIndex];
    const inCourse = y - course.top;
    const courseSize = course.bottom - course.top;
    // Blocks of 18..46 px, offset per course; the block pattern repeats every `width` pixels.
    const blockSize = 18 + Math.floor(hash2(courseIndex, 11) * 28);
    const blockCount = Math.max(1, Math.round(width / blockSize));
    const blockWidth = width / blockCount;
    const shift = hash2(courseIndex, 5) * blockWidth;
    for (let x = 0; x < width; x += 1) {
      const local = (x + shift) % width;
      const block = Math.floor(local / blockWidth) % blockCount;
      const inBlock = local - block * blockWidth;
      const jointX = inBlock < 1 && hash2(block, courseIndex) > 0.25;
      const jointY = inCourse === courseSize - 1 && hash2(block + 7, courseIndex) > 0.2;
      const blockShade = 0.8 + hash2(block, courseIndex + 17) * 0.32;
      const lit = inCourse === 0 ? 1.18 : inCourse === 1 ? 1.07 : 1;
      const grain = 0.9 + hash2(x, y) * 0.2;
      const shade = (jointX || jointY ? 0.5 : blockShade * lit) * grain;
      const offset = (y * width + x) * 4;
      data[offset] = Math.min(255, 84 * shade);
      data[offset + 1] = Math.min(255, 80 * shade);
      data[offset + 2] = Math.min(255, 75 * shade);
      data[offset + 3] = 255;
    }
  }
  return data;
}

/** Tileable value noise in [0, 1] on a lattice of `cellsX` x `cellsY` cells over the texture. */
function tileableNoise(x: number, y: number, width: number, height: number, cellsX: number, cellsY: number, seed: number): number {
  const fx = (x / width) * cellsX;
  const fy = (y / height) * cellsY;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const at = (cx: number, cy: number) => hash2(((cx % cellsX) + cellsX) % cellsX + seed * 7919, ((cy % cellsY) + cellsY) % cellsY);
  const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
  const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
  return top + (bottom - top) * sy;
}

function createNaturalRockPixels(width: number, height: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  // Facets are wider than tall, so they read as rock layers running along the edge.
  const cols = Math.max(2, Math.round(width / 38));
  const rows = Math.max(2, Math.round(height / 20));
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  const wrapIndex = (value: number, size: number) => ((value % size) + size) % size;

  for (let y = 0; y < height; y += 1) {
    const cy = Math.floor(y / cellHeight);
    for (let x = 0; x < width; x += 1) {
      const cx = Math.floor(x / cellWidth);
      // Nearest and second nearest facet seeds (squared distances; toroidal, so the texture tiles).
      let nearest = Infinity;
      let second = Infinity;
      let cell = 0;
      let neighbor = 0;
      let seedX = 0;
      let seedY = 0;
      for (let j = -1; j <= 1; j += 1) {
        for (let i = -1; i <= 1; i += 1) {
          const gx = cx + i;
          const gy = cy + j;
          const id = wrapIndex(gy, rows) * cols + wrapIndex(gx, cols);
          const px = (gx + 0.1 + hash2(id, 1) * 0.8) * cellWidth;
          const py = (gy + 0.1 + hash2(id, 2) * 0.8) * cellHeight;
          const distance = (x - px) * (x - px) + (y - py) * (y - py);
          if (distance < nearest) {
            second = nearest;
            neighbor = cell;
            nearest = distance;
            cell = id;
            seedX = px;
            seedY = py;
          } else if (distance < second) {
            second = distance;
            neighbor = id;
          }
        }
      }
      // Each facet is a tilted plane: lighter toward its upper side, darker toward its lower side.
      const angle = hash2(cell, 3) * Math.PI * 2;
      const tilt = ((x - seedX) * Math.cos(angle) + (y - seedY) * Math.sin(angle) * 1.4) / cellWidth;
      const facet = 0.8 + hash2(cell, 4) * 0.26 - tilt * 0.2;
      // Rounded facet borders; only some borders are open cracks, the others are soft folds.
      const edge = Math.sqrt(second) - Math.sqrt(nearest);
      const bevel = 0.82 + 0.18 * Math.min(1, edge / 6);
      const cracked = hash2(Math.min(cell, neighbor) * 131 + Math.max(cell, neighbor), 6) < 0.45;
      const crack = cracked && edge < 1.3 ? 0.5 : 1;
      // Soft strata along the edge and mottled weathering.
      const strata = 0.9 + tileableNoise(x, y, width, height, 4, 18, 3) * 0.2;
      const mottle = 0.88 + tileableNoise(x, y, width, height, 16, 8, 1) * 0.16 + tileableNoise(x, y, width, height, 48, 24, 2) * 0.08;
      const grain = 0.93 + hash2(x, y) * 0.14;
      const shade = facet * bevel * crack * strata * mottle * grain;
      // Warm brown-gray facets and cooler gray ones.
      const warmth = hash2(cell, 5);
      const offset = (y * width + x) * 4;
      data[offset] = Math.min(255, (80 + warmth * 18) * shade);
      data[offset + 1] = Math.min(255, (78 + warmth * 8) * shade);
      data[offset + 2] = Math.min(255, (76 - warmth * 4) * shade);
      data[offset + 3] = 255;
    }
  }
  return data;
}

export interface RockFaceRenderInput {
  /** RGBA pixels of the rock (wall) mask, row by row; a pixel is rock when its alpha is at least 128. */
  rockMask: Uint8ClampedArray;
  width: number;
  height: number;
  /** World x of the mask's first column, so the texture stays aligned on the map. */
  originX: number;
  /** Face height in pixels: how far a face drops below the rock edge above it. */
  faceHeight: number;
  /** Seamless texture pixels (RGBA) and size, from `createRockFacePixels`. */
  texture: Uint8ClampedArray;
  textureWidth: number;
  textureHeight: number;
}

/**
 * RGBA pixels of the rock faces of a wall seen from above at an angle: below every lower
 * rock edge, a face drops `faceHeight` pixels onto the floor, column by column. Each face
 * pixel knows its depth, so the face is lit at the top and darkens toward the floor, the
 * texture rows run parallel to the rock edge, the last pixels get ambient occlusion and a
 * contact shadow falls on the floor below. A face covers at most 55% of the opening below
 * it, so narrow galleries keep a visible floor. Pixels outside faces and shadows stay
 * transparent. Walks the mask row by row in a single pass.
 */
export function renderRockFacePixels(input: RockFaceRenderInput): Uint8ClampedArray {
  const { rockMask, width, height, texture, textureWidth, textureHeight } = input;
  const faceHeight = Math.max(1, Math.round(input.faceHeight));
  const out = new Uint8ClampedArray(width * height * 4);
  const shadowLength = Math.max(4, Math.round(faceHeight * 0.3));
  const wrap = (value: number, size: number) => ((value % size) + size) % size;
  const originU = wrap(input.originX, textureWidth);

  // Shade per (face length, depth): lit at the top, darker toward the floor, occlusion over
  // the last fifth and a bright rim on the first two pixels. Built lazily per face length.
  const shadeTables: Array<Float32Array | undefined> = [];
  const shadeTable = (length: number): Float32Array => {
    let table = shadeTables[length];
    if (!table) {
      table = new Float32Array(length);
      for (let depth = 0; depth < length; depth += 1) {
        const t = depth / length;
        const light = 1.28 - 0.62 * Math.pow(t, 0.85);
        const occlusion = t > 0.8 ? 1 - (t - 0.8) * 1.6 : 1;
        table[depth] = light * occlusion * (depth < 2 ? 1.25 : 1);
      }
      shadeTables[length] = table;
    }
    return table;
  };
  const shadowAlpha = new Uint8Array(shadowLength);
  for (let step = 0; step < shadowLength; step += 1) {
    const fade = 1 - step / shadowLength;
    shadowAlpha[step] = Math.round(150 * fade * fade);
  }

  // Per column state: row where the current face starts (-1: none) and its length.
  const faceTop = new Int32Array(width).fill(-1);
  const faceLength = new Int32Array(width);
  const wasRock = new Uint8Array(width);
  // Pixels are written as packed RGBA words (little-endian, as on every browser platform).
  const words = new Uint32Array(out.buffer);
  const textureWords = new Uint32Array(texture.buffer, texture.byteOffset, textureWidth * textureHeight);

  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      if (rockMask[(row + x) * 4 + 3] >= 128) {
        if (!wasRock[x]) {
          wasRock[x] = 1;
          faceTop[x] = -1;
        }
        continue;
      }
      if (wasRock[x]) {
        wasRock[x] = 0;
        faceTop[x] = y;
        let opening = 0;
        while (y + opening < height && rockMask[((y + opening) * width + x) * 4 + 3] < 128 && opening <= faceHeight * 2) {
          opening += 1;
        }
        faceLength[x] = Math.max(1, Math.min(faceHeight, Math.round(opening * 0.55)));
      }
      const top = faceTop[x];
      if (top < 0) continue;

      const depth = y - top;
      const length = faceLength[x];
      if (depth < length) {
        const shade = shadeTable(length)[depth];
        let u = originU + x;
        if (u >= textureWidth) u %= textureWidth;
        const texel = textureWords[(depth % textureHeight) * textureWidth + u];
        const r = Math.min(255, (texel & 255) * shade) | 0;
        const g = Math.min(255, ((texel >>> 8) & 255) * shade) | 0;
        const b = Math.min(255, ((texel >>> 16) & 255) * shade) | 0;
        words[row + x] = (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
      } else if (depth < length + shadowLength) {
        // Contact shadow on the floor, fading away from the foot of the face.
        words[row + x] = ((shadowAlpha[depth - length] << 24) | 0x050608) >>> 0;
      } else {
        faceTop[x] = -1;
      }
    }
  }
  return out;
}
