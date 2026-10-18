/**
 * Creates a canvas in the page or, in a worker (no `document`), an `OffscreenCanvas`.
 * The terrain painting code runs in both, through the same 2D API.
 */
export function createCanvasElement(width = 1, height = 1): HTMLCanvasElement {
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return new OffscreenCanvas(width, height) as unknown as HTMLCanvasElement;
}
