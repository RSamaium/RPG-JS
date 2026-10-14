/** A canvas of the page, or of a worker: the terrain is drawn on either, with the same calls. */
export type TerrainCanvas = HTMLCanvasElement | OffscreenCanvas;
export type TerrainContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
/** A picture the terrain is drawn from: an image of the page, or a bitmap (the only kind a worker can make). */
export type TerrainImage = HTMLImageElement | ImageBitmap;
/** What a painter gives back: a canvas where it ran in the page, a bitmap where it ran in a worker. */
export type TerrainPaintedImage = TerrainCanvas | ImageBitmap;

export function createTerrainCanvas(width: number, height: number): TerrainCanvas {
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return new OffscreenCanvas(width, height);
}

/** Loads a picture in the page: an image element, asked with CORS, as a canvas that is read back needs. */
export function loadTerrainImageElement(source: string): Promise<TerrainImage | null> {
  if (!source || typeof Image === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
    if (image.complete && image.naturalWidth > 0) resolve(image);
  });
}

/** Loads a picture where there is no `Image`, in a worker: fetched with CORS and decoded to a bitmap. */
export async function loadTerrainImageBitmap(source: string): Promise<TerrainImage | null> {
  if (!source) return null;
  try {
    const response = await fetch(source, { mode: "cors" });
    if (!response.ok) return null;
    return await createImageBitmap(await response.blob());
  } catch {
    return null;
  }
}
