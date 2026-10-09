/** Characters are displayed this much bigger than their source scale, to fit the size of the decor. */
export const STUDIO_CHARACTER_DISPLAY_BOOST = 1.35;

/** Size, in display pixels, of the cell of a generated character on the map. */
const GENERATED_CHARACTER_DISPLAY_SIZE = 128 * STUDIO_CHARACTER_DISPLAY_BOOST;

const toPositive = (value: unknown): number | undefined => {
  const number = typeof value === "string" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) && number > 0 ? number : undefined;
};

/**
 * Scale at which a generated character (an "idle" spritesheet) is displayed: its cell is drawn
 * `GENERATED_CHARACTER_DISPLAY_SIZE` pixels wide, times the scale of its media.
 */
export const resolveGeneratedCharacterDisplayScale = (media: any): number | undefined => {
  const metadata = media?.metadata;
  if (metadata?.generationMode !== "idle") return undefined;
  const columns = toPositive(metadata.columns) ?? 2;
  const rows = toPositive(metadata.rows) ?? 2;
  const width = toPositive(media.width) ?? toPositive(metadata.width) ?? 1024;
  const height = toPositive(media.height) ?? toPositive(metadata.height) ?? 768;
  const cellSize = Math.max(width / columns, height / rows);
  return (GENERATED_CHARACTER_DISPLAY_SIZE / cellSize) * (typeof metadata.scale === "number" ? metadata.scale : 1);
};

/**
 * The hitbox of a Studio event with a generated character is set in pixels of the source image (the
 * body of the character in its cell). It follows the scale the character is displayed at, otherwise it
 * stays as big as the cell of the image. Other graphics keep their hitbox.
 */
export const scaleEventHitboxToGraphic = <T extends { width: number; height: number }>(
  hitbox: T,
  graphics: unknown[],
): T => {
  for (const graphic of graphics) {
    const scale = resolveGeneratedCharacterDisplayScale(graphic);
    if (scale === undefined) continue;
    return {
      ...hitbox,
      width: Math.max(1, Math.round(hitbox.width * scale)),
      height: Math.max(1, Math.round(hitbox.height * scale)),
    };
  }
  return hitbox;
};

/** Graphics an event can be displayed with, the active page first. */
export const collectEventGraphics = (event: any, preferredTrigger?: any): unknown[] => {
  const triggers = Array.isArray(event?.triggers) ? [...event.triggers].reverse() : [];
  return [
    preferredTrigger?.graphic,
    event?.graphic,
    event?.params?.graphic,
    ...triggers.filter((trigger: any) => trigger?.enabled !== false).map((trigger: any) => trigger?.graphic),
  ].filter((graphic) => graphic && typeof graphic === "object");
};
