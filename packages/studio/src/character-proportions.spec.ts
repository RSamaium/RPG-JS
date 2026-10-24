import { describe, expect, it } from "vitest";
import { characterAnimationCalibration, characterFrameBounds, characterFrameTransform, visibleCharacterHeight } from "./character-proportions";

/** One opaque rectangle per cell: `[left, top, right, bottom]` (exclusive end). */
const sheet = (columns: number, rows: number, cell: [number, number], rects: Array<[number, number, number, number] | null>) => {
  const [width, height] = cell;
  const pixels = { width: width * columns, height: height * rows, data: new Uint8ClampedArray(width * columns * height * rows * 4) } as ImageData;
  rects.forEach((rect, index) => {
    if (!rect) return;
    for (let y = rect[1]; y < rect[3]; y++) {
      for (let x = rect[0]; x < rect[2]; x++) {
        const offset = (((Math.floor(index / columns) * height + y) * pixels.width) + (index % columns) * width + x) * 4 + 3;
        pixels.data[offset] = 255;
      }
    }
  });
  return characterFrameBounds(pixels, columns, rows);
};

describe("character animation calibration", () => {
  it("measures the feet center from the lowest rows, not from the arms", () => {
    // body 40..60, with an arm sticking out on the left in the middle of the character
    const [bounds] = sheet(1, 1, [100, 100], [[40, 20, 60, 90]]);
    const withArm = sheet(1, 1, [100, 100], [[10, 50, 60, 52]]);
    expect(bounds!.footX).toBeCloseTo(50);
    expect(withArm[0]!.footX).toBeCloseTo(35);
  });

  it("puts the feet of two sheets of different cell sizes on the same ground point", () => {
    const idle = sheet(2, 1, [100, 100], [[40, 20, 60, 90], [40, 22, 60, 92]]).filter(Boolean) as any[];
    // walk: bigger cells, character 1.5x bigger, off center, first pose has a raised arm
    const walk = sheet(2, 1, [200, 200], [[100, 10, 160, 170], [100, 20, 160, 190]]).filter(Boolean) as any[];
    const calibration = characterAnimationCalibration(idle, walk);
    expect(calibration.scale).toBeCloseTo(70 / 170);
    const transform = characterFrameTransform(calibration);
    expect(transform.footAnchor[0]).toBeCloseTo(130 / 200);
    expect(transform.footAnchor[1]).toBeCloseTo(190 / 200);
    // the reference calibrates to itself
    expect(characterAnimationCalibration(idle, idle).scale).toBe(1);
  });

  it("uses the median pose so one odd frame does not move the animation", () => {
    const frames = sheet(3, 1, [100, 100], [[40, 20, 60, 90], [40, 5, 60, 90], [40, 20, 60, 90]]) as any[];
    const calibration = characterAnimationCalibration(frames, frames);
    expect(calibration.bottom).toBe(90);
    expect(calibration.scale).toBe(1);
  });
});

/** The scans as they were before the single fast pass: the results must not change. */
const legacyHeight = (pixels: ImageData, columns: number, rows: number) => {
  const frameWidth = Math.floor(pixels.width / columns);
  const frameHeight = Math.floor(pixels.height / rows);
  const heights: number[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      let first = frameHeight;
      let last = -1;
      for (let y = 0; y < frameHeight; y++) {
        for (let x = 0; x < frameWidth; x++) {
          const index = ((row * frameHeight + y) * pixels.width + column * frameWidth + x) * 4 + 3;
          if (pixels.data[index] > 16) {
            first = Math.min(first, y);
            last = y;
            break;
          }
        }
      }
      if (last >= first) heights.push(last - first + 1);
    }
  }
  heights.sort((a, b) => a - b);
  return heights[Math.floor(heights.length / 2)];
};

const legacyBounds = (pixels: ImageData, columns: number, rows: number) => {
  const width = Math.floor(pixels.width / columns);
  const height = Math.floor(pixels.height / rows);
  return Array.from({ length: columns * rows }, (_, index) => {
    let left = width, right = -1, top = height, bottom = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (((Math.floor(index / columns) * height + y) * pixels.width) + (index % columns) * width + x) * 4 + 3;
        if (pixels.data[offset] <= 16) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    if (bottom < top) return undefined;
    const band = Math.max(2, Math.round((bottom - top + 1) * 0.06));
    let sum = 0, count = 0;
    for (let y = Math.max(top, bottom - band + 1); y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const offset = (((Math.floor(index / columns) * height + y) * pixels.width)
          + (index % columns) * width + x) * 4 + 3;
        if (pixels.data[offset] > 16) { sum += x + 0.5; count++; }
      }
    }
    return { width, height, top, bottom: bottom + 1, centerX: (left + right + 1) / 2, footX: count ? sum / count : (left + right + 1) / 2 };
  });
};

describe("character frame scan", () => {
  it("gives the same bounds and height as the per-pixel scan on random sheets", () => {
    let seed = 12345;
    const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 0x100000000;
    for (let round = 0; round < 40; round++) {
      const columns = 1 + Math.floor(random() * 4);
      const rows = 1 + Math.floor(random() * 4);
      const cellWidth = 3 + Math.floor(random() * 30);
      const cellHeight = 3 + Math.floor(random() * 30);
      // Extra pixels on the right and bottom are outside every cell, like in a real atlas.
      const width = cellWidth * columns + Math.floor(random() * 3);
      const height = cellHeight * rows + Math.floor(random() * 3);
      const data = new Uint8ClampedArray(width * height * 4);
      const density = random() * 0.4;
      for (let pixel = 0; pixel < width * height; pixel++) {
        if (random() < density) data[pixel * 4 + 3] = [0, 16, 17, 128, 255][Math.floor(random() * 5)];
      }
      const pixels = { width, height, data } as ImageData;
      expect(characterFrameBounds(pixels, columns, rows)).toEqual(legacyBounds(pixels, columns, rows));
      expect(visibleCharacterHeight(pixels, columns, rows)).toBe(legacyHeight(pixels, columns, rows));
    }
  });

  it("treats an alpha of 16 as empty and 17 as visible", () => {
    const data = new Uint8ClampedArray(4 * 4 * 4);
    data[(1 * 4 + 1) * 4 + 3] = 16;
    expect(characterFrameBounds({ width: 4, height: 4, data } as ImageData, 1, 1)).toEqual([undefined]);
    data[(1 * 4 + 1) * 4 + 3] = 17;
    expect(characterFrameBounds({ width: 4, height: 4, data } as ImageData, 1, 1)[0]).toMatchObject({ top: 1, bottom: 2 });
  });
});
