export interface PredictionState<DirectionType = unknown> {
  x: number;
  y: number;
  direction?: DirectionType;
}

export interface PredictionControllerConfig<
  InputType = unknown,
  DirectionType = InputType,
> {
  correctionThreshold?: number;
  historyTtlMs?: number;
  maxHistoryEntries?: number;
  getPhysicsTick: () => number;
  getCurrentState: () => PredictionState<DirectionType>;
  setAuthoritativeState: (state: PredictionState<DirectionType>) => void;
}

export interface PredictionHistoryEntry<
  InputType,
  DirectionType = InputType,
> {
  frame: number;
  tick: number;
  timestamp: number;
  direction: InputType;
  state?: PredictionState<DirectionType>;
}

export interface PredictionAckResult<
  InputType = unknown,
  DirectionType = InputType,
> {
  acknowledgedFrame: number;
  acknowledgedTick: number;
  state?: PredictionState<DirectionType>;
  pendingInputs: PredictionHistoryEntry<InputType, DirectionType>[];
  needsReconciliation: boolean;
}

/**
 * Shared client-side prediction controller.
 *
 * Handles input history, pending server snapshots and reconciliation.
 */
export class PredictionController<
  InputType = unknown,
  DirectionType = InputType,
> {
  private readonly correctionThreshold: number;
  private readonly historyTtlMs: number;
  private readonly maxHistoryEntries: number;
  private frameCounter = 0;
  private history: PredictionHistoryEntry<InputType, DirectionType>[] = [];
  private pendingSnapshot: PredictionState<DirectionType> | null = null;
  private lastAckFrame = 0;
  private lastAckTick = 0;

  constructor(
    private readonly config: PredictionControllerConfig<InputType, DirectionType>
  ) {
    this.correctionThreshold = config.correctionThreshold ?? 5;
    this.historyTtlMs = config.historyTtlMs ?? 10000;
    this.maxHistoryEntries = config.maxHistoryEntries ?? 1200;
  }

  recordInput(direction: InputType, timestamp: number): { frame: number; tick: number } {
    const frame = ++this.frameCounter;
    const tick = this.config.getPhysicsTick();
    this.history.push({ frame, tick, timestamp, direction });
    this.trimHistory(timestamp);
    return { frame, tick };
  }

  attachPredictedState(frame: number, state: PredictionState<DirectionType>): void {
    const entry = this.history.find((item) => item.frame === frame);
    if (entry) {
      entry.state = state;
    }
  }

  hasPendingInputs(): boolean {
    return this.history.length > 0;
  }

  getPendingInputs(): PredictionHistoryEntry<InputType, DirectionType>[] {
    return [...this.history];
  }

  clearPendingInputs(markCurrentFrameAcked = true): void {
    this.history = [];
    this.pendingSnapshot = null;
    if (markCurrentFrameAcked) {
      this.lastAckFrame = Math.max(this.lastAckFrame, this.frameCounter);
    }
  }

  queueServerSnapshot(snapshot: PredictionState<DirectionType>): void {
    if (this.hasPendingInputs()) {
      this.pendingSnapshot = snapshot;
      return;
    }
    this.applySnapshot(snapshot);
  }

  tryApplyPendingSnapshot(): void {
    if (!this.pendingSnapshot || this.hasPendingInputs()) {
      return;
    }
    this.applySnapshot(this.pendingSnapshot);
    this.pendingSnapshot = null;
  }

  applyServerAck(
    ack: {
      frame: number;
      serverTick?: number;
      state?: PredictionState<DirectionType>;
    },
  ): PredictionAckResult<InputType, DirectionType> {
    if (typeof ack.frame !== "number") {
      const result: PredictionAckResult<InputType, DirectionType> = {
        acknowledgedFrame: this.lastAckFrame,
        acknowledgedTick: this.lastAckTick,
        pendingInputs: [...this.history],
        needsReconciliation: false,
      };
      if (ack.state) {
        result.state = ack.state;
      }
      return result;
    }
    if (ack.frame < this.lastAckFrame) {
      const result: PredictionAckResult<InputType, DirectionType> = {
        acknowledgedFrame: this.lastAckFrame,
        acknowledgedTick: this.lastAckTick,
        pendingInputs: [...this.history],
        needsReconciliation: false,
      };
      if (ack.state) {
        result.state = ack.state;
      }
      return result;
    }

    const nextAckFrame = Math.max(this.lastAckFrame, ack.frame);
    const nextAckTick =
      typeof ack.serverTick === "number"
        ? Math.max(this.lastAckTick, ack.serverTick)
        : this.lastAckTick;

    // A repeated ack no longer has a matching history entry. While newer inputs
    // are pending, comparing that older server snapshot with the current client
    // position measures normal prediction lead as if it were authoritative drift.
    const hasNewerPendingInputs =
      ack.frame === this.lastAckFrame
      && this.history.some((entry) => entry.frame > ack.frame);

    let needsReconciliation = false;
    if (ack.state && !hasNewerPendingInputs) {
      const acknowledgedEntry = this.history.find(
        (entry) => entry.frame === nextAckFrame && !!entry.state,
      );
      const comparisonState = acknowledgedEntry?.state ?? this.config.getCurrentState();
      const dx = comparisonState.x - ack.state.x;
      const dy = comparisonState.y - ack.state.y;
      const distance = Math.hypot(dx, dy);
      needsReconciliation = distance > this.correctionThreshold;
    }

    this.lastAckFrame = nextAckFrame;
    this.lastAckTick = nextAckTick;
    this.history = this.history.filter((entry) => entry.frame > this.lastAckFrame);

    if (!needsReconciliation && this.pendingSnapshot && !this.hasPendingInputs()) {
      this.applySnapshot(this.pendingSnapshot);
      this.pendingSnapshot = null;
    }

    const result: PredictionAckResult<InputType, DirectionType> = {
      acknowledgedFrame: this.lastAckFrame,
      acknowledgedTick: this.lastAckTick,
      pendingInputs: [...this.history],
      needsReconciliation,
    };
    if (ack.state) {
      result.state = ack.state;
    }
    return result;
  }

  cleanup(now: number): void {
    this.trimHistory(now);
  }

  private trimHistory(now: number): void {
    const cutoff = now - this.historyTtlMs;
    this.history = this.history.filter((entry) => entry.timestamp >= cutoff);
    if (this.history.length > this.maxHistoryEntries) {
      this.history = this.history.slice(-this.maxHistoryEntries);
    }
  }

  private applySnapshot(snapshot: PredictionState<DirectionType>): void {
    const current = this.config.getCurrentState();
    const dx = current.x - snapshot.x;
    const dy = current.y - snapshot.y;
    const distance = Math.hypot(dx, dy);
    if (distance > this.correctionThreshold) {
      this.config.setAuthoritativeState(snapshot);
      this.history = [];
      return;
    }
    this.history = [];
  }
}
