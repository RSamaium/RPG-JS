/** A band of the colour grading: a black veil of this opacity over these rows of the stage. */
export interface GradeStrip {
  y: number;
  height: number;
  alpha: number;
}

const BANDS = 40;

/**
 * The colour grading of the background (warm top, darker ground so that the battlers stand out) as thin bands that get darker little by
 * little: a veil with an edge shows as a stripe across the scenery. The ground goes from nothing at 45% of the height to `0.18` at 75% and
 * stays there, the top from `0.12` down to nothing at 20%.
 */
export function gradeStrips(width: number, height: number): GradeStrip[] {
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const strips: GradeStrip[] = [];
  const band = height / BANDS / 2;
  for (let y = 0; y < height; y += band) {
    const at = (y + band / 2) / height;
    const top = 0.12 * (1 - smooth(Math.min(1, Math.max(0, at / 0.2))));
    const ground = 0.18 * smooth(Math.min(1, Math.max(0, (at - 0.45) / 0.3)));
    const alpha = top + ground;
    if (alpha > 0.0005) strips.push({ y, height: Math.min(band, height - y), alpha });
  }
  return strips;
}
