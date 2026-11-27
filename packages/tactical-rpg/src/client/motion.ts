import type { Cell } from '../core/types';
export type Facing='up'|'left'|'down'|'right';
// Studio CharacterSpritesheet default lanes, not RPG Maker's lane order.
export const directionRow:Record<Facing,number>={up:0,left:1,down:2,right:3};
export function facingBetween(from:Cell,to:Cell,fallback:Facing):Facing {
  const dx=to.x-from.x,dy=to.y-from.y;
  if(dx===0&&dy===0)return fallback;
  return Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';
}
export function movementFacing(origin:Cell,steps:Cell[],elapsed:number,fallback:Facing):Facing {
  if(!steps.length)return fallback;
  const index=Math.min(steps.length-1,Math.floor(Math.max(0,elapsed)/.9*steps.length));
  return facingBetween(index===0?origin:steps[index-1],steps[index],fallback);
}

/** RAF timestamps may precede a packet received later in the same frame. */
export function movementAt(origin: Cell, steps: Cell[], elapsed: number, duration = .9): Cell {
  if (!steps.length) return origin;
  const path = [origin, ...steps];
  const progress = Math.max(0, Math.min(1, elapsed / duration)) * steps.length;
  const index = Math.min(steps.length - 1, Math.floor(progress));
  const from = path[index], to = path[index + 1], t = progress - index;
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}
