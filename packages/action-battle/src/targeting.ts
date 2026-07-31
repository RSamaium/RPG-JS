import {
  ActionBattleAoeMask,
  ActionBattleSoftTargetingOptions,
} from "./types";
import type { ActionBattleResolvedDirection } from "./attack-input";

export interface ParsedAoeMask {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  cells: Array<{ dx: number; dy: number }>;
}

export interface ActionBattleTilePoint {
  x: number;
  y: number;
}

export interface ActionBattleTileSize {
  width: number;
  height: number;
}

const normalizeMaskRows = (mask: ActionBattleAoeMask | undefined): string[] => {
  if (!mask) return ["#"];
  if (Array.isArray(mask)) return mask;
  return mask
    .trim()
    .split("\n")
    .map((row) => row.replace(/\r/g, ""));
};

export const parseAoeMask = (mask: ActionBattleAoeMask | undefined): ParsedAoeMask => {
  const rows = normalizeMaskRows(mask);
  const height = rows.length;
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const cells: Array<{ dx: number; dy: number }> = [];

  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const char = row[x];
      if (char && char !== "." && char !== " " && char !== "0") {
        cells.push({ dx: x - centerX, dy: y - centerY });
      }
    }
  });

  if (cells.length === 0) {
    cells.push({ dx: 0, dy: 0 });
  }

  return { width, height, centerX, centerY, cells };
};

export const manhattanDistance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const getActionBattleTileSize = (map: any): ActionBattleTileSize => ({
  width: Number(map?.tileWidth ?? 32),
  height: Number(map?.tileHeight ?? 32),
});

export const getActionBattleEntityTile = (
  entity: any,
  tileSize: ActionBattleTileSize
): ActionBattleTilePoint => {
  const hitbox = entity.hitbox?.() ?? {
    w: tileSize.width,
    h: tileSize.height,
  };
  return {
    x: Math.floor((entity.x() + (hitbox.w ?? tileSize.width) / 2) / tileSize.width),
    y: Math.floor((entity.y() + (hitbox.h ?? tileSize.height) / 2) / tileSize.height),
  };
};

export const resolveActionBattleAoeCells = (
  targetTile: ActionBattleTilePoint,
  mask: ActionBattleAoeMask | undefined
): ActionBattleTilePoint[] =>
  parseAoeMask(mask).cells.map((cell) => ({
    x: targetTile.x + cell.dx,
    y: targetTile.y + cell.dy,
  }));

/**
 * Find a legal cast center whose area mask covers the desired target tile.
 * Prefer centering the mask on the target, then the closest legal center.
 */
export const resolveActionBattleAoeTarget = (
  origin: ActionBattleTilePoint,
  desiredTarget: ActionBattleTilePoint,
  range: number,
  mask: ActionBattleAoeMask | undefined
): ActionBattleTilePoint | null => {
  const candidates = parseAoeMask(mask).cells
    .map((cell) => ({
      target: {
        x: desiredTarget.x - cell.dx,
        y: desiredTarget.y - cell.dy,
      },
      offsetDistance: Math.abs(cell.dx) + Math.abs(cell.dy),
    }))
    .filter(({ target }) => manhattanDistance(origin, target) <= range)
    .sort((left, right) => {
      if (left.offsetDistance !== right.offsetDistance) {
        return left.offsetDistance - right.offsetDistance;
      }
      return (
        manhattanDistance(origin, left.target) -
        manhattanDistance(origin, right.target)
      );
    });

  return candidates[0]?.target ?? null;
};

type SoftTargetEntity = {
  id?: string;
  x: () => number;
  y: () => number;
  hitbox?: () => { w?: number; h?: number };
  battleAi?: {
    getTarget?: () => SoftTargetEntity | null;
  };
};

const directionVector = (direction: ActionBattleResolvedDirection) => {
  if (direction === "up") return { x: 0, y: -1 };
  if (direction === "left") return { x: -1, y: 0 };
  if (direction === "right") return { x: 1, y: 0 };
  return { x: 0, y: 1 };
};

const center = (entity: SoftTargetEntity) => {
  const hitbox = entity.hitbox?.() ?? {};
  return {
    x: entity.x() + (hitbox.w ?? 0) / 2,
    y: entity.y() + (hitbox.h ?? 0) / 2,
  };
};

export interface ActionBattleSoftTargetResult<T> {
  target: T;
  direction: ActionBattleResolvedDirection;
  score: number;
  distance: number;
}

export const directionToActionBattleTarget = (
  source: SoftTargetEntity,
  target: SoftTargetEntity
): ActionBattleResolvedDirection => {
  const from = center(source);
  const to = center(target);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.abs(dx) >= Math.abs(dy)
    ? dx >= 0
      ? "right"
      : "left"
    : dy >= 0
      ? "down"
      : "up";
};

/**
 * Pick a contextual melee target without moving the player.
 *
 * Manual facing remains the strongest signal. Distance and enemies currently
 * focused on the player break ties so crowded fights remain readable.
 */
export const resolveActionBattleSoftTarget = <T extends SoftTargetEntity>(
  source: SoftTargetEntity,
  candidates: T[],
  direction: ActionBattleResolvedDirection,
  options: ActionBattleSoftTargetingOptions = {}
): ActionBattleSoftTargetResult<T> | null => {
  const range = Math.max(1, options.range ?? 112);
  const coneDegrees = Math.max(0, Math.min(360, options.coneDegrees ?? 110));
  const directionWeight = Math.max(0, options.directionWeight ?? 0.48);
  const distanceWeight = Math.max(0, options.distanceWeight ?? 0.32);
  const threatWeight = Math.max(0, options.threatWeight ?? 0.2);
  const facing = directionVector(direction);
  const origin = center(source);
  let best: ActionBattleSoftTargetResult<T> | null = null;

  for (const target of candidates) {
    if (target === source) continue;
    const point = center(target);
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 0 || distance > range) continue;
    const dot = Math.max(
      -1,
      Math.min(1, (facing.x * dx + facing.y * dy) / distance)
    );
    const angle = Math.acos(dot) * (180 / Math.PI);
    if (angle > coneDegrees / 2) continue;
    const directionScore = (dot + 1) / 2;
    const distanceScore = 1 - distance / range;
    const threatScore =
      target.battleAi?.getTarget?.()?.id === source.id ? 1 : 0;
    const score =
      directionScore * directionWeight +
      distanceScore * distanceWeight +
      threatScore * threatWeight;
    if (!best || score > best.score) {
      best = {
        target,
        direction: directionToActionBattleTarget(source, target),
        score,
        distance,
      };
    }
  }

  return best;
};
