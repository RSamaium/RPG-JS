import { signal } from "canvasengine";
import type { Unit } from "../core/types";

/** The images of the portraits the game gave by id (`studio-face:<media>`, `studio-image:<media>`), registered by the game before the battle. */
export const portraitUrls: Record<string, string> = {};

/**
 * Portraits of the units that have none: the character of the map of their battler, standing and facing down, cut out of its
 * spritesheet (battler id → image URL). Filled while the battle loads its battlers.
 */
export const battlerFaces = signal<Record<string, string>>({});

/** An RPGJS spritesheet as the battle reads it: its image, its grid and its textures (`stand`, `walk`…). */
export interface FaceSheet {
  image?: string;
  framesWidth?: number;
  framesHeight?: number;
  textures?: Record<string, { animations?: unknown } | undefined>;
}

type Frame = { frameX?: number; frameY?: number };

/** The first frame of an animation of the sheet facing down (`animations` is a list of frame lists, or a function of the direction). */
function firstFrame(texture: { animations?: unknown } | undefined): Frame | undefined {
  const animations = texture?.animations;
  const list = typeof animations === "function" ? (animations as (o: { direction: string }) => unknown)({ direction: "down" }) : animations;
  const frame = Array.isArray(list) && Array.isArray(list[0]) ? (list[0][0] as Frame | undefined) : undefined;
  return frame && (typeof frame.frameX === "number" || typeof frame.frameY === "number") ? frame : undefined;
}

/** The cell of the sheet a portrait shows: standing facing down, else walking, else the first frame. */
export function faceFrame(sheet: FaceSheet): { x: number; y: number } {
  const frame = firstFrame(sheet.textures?.stand) ?? firstFrame(sheet.textures?.walk) ?? firstFrame(sheet.textures?.default);
  return { x: frame?.frameX ?? 0, y: frame?.frameY ?? 0 };
}

/** Cut the face frame out of the sheet's image: a PNG data URL, or `undefined` without an image or a canvas. */
export async function cutFace(sheet: FaceSheet): Promise<string | undefined> {
  if (!sheet.image || typeof document === "undefined") return undefined;
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = sheet.image;
  await image.decode();
  const w = Math.floor(image.naturalWidth / (sheet.framesWidth ?? 1));
  const h = Math.floor(image.naturalHeight / (sheet.framesHeight ?? 1));
  if (!w || !h) return undefined;
  const { x, y } = faceFrame(sheet);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  ctx.drawImage(image, x * w, y * h, w, h, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}

/**
 * CSS of a unit portrait (HUD sheets, cut-ins): its `portrait` image, else the character of its battler as the map draws it, else a plain
 * crest. A faceset is a grid of faces: the first one (neutral) is shown.
 */
export function portraitStyle(unit: Unit | undefined | null) {
  const faces = battlerFaces();
  const portrait = unit?.portrait;
  if (portrait?.startsWith("studio-")) {
    const url = portraitUrls[portrait];
    if (url) return portrait.startsWith("studio-face:") ? `background-image:url("${url}");background-size:300% 400%;background-position:0 0` : `background-image:url("${url}");background-size:contain;background-repeat:no-repeat;background-position:50% 50%`;
  } else if (portrait) return `background-image:url("${unit.portrait}");background-size:cover;background-position:50% 0%`;
  const face = unit ? faces[unit.battler] : undefined;
  if (face) return `background-image:url("${face}");background-size:contain;background-repeat:no-repeat;background-position:50% 100%;image-rendering:pixelated`;
  const tint = unit?.team === "enemy" ? "color-mix(in srgb, var(--rpg-ui-danger, #ef4444) 30%, var(--rpg-ui-bg, #0b0f16))" : "color-mix(in srgb, var(--rpg-ui-accent, #38bdf8) 25%, var(--rpg-ui-bg, #0b0f16))";
  return `background:radial-gradient(circle at 50% 35%, ${tint}, var(--rpg-ui-bg, #0b0f16) 70%)`;
}
