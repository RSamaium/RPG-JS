import type { Direction, PredictionHistoryEntry, RpgMovementInput } from "@rpgjs/common";
import { resolveMoveDirection } from "./movementInput";

const MOVE_PATH_RESEND_INTERVAL_MS = 120;
const MAX_MOVE_TRAJECTORY_POINTS = 240;

export interface MovementTrajectoryPoint {
  frame: number;
  tick: number;
  timestamp: number;
  input: RpgMovementInput;
  x: number;
  y: number;
  direction?: Direction;
}

export interface MovePacket {
  input: RpgMovementInput;
  timestamp: number;
  frame: number;
  tick: number;
  trajectory: MovementTrajectoryPoint[];
}

/**
 * Build the predicted trajectory sent with a move packet, from the pending
 * inputs that already have a predicted position. Only the most recent points
 * are kept.
 */
export function buildMoveTrajectory(
  pendingInputs: PredictionHistoryEntry<RpgMovementInput, Direction>[],
): MovementTrajectoryPoint[] {
  const trajectory: MovementTrajectoryPoint[] = [];
  for (const entry of pendingInputs) {
    const state = entry.state;
    if (!state) continue;
    if (typeof state.x !== "number" || typeof state.y !== "number") continue;
    trajectory.push({
      frame: entry.frame,
      tick: entry.tick,
      timestamp: entry.timestamp,
      input: entry.direction,
      x: state.x,
      y: state.y,
      direction: state.direction ?? resolveMoveDirection(entry.direction),
    });
  }
  if (trajectory.length > MAX_MOVE_TRAJECTORY_POINTS) {
    return trajectory.slice(-MAX_MOVE_TRAJECTORY_POINTS);
  }
  return trajectory;
}

/**
 * Sends `move` packets with the predicted trajectory, and throttles resends
 * that would not carry a newer frame.
 */
export class MovePathSender {
  private lastSentAt = 0;
  private lastSentFrame = 0;

  constructor(private readonly emit: (packet: MovePacket) => void) {}

  /** Whether a periodic resend should wait at `now`. */
  isThrottled(now: number): boolean {
    return now - this.lastSentAt < MOVE_PATH_RESEND_INTERVAL_MS;
  }

  /** Reset resend tracking, e.g. after a map transfer or a movement interruption. */
  reset(options: { frame?: number; sentAt?: number } = {}): void {
    this.lastSentAt = options.sentAt ?? 0;
    this.lastSentFrame = options.frame ?? 0;
  }

  send(options: {
    input: RpgMovementInput;
    frame: number;
    tick: number;
    timestamp: number;
    pendingInputs: PredictionHistoryEntry<RpgMovementInput, Direction>[];
    force?: boolean;
  }): void {
    const { input, frame, tick, timestamp } = options;
    const trajectory = buildMoveTrajectory(options.pendingInputs);
    const latestTrajectoryFrame =
      trajectory.length > 0 ? trajectory[trajectory.length - 1].frame : frame;
    const shouldThrottle =
      !options.force &&
      latestTrajectoryFrame <= this.lastSentFrame &&
      this.isThrottled(timestamp);
    if (shouldThrottle) {
      return;
    }

    this.emit({
      input,
      timestamp,
      frame,
      tick,
      trajectory,
    });
    this.lastSentAt = timestamp;
    this.lastSentFrame = Math.max(this.lastSentFrame, latestTrajectoryFrame, frame);
  }
}
