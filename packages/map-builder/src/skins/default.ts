import { Container, Graphics, Sprite, Texture } from "pixi.js";
import { sameTarget } from "../interaction/picking";
import type { GhostState } from "../interaction/controller";
import { drawFrames, frameLayer, nodeOf, type DrawnFrame } from "./frames";
import type { Skin, SkinContext, SkinLayer, SkinLayerFactory } from "./types";

export const SKIN_COLORS = { accent: 0x3b82f6, valid: 0x22c55e, invalid: 0xef4444 } as const;

export interface GhostLookOptions {
  readonly valid: number;
  readonly invalid: number;
  /** Opacity of the sprite of the item. */
  readonly alpha: number;
  /** Makes the ghost pulse: opacity swings around `alpha`. */
  readonly pulse: boolean;
}

/** The ghost of an item: its image, translucent, and an outline that says whether it can be placed here. */
export function ghostLayer(look: GhostLookOptions): SkinLayerFactory {
  return (context: SkinContext): SkinLayer => {
    const holder = new Container();
    const sprite = new Sprite(Texture.EMPTY);
    const outline = new Graphics();
    holder.addChild(sprite, outline);
    holder.visible = false;
    context.layer.addChild(holder);

    let ghost: GhostState | null = null;
    let elapsed = 0;

    const draw = (): void => {
      holder.visible = ghost !== null && ghost.bounds !== undefined;
      if (!ghost?.bounds) return;
      const color = ghost.valid ? look.valid : look.invalid;
      const { x, y, width, height } = ghost.bounds;

      const descriptor = context.assets.resolve(ghost.kind);
      const texture = descriptor ? context.textures.get(descriptor.src, descriptor.frame) : undefined;
      if (descriptor && !texture) void context.textures.ready(descriptor.src, descriptor.frame).then(context.requestUpdate, () => undefined);
      // Opacity and tint do not depend on the image: they are right from the first frame.
      sprite.tint = ghost.valid ? 0xffffff : look.invalid;
      sprite.alpha = look.pulse ? Math.max(0.15, look.alpha + Math.sin(elapsed / 180) * 0.2) : look.alpha;
      sprite.visible = texture !== undefined;
      if (texture) {
        sprite.texture = texture;
        sprite.position.set(x, y);
        sprite.width = width;
        sprite.height = height;
      }

      const frames: DrawnFrame[] = [{ rect: ghost.bounds, color, width: 1, alpha: 0.7 }];
      if (ghost.hitbox) frames.push({ rect: ghost.hitbox, color, fill: 0.25, width: 1 });
      drawFrames(outline, frames);
    };

    return {
      update(snapshot) {
        ghost = snapshot.ghost;
        draw();
      },
      tick(deltaMs) {
        elapsed += deltaMs;
        if (look.pulse && ghost) draw();
      },
      destroy: () => holder.destroy({ children: true }),
    };
  };
}

export interface FrameLookOptions {
  /** Colour of the frame around what is selected. */
  readonly color: number;
  /** `"glow"` adds a soft halo around the line. */
  readonly outline: "line" | "glow";
}

/** The selection, hover, drag and marquee layers, in a given look. */
export function framesSkin(look: FrameLookOptions, ghost: SkinLayerFactory): Skin {
  const framed = (rect: DrawnFrame["rect"], color: number, width: number): DrawnFrame[] =>
    look.outline === "glow"
      ? [{ rect, color, width: width + 4, alpha: 0.22 }, { rect, color, width, alpha: 1 }]
      : [{ rect, color, width, alpha: 1 }];

  return {
    selection: frameLayer((snapshot, context) =>
      snapshot.selection.flatMap((target) => {
        const node = nodeOf(context.nodes(), target);
        return node ? framed(node.bounds, look.color, 2) : [];
      }),
    ),
    hover: frameLayer((snapshot, context) => {
      const hovered = snapshot.hovered;
      if (!hovered || snapshot.selection.some((target) => sameTarget(target, hovered))) return [];
      const node = nodeOf(context.nodes(), hovered);
      return node ? [{ rect: node.bounds, color: look.color, width: 1, alpha: 0.6 }] : [];
    }),
    drag: frameLayer((snapshot, context) => {
      const drag = snapshot.drag;
      if (!drag) return [];
      const color = drag.valid ? SKIN_COLORS.valid : SKIN_COLORS.invalid;
      return drag.targets.flatMap((target) => {
        const node = nodeOf(context.nodes(), target);
        if (!node) return [];
        // In live mode the element has already moved: the frame is just where it is.
        const rect = drag.live ? node.bounds : { ...node.bounds, x: node.bounds.x + drag.delta.x, y: node.bounds.y + drag.delta.y };
        return [{ rect, color, width: 1, alpha: 0.9, fill: 0.15 }];
      });
    }),
    marquee: frameLayer((snapshot) =>
      snapshot.marquee ? [{ rect: snapshot.marquee, color: look.color, width: 1, alpha: 0.9, fill: 0.1 }] : [],
    ),
    ghost,
  };
}

/** A sober skin: plain frames, a translucent ghost. Enough for a tool, meant to be replaced. */
export function defaultSkin(): Skin {
  return framesSkin(
    { color: SKIN_COLORS.accent, outline: "line" },
    ghostLayer({ valid: SKIN_COLORS.valid, invalid: SKIN_COLORS.invalid, alpha: 0.65, pulse: false }),
  );
}

