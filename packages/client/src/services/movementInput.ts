import { Direction, type RpgDashInput, type RpgMovementInput } from "@rpgjs/common";

export const DEFAULT_DASH_ADDITIONAL_SPEED = 8;
export const DEFAULT_DASH_DURATION_MS = 180;
export const DEFAULT_DASH_COOLDOWN_MS = 450;

export const isDashInput = (input: RpgMovementInput): input is RpgDashInput =>
  typeof input === "object" && input !== null && input.type === "dash";

export const isMoveInput = (
  input: RpgMovementInput
): input is { type: "move"; direction: Direction } =>
  typeof input === "object" && input !== null && input.type === "move";

export const resolveMoveDirection = (input: RpgMovementInput): Direction | undefined => {
  if (isMoveInput(input)) return input.direction;
  if (typeof input === "string" || typeof input === "number") {
    return input as Direction;
  }
  return undefined;
};

export const directionToVector = (direction: Direction | undefined) => {
  switch (direction) {
    case Direction.Left:
      return { x: -1, y: 0 };
    case Direction.Right:
      return { x: 1, y: 0 };
    case Direction.Up:
      return { x: 0, y: -1 };
    case Direction.Down:
    default:
      return { x: 0, y: 1 };
  }
};

export const vectorToDirection = (direction: { x: number; y: number }): Direction => {
  if (Math.abs(direction.x) > Math.abs(direction.y)) {
    return direction.x < 0 ? Direction.Left : Direction.Right;
  }
  return direction.y < 0 ? Direction.Up : Direction.Down;
};

export const normalizeDashInput = (
  input: Partial<RpgDashInput>,
  fallbackDirection: Direction | undefined
): RpgDashInput | null => {
  const rawDirection = input.direction ?? directionToVector(fallbackDirection);
  const rawX = Number(rawDirection?.x ?? 0);
  const rawY = Number(rawDirection?.y ?? 0);
  const magnitude = Math.hypot(rawX, rawY);
  if (!Number.isFinite(magnitude) || magnitude <= 0) return null;

  const additionalSpeed =
    typeof input.additionalSpeed === "number" && Number.isFinite(input.additionalSpeed)
      ? Math.max(0, Math.min(input.additionalSpeed, 64))
      : DEFAULT_DASH_ADDITIONAL_SPEED;
  const duration =
    typeof input.duration === "number" && Number.isFinite(input.duration)
      ? Math.max(1, Math.min(input.duration, 1000))
      : DEFAULT_DASH_DURATION_MS;
  const cooldown =
    typeof input.cooldown === "number" && Number.isFinite(input.cooldown)
      ? Math.max(0, Math.min(input.cooldown, 5000))
      : DEFAULT_DASH_COOLDOWN_MS;

  return {
    type: "dash",
    direction: {
      x: rawX / magnitude,
      y: rawY / magnitude,
    },
    additionalSpeed,
    duration,
    cooldown,
  };
};
