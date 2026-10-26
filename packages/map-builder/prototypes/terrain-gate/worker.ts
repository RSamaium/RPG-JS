/// <reference lib="webworker" />
import { prepareTerrainMap, renderTerrainRegion } from "@rpgjs/render-map2d";
import { createScene, paintCircle, type SceneOptions } from "./scene";

/**
 * A terrain worker. It rebuilds the same deterministic scene as the main thread, then only receives
 * what a `terrain.paint` patch carries (a disc and a material) and render requests. Frames travel back
 * as transferables: nothing is copied.
 */
type In =
  | { type: "init"; options: SceneOptions }
  | { type: "paint"; cx: number; cy: number; radius: number; material: number }
  | { type: "render"; job: number; x: number; y: number; width: number; height: number; margin?: number; timeMs: number };

let scene: ReturnType<typeof createScene> | undefined;
let prepared: ReturnType<typeof prepareTerrainMap> | undefined;

self.onmessage = (event: MessageEvent<In>) => {
  const message = event.data;
  if (message.type === "init") {
    scene = createScene(message.options);
    prepared = prepareTerrainMap({ map: scene.map, textures: { atlas: scene.atlas } });
    (self as unknown as Worker).postMessage({ type: "ready" });
  } else if (message.type === "paint" && scene) {
    paintCircle(scene.control, scene.scale, message.cx, message.cy, message.radius, message.material);
  } else if (message.type === "render" && prepared) {
    const start = performance.now();
    const frame = renderTerrainRegion(prepared, {
      bounds: { x: message.x, y: message.y, width: message.width, height: message.height },
      timeMs: message.timeMs,
      ...(message.margin !== undefined ? { margin: message.margin } : {}),
    });
    (self as unknown as Worker).postMessage(
      { type: "frame", job: message.job, x: frame.x, y: frame.y, width: frame.width, height: frame.height, pixels: frame.pixels, kernelMs: performance.now() - start },
      [frame.pixels.buffer],
    );
  }
};
