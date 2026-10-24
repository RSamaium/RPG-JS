import { resolveGeneratedCharacterDisplayScale, scaleEventHitboxToGraphic } from "./event-hitbox-scale";
import { readPlacementScale, scaleHitboxToPlacement } from "./placement-scale";
import { STUDIO_DEFAULT_CHARACTER_DISPLAY_SCALE } from "./spritesheet-utils";

export interface StudioEventDisplayInput {
  /** The media of the character: its metadata, and the size of its picture. */
  readonly media?: { readonly metadata?: Record<string, unknown>; readonly width?: number; readonly height?: number } | null;
  /** The part of the picture that shows the character facing down, in pixels of the picture. */
  readonly frame?: readonly [number, number, number, number] | null;
  /** The hitbox of the event as the event says it, before the size of its character is taken into account. */
  readonly hitbox: { readonly width: number; readonly height: number };
  /** The scale the map gives to this placement (see `readPlacementScale`): it multiplies the character and the hitbox. */
  readonly scale?: number;
}

export interface StudioEventDisplay {
  /** The hitbox the runtime gives the event. */
  readonly hitbox: { readonly width: number; readonly height: number };
  /** The size its character is drawn at on the map, when it has one. */
  readonly image?: { readonly width: number; readonly height: number };
}

/**
 * How big an event is on the map, as the game runs it: a generated character is drawn (and its hitbox scaled) so that its cell is
 * as wide as the decor wants, any other character at the default display scale times its own `scale`. A map editor draws the
 * event at that size, so that what it shows is what the player sees.
 */
export function resolveStudioEventDisplay(input: StudioEventDisplayInput): StudioEventDisplay {
  const media = input.media ?? null;
  const factor = readPlacementScale(input);
  const hitbox = scaleHitboxToPlacement(media ? scaleEventHitboxToGraphic(input.hitbox, [media]) : input.hitbox, input);
  const frame = input.frame;
  if (!media || !frame || !(frame[2] > 0) || !(frame[3] > 0)) return { hitbox };
  const metadataScale = media.metadata?.["scale"];
  const scale =
    resolveGeneratedCharacterDisplayScale(media) ??
    (typeof metadataScale === "number" ? STUDIO_DEFAULT_CHARACTER_DISPLAY_SCALE * metadataScale : STUDIO_DEFAULT_CHARACTER_DISPLAY_SCALE);
  return { hitbox, image: { width: frame[2] * scale * factor, height: frame[3] * scale * factor } };
}
