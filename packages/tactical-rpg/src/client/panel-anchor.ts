/**
 * Where the skill and the item menus open: beside the unit that acts, like its menu of actions, so the eye does not cross the field after a
 * click on "Skills". The panel keeps clear of the bar at the top and of the dock at the bottom (the card of the unit, the end of the phase);
 * on a narrow screen it returns "" and the sheet docks the panel above the dock.
 */
export interface Point {
  x: number;
  y: number;
}
export interface Viewport {
  width: number;
  height: number;
}

const PANEL_WIDTH = 420;
/** Space the menu of actions leaves between the unit and its own edge, on each side of the unit. */
const UNIT_GAP = 76;
const EDGE = 12;
/** The status bar at the top and the dock at the bottom stay uncovered. */
const TOP_RESERVE = 64;
const DOCK_RESERVE = 130;
/** From the anchor of the menu of actions (above the unit) down to the feet of the unit. */
const FEET = 70;
export const NARROW_SCREEN = 700;

/** `at` is the anchor of the menu of actions (`field.menuAt`): right of the unit, a little above its centre. */
export function panelPlacement(at: Point | null, view: Viewport): string {
  if (!at || view.width < NARROW_SCREEN) return "";
  const width = Math.min(PANEL_WIDTH, view.width - 2 * EDGE);
  const fitsRight = at.x + width <= view.width - EDGE;
  const left = Math.max(EDGE, fitsRight ? at.x : at.x - UNIT_GAP - width);
  const bottomEdge = Math.min(at.y + FEET, view.height - DOCK_RESERVE);
  const maxHeight = Math.max(160, bottomEdge - TOP_RESERVE);
  return `left:${Math.round(left)}px;right:auto;bottom:${Math.round(view.height - bottomEdge)}px;width:${Math.round(width)}px;max-height:${Math.round(maxHeight)}px;overflow-y:auto`;
}
