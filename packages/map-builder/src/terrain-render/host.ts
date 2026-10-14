import { disposeTerrainMap, prepareTerrainMap, renderTerrainRegion, type PreparedTerrainMap } from "@rpgjs/render-map2d";
import { controlPixels, overlayMaterials, toKernelDocument, writeControl, type TerrainRenderInit } from "../terrain/kernel";
import type { TerrainFrame, WorldRect } from "../terrain/scheduler";
import type { MaskRect } from "../terrain/types";

/**
 * The kernel and the control image it reads, in one place. The inline backend calls it directly, and a
 * worker calls it from its message handler: same code, same pixels.
 */
export class TerrainKernelHost {
  private prepared: PreparedTerrainMap | undefined;
  private control: Uint8ClampedArray | undefined;
  private maskWidth = 0;
  private current: TerrainRenderInit | undefined;
  private hasOverlays = false;

  init(init: TerrainRenderInit): void {
    if (this.prepared) disposeTerrainMap(this.prepared);
    this.current = init;
    this.control = controlPixels(init.data);
    this.maskWidth = init.data.mask.width;
    this.hasOverlays = overlayMaterials(init.data).length > 0;
    this.prepare();
  }

  private prepare(): void {
    if (!this.current || !this.control) return;
    this.prepared = prepareTerrainMap({ map: toKernelDocument(this.current, this.control), textures: { ...this.current.images } });
  }

  /** Material values over a rectangle of the mask, as a patch changed them. */
  updateMask(rect: MaskRect, values: ArrayLike<number>): void {
    if (!this.control) throw new Error("terrain host: not initialised");
    writeControl(this.control, this.maskWidth, rect, values);
    // The kernel keeps the overlays of nine-slice and presets, computed on the whole mask: drop them.
    if (this.hasOverlays) {
      if (this.prepared) disposeTerrainMap(this.prepared);
      this.prepare();
    }
  }

  render(rect: WorldRect, margin?: number): TerrainFrame {
    if (!this.prepared) throw new Error("terrain host: not initialised");
    const frame = renderTerrainRegion(this.prepared, { bounds: rect, ...(margin !== undefined ? { margin } : {}) });
    return { x: frame.x, y: frame.y, width: frame.width, height: frame.height, pixels: frame.pixels };
  }

  destroy(): void {
    if (this.prepared) disposeTerrainMap(this.prepared);
    this.prepared = undefined;
    this.control = undefined;
    this.current = undefined;
  }
}
