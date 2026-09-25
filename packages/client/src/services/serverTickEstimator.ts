/**
 * Estimates the current authoritative server tick from the last tick received
 * (sync packets, move acknowledgements) and the time elapsed since.
 */
export class ServerTickEstimator {
  private latestServerTick?: number;
  private latestServerTickAt = 0;

  update(serverTick: number | undefined, now = Date.now()): void {
    if (typeof serverTick !== "number" || !Number.isFinite(serverTick)) {
      return;
    }
    this.latestServerTick = serverTick;
    this.latestServerTickAt = now;
  }

  estimate(tickDurationMs: number, now = Date.now()): number | undefined {
    if (typeof this.latestServerTick !== "number" || this.latestServerTickAt <= 0) {
      return undefined;
    }
    const elapsedTicks = Math.max(0, (now - this.latestServerTickAt) / tickDurationMs);
    return this.latestServerTick + elapsedTicks;
  }
}
