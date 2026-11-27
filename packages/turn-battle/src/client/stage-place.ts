import type { StagePosition } from "../core";

/** The height of the stage where the feet of the fighters stand: the ratio that is the front (1) and the back (0) of the ground. */
const GROUND = { top: 0.47, depth: 0.27 };

/**
 * Where a combatant stands when the troop places it: `position` is a ratio of the width and height of the stage.
 * `depth` and `depthScale` follow the height as the formation does (farther is smaller), so a placed combatant
 * looks like the others.
 */
export function stagePlace(position: StagePosition, size: { w: number; h: number }) {
  const y = Math.min(1, Math.max(0, position.y));
  const ground = (y - GROUND.top) / GROUND.depth;
  return {
    x: size.w * Math.min(1, Math.max(0, position.x)),
    y: size.h * y,
    depth: 0.85 + ground * 0.3,
    depthScale: 0.92 + ground * 0.12,
  };
}

/** Where the party stands when the troop does not say: the middle of its column, on the right. */
export const HEROES_ANCHOR: StagePosition = { x: 0.67, y: 0.62 };

/** How far the troop moves the party from its default place, as ratios of the width and height of the stage. */
export function heroesShift(position: StagePosition | undefined) {
  return position ? { x: position.x - HEROES_ANCHOR.x, y: position.y - HEROES_ANCHOR.y } : { x: 0, y: 0 };
}
