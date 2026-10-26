import { Graphics } from "pixi.js";
import type { InteractionSnapshot } from "../interaction/controller";
import { targetKey, type TargetRef } from "../interaction/picking";
import type { Rect } from "../renderer/geometry";
import type { SceneNode } from "../renderer/scene";
import type { SkinContext, SkinLayer, SkinLayerFactory } from "./types";

/** A rectangle to draw: filled, stroked, or both. */
export interface DrawnFrame {
  readonly rect: Rect;
  readonly color: number;
  readonly width?: number;
  readonly alpha?: number;
  readonly fill?: number;
}

export function drawFrames(graphics: Graphics, frames: readonly DrawnFrame[]): void {
  graphics.clear();
  for (const frame of frames) {
    const { x, y, width, height } = frame.rect;
    if (frame.fill !== undefined) graphics.rect(x, y, width, height).fill({ color: frame.color, alpha: frame.fill });
    if (frame.width !== undefined && frame.width > 0) {
      graphics.rect(x, y, width, height).stroke({ width: frame.width, color: frame.color, alpha: frame.alpha ?? 1 });
    }
  }
}

export const nodeOf = (nodes: readonly SceneNode[], target: TargetRef): SceneNode | undefined => {
  const key = targetKey(target);
  return nodes.find((node) => node.key === key);
};

/** A layer that draws rectangles computed from the state. The base of the default and game skins. */
export function frameLayer(frames: (snapshot: InteractionSnapshot, context: SkinContext, elapsedMs: number) => readonly DrawnFrame[]): SkinLayerFactory {
  return (context): SkinLayer => {
    const graphics = new Graphics();
    context.layer.addChild(graphics);
    let last: InteractionSnapshot | undefined;
    let elapsed = 0;
    const draw = (): void => {
      if (last) drawFrames(graphics, frames(last, context, elapsed));
    };
    return {
      update(snapshot) {
        last = snapshot;
        draw();
      },
      tick(deltaMs) {
        elapsed += deltaMs;
        if (last) draw();
      },
      destroy: () => graphics.destroy(),
    };
  };
}
