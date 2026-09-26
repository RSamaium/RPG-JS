/** Deterministic value in [0, 1] for two integers. */
function hash2(a: number, b: number): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/**
 * RGBA pixels of a seamless rock face texture: horizontal strata of varying shade, each
 * with a lit top and a dark seam, fine grain and a few vertical cracks. Tiles in both
 * directions; the same input always gives the same pixels (editor and game render alike).
 */
export function createRockFacePixels(width = 256, height = 128, bandHeight = 8): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  const bands = Math.max(1, Math.round(height / bandHeight));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const turn = (x / width) * Math.PI * 2;
      const roughBand = Math.floor(y / bandHeight) % bands;
      const wave = Math.sin(turn * 3 + hash2(roughBand, 1) * 6) * 2 + Math.sin(turn * 7 + 1.3);
      const shifted = (y + wave + height * 2) % height;
      const band = Math.floor(shifted / bandHeight) % bands;
      const inBand = (shifted % bandHeight) / bandHeight;
      const bandShade = 0.78 + hash2(band, 7) * 0.3;
      const ledge = inBand < 0.15 ? 1.2 : inBand > 0.85 ? 0.68 : 1;
      const grain = 0.9 + hash2(x, y) * 0.2;
      const crackColumn = Math.floor(x / 23);
      const crack = hash2(crackColumn, band) > 0.8 && x % 23 === 11 ? 0.55 : 1;
      const shade = bandShade * ledge * grain * crack;
      const offset = (y * width + x) * 4;
      data[offset] = Math.min(255, 88 * shade);
      data[offset + 1] = Math.min(255, 77 * shade);
      data[offset + 2] = Math.min(255, 66 * shade);
      data[offset + 3] = 255;
    }
  }
  return data;
}
