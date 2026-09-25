import { Direction } from "@rpgjs/common";

export const DEFAULT_DASH_COOLDOWN_MS = 450;

export const isDashMovementInput = (input: any): input is {
  type: "dash";
  direction: { x: number; y: number };
  additionalSpeed?: number;
  duration?: number;
  cooldown?: number;
} => input && typeof input === "object" && input.type === "dash";

const isMoveMovementInput = (input: any): input is {
  type: "move";
  direction: Direction;
} => input && typeof input === "object" && input.type === "move";

export const normalizeServerMovementInput = (input: any): Direction | {
  type: "dash";
  direction: { x: number; y: number };
  additionalSpeed: number;
  duration: number;
  cooldown: number;
} | null => {
  if (isMoveMovementInput(input)) {
    return input.direction;
  }
  if (!isDashMovementInput(input)) {
    if (typeof input !== "string" && typeof input !== "number") return null;
    return input as Direction;
  }

  const rawX = Number(input.direction?.x ?? 0);
  const rawY = Number(input.direction?.y ?? 0);
  const magnitude = Math.hypot(rawX, rawY);
  if (!Number.isFinite(magnitude) || magnitude <= 0) return null;

  return {
    type: "dash",
    direction: {
      x: rawX / magnitude,
      y: rawY / magnitude,
    },
    additionalSpeed:
      typeof input.additionalSpeed === "number" && Number.isFinite(input.additionalSpeed)
        ? Math.max(0, Math.min(input.additionalSpeed, 64))
        : 8,
    duration:
      typeof input.duration === "number" && Number.isFinite(input.duration)
        ? Math.max(1, Math.min(input.duration, 1000))
        : 180,
    cooldown:
      typeof input.cooldown === "number" && Number.isFinite(input.cooldown)
        ? Math.max(0, Math.min(input.cooldown, 5000))
        : DEFAULT_DASH_COOLDOWN_MS,
  };
};

export const vectorToDirection = (direction: { x: number; y: number }): Direction => {
  if (Math.abs(direction.x) > Math.abs(direction.y)) {
    return direction.x < 0 ? Direction.Left : Direction.Right;
  }
  return direction.y < 0 ? Direction.Up : Direction.Down;
};
