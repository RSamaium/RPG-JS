import { describe, expect, it } from "vitest";
import { characterAnimationCalibration, characterFrameBounds, characterFrameTransform } from "./character-proportions";

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
