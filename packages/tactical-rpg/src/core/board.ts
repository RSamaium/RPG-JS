import type { Board, Cell, BattleState, Unit } from "./types";
export const key = (p: Cell) => `${p.x},${p.y}`;
export const distance = (a: Cell, b: Cell) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
/** Board used when an encounter gives no size. */
export const DEFAULT_BOARD: Omit<Board, "origin"> = { columns: 9, rows: 7, cellSize: 64, blocked: [] };
export function inside(board: Board, cell: Cell): boolean {
  return (
    Number.isInteger(cell?.x) &&
    Number.isInteger(cell?.y) &&
    cell.x >= 0 &&
    cell.y >= 0 &&
    cell.x < board.columns &&
    cell.y < board.rows &&
    !board.blocked.includes(key(cell))
  );
}
export function world(board: Board, cell: Cell): Cell {
  return {
    x: board.origin.x + (cell.x + 0.5) * board.cellSize,
    y: board.origin.y + (cell.y + 0.5) * board.cellSize,
  };
}
/** The cells a unit cannot walk on: where the others stand, and where the units of other players are about to move (`holds`). */
function taken(state: BattleState, unit: Unit): Set<string> {
  return new Set([
    ...state.units.filter((u) => u.hp > 0 && u.id !== unit.id).map(key),
    ...(state.holds ?? []).filter((hold) => hold.unitId !== unit.id).map(key),
  ]);
}
/** The cell is held for the unit of another player. */
export function heldByOther(state: BattleState, unit: Unit, cell: Cell): boolean {
  return (state.holds ?? []).some((hold) => hold.unitId !== unit.id && hold.x === cell.x && hold.y === cell.y);
}
export function reachable(state: BattleState, unit: Unit): Map<string, Cell[]> {
  const paths = new Map<string, Cell[]>([[key(unit), []]]);
  const occupied = taken(state, unit);
  const queue: Cell[] = [{ x: unit.x, y: unit.y }];
  while (queue.length) {
    const cell = queue.shift()!;
    const path = paths.get(key(cell))!;
    if (path.length >= unit.move) continue;
    for (const [dx, dy] of [
      [0, -1],
      [-1, 0],
      [1, 0],
      [0, 1],
    ]) {
      const next = { x: cell.x + dx, y: cell.y + dy };
      const k = key(next);
      if (!inside(state.board, next) || occupied.has(k) || paths.has(k))
        continue;
      paths.set(k, [...path, next]);
      queue.push(next);
    }
  }
  return paths;
}
export function lineClear(board: Board, a: Cell, b: Cell): boolean {
  const steps = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  for (let i = 1; i < steps; i++) {
    if (
      board.blocked.includes(
        key({
          x: Math.round(a.x + ((b.x - a.x) * i) / steps),
          y: Math.round(a.y + ((b.y - a.y) * i) / steps),
        }),
      )
    )
      return false;
  }
  return true;
}

/**
 * A path chosen by the player (cell by cell) is valid: adjacent steps inside
 * the board, through free cells, no loop, within the unit's move.
 */
export function validPath(state: BattleState, unit: Unit, path: Cell[]): boolean {
  if (!Array.isArray(path) || !path.length || path.length > unit.move) return false;
  const occupied = taken(state, unit);
  const seen = new Set([key(unit)]);
  let from: Cell = unit;
  for (const step of path) {
    const k = key(step);
    if (!inside(state.board, step) || occupied.has(k) || seen.has(k) || distance(from, step) !== 1) return false;
    seen.add(k);
    from = step;
  }
  return true;
}
