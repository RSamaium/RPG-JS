import { getMapChunkKey } from "@rpgjs/common";
import type { StudioTerrainControlRegion } from "./map-renderer/types";
import {
  STUDIO_TERRAIN_CONTROL_REGIONS,
  type PreparedStudioMapPayload,
} from "./map-streaming";

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const CONTROL_REGION_MARGIN = 64;

interface DecodedPng {
  width: number;
  height: number;
  pixels: Uint8Array;
}

function readChunkType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3]
  );
}

function paeth(left: number, above: number, upperLeft: number): number {
  const prediction = left + above - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const aboveDistance = Math.abs(prediction - above);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance)
    return left;
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const compressed = Uint8Array.from(bytes);
  const stream = new Blob([compressed.buffer]).stream().pipeThrough(
    new DecompressionStream("deflate")
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decodeRgbaPng(buffer: ArrayBuffer): Promise<DecodedPng> {
  const bytes = new Uint8Array(buffer);
  if (
    bytes.length < 33 ||
    PNG_SIGNATURE.some((value, index) => bytes[index] !== value)
  ) {
    throw new Error("Studio terrain control texture is not a PNG image");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  const bitDepth = bytes[24];
  const colorType = bytes[25];
  const interlace = bytes[28];
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(
      `Studio terrain control texture must be a non-interlaced RGBA8 PNG (received bitDepth=${bitDepth}, colorType=${colorType}, interlace=${interlace})`
    );
  }

  const idat: Uint8Array[] = [];
  for (let offset = 8; offset + 12 <= bytes.length; ) {
    const length = view.getUint32(offset);
    const type = readChunkType(bytes, offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) break;
    if (type === "IDAT") idat.push(bytes.subarray(dataStart, dataEnd));
    offset = dataEnd + 4;
    if (type === "IEND") break;
  }
  const compressedLength = idat.reduce((total, chunk) => total + chunk.length, 0);
  const compressed = new Uint8Array(compressedLength);
  let compressedOffset = 0;
  for (const chunk of idat) {
    compressed.set(chunk, compressedOffset);
    compressedOffset += chunk.length;
  }

  const filtered = await inflate(compressed);
  const stride = width * 4;
  const expectedLength = (stride + 1) * height;
  if (filtered.length < expectedLength) {
    throw new Error("Studio terrain control texture has incomplete PNG data");
  }

  const pixels = new Uint8Array(stride * height);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = filtered[sourceOffset++];
    const rowOffset = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const raw = filtered[sourceOffset++];
      const left = x >= 4 ? pixels[rowOffset + x - 4] : 0;
      const above = y > 0 ? pixels[rowOffset + x - stride] : 0;
      const upperLeft = y > 0 && x >= 4 ? pixels[rowOffset + x - stride - 4] : 0;
      switch (filter) {
        case 0:
          pixels[rowOffset + x] = raw;
          break;
        case 1:
          pixels[rowOffset + x] = (raw + left) & 0xff;
          break;
        case 2:
          pixels[rowOffset + x] = (raw + above) & 0xff;
          break;
        case 3:
          pixels[rowOffset + x] = (raw + Math.floor((left + above) / 2)) & 0xff;
          break;
        case 4:
          pixels[rowOffset + x] =
            (raw + paeth(left, above, upperLeft)) & 0xff;
          break;
        default:
          throw new Error(`Unsupported PNG filter ${filter}`);
      }
    }
  }
  return { width, height, pixels };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const blockSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += blockSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + blockSize));
  }
  return btoa(binary);
}

function encodeRle(pixels: Uint8Array): Uint8Array {
  const output: number[] = [];
  for (let offset = 0; offset < pixels.length; ) {
    const r = pixels[offset];
    const g = pixels[offset + 1];
    const b = pixels[offset + 2];
    const a = pixels[offset + 3];
    let run = 1;
    while (
      run < 0xffffffff &&
      offset + run * 4 < pixels.length &&
      pixels[offset + run * 4] === r &&
      pixels[offset + run * 4 + 1] === g &&
      pixels[offset + run * 4 + 2] === b &&
      pixels[offset + run * 4 + 3] === a
    ) {
      run += 1;
    }
    output.push(
      run & 0xff,
      (run >>> 8) & 0xff,
      (run >>> 16) & 0xff,
      (run >>> 24) & 0xff,
      r,
      g,
      b,
      a
    );
    offset += run * 4;
  }
  return Uint8Array.from(output);
}

function extractRegion(
  image: DecodedPng,
  bounds: { x: number; y: number; width: number; height: number }
): Uint8Array {
  const output = new Uint8Array(bounds.width * bounds.height * 4);
  for (let y = 0; y < bounds.height; y += 1) {
    const sourceStart = ((bounds.y + y) * image.width + bounds.x) * 4;
    const targetStart = y * bounds.width * 4;
    output.set(
      image.pixels.subarray(sourceStart, sourceStart + bounds.width * 4),
      targetStart
    );
  }
  return output;
}

function encodeRegion(
  key: string,
  bounds: { x: number; y: number; width: number; height: number },
  pixels: Uint8Array
): StudioTerrainControlRegion {
  const rle = encodeRle(pixels);
  const useRle = rle.length < pixels.length;
  return {
    key,
    ...bounds,
    encoding: useRle ? "rgba8-rle-base64" : "rgba8-base64",
    data: bytesToBase64(useRle ? rle : pixels),
  };
}

/** Precompute private control-texture regions before map data enters a room. */
export async function prepareStudioTerrainControlRegions(
  prepared: PreparedStudioMapPayload,
  chunkCells = 16
): Promise<PreparedStudioMapPayload> {
  const control = prepared.data?.terrainRenderData?.terrainControl;
  if (!control?.source) return prepared;
  if (prepared.data[STUDIO_TERRAIN_CONTROL_REGIONS]) return prepared;

  const response = await fetch(control.source);
  if (!response.ok) {
    throw new Error(
      `Unable to load Studio terrain control texture (${response.status}) from ${control.source}`
    );
  }
  const image = await decodeRgbaPng(await response.arrayBuffer());
  const chunkSize = Math.max(1, Math.floor(chunkCells)) * 48;
  const columns = Math.ceil(prepared.width / chunkSize);
  const rows = Math.ceil(prepared.height / chunkSize);
  const regions: Record<string, StudioTerrainControlRegion> = {};

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const left = Math.max(0, x * chunkSize - CONTROL_REGION_MARGIN);
      const top = Math.max(0, y * chunkSize - CONTROL_REGION_MARGIN);
      const right = Math.min(
        image.width,
        (x + 1) * chunkSize + CONTROL_REGION_MARGIN
      );
      const bottom = Math.min(
        image.height,
        (y + 1) * chunkSize + CONTROL_REGION_MARGIN
      );
      const bounds = {
        x: left,
        y: top,
        width: Math.max(1, right - left),
        height: Math.max(1, bottom - top),
      };
      const key = getMapChunkKey(x, y);
      regions[key] = encodeRegion(key, bounds, extractRegion(image, bounds));
    }
  }

  prepared.data[STUDIO_TERRAIN_CONTROL_REGIONS] = regions;
  return prepared;
}
