import {
  projectTimeState,
  type TimeManagerOptions,
  type TimeSnapshot,
  type TimeState,
} from "@rpgjs/common";
import { signal } from "canvasengine";

export class ClientTimeManager {
  private snapshot = signal<TimeSnapshot | null>(null);
  private listeners = new Set<(state: TimeState | null) => void>();
  /**
   * Server clock minus client clock, in milliseconds, measured when a snapshot is received.
   * The snapshot is anchored on the clock of the server: without this offset, a client clock that is
   * 1 second off shifts the displayed time by `scale / 60` game minutes.
   */
  private clockOffset = 0;

  configure(_options: TimeManagerOptions = {}): void {
    // Client options are accepted for shared module ergonomics. The server
    // snapshot remains authoritative.
  }

  acceptSnapshot(snapshot: TimeSnapshot | null, options: { measureClock?: boolean } = {}): void {
    if (snapshot && options.measureClock !== false && Number.isFinite(snapshot.serverTimestamp)) {
      this.clockOffset = snapshot.serverTimestamp - Date.now();
    }
    this.snapshot.set(snapshot ? cloneSnapshot(snapshot) : null);
    this.emit();
  }

  patchSnapshot(patch: Partial<TimeSnapshot>): void {
    const current = this.snapshot();
    const next = {
      ...(current ?? {}),
      ...patch,
      calendar: {
        ...(current?.calendar ?? {}),
        ...(patch.calendar ?? {}),
      },
    } as TimeSnapshot;
    if (
      typeof next.elapsedMinutes !== "number" ||
      typeof next.scale !== "number" ||
      typeof next.paused !== "boolean" ||
      typeof next.serverTimestamp !== "number" ||
      !next.calendar
    ) {
      return;
    }
    // A patch without a new anchor keeps the offset measured with the snapshot it completes.
    this.acceptSnapshot(next, { measureClock: patch.serverTimestamp !== undefined });
  }

  state(now = Date.now()): TimeState | null {
    const snapshot = this.snapshot();
    return snapshot ? projectTimeState(snapshot, now + this.clockOffset) : null;
  }

  onChange(callback: (state: TimeState | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.state());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private emit(): void {
    const state = this.state();
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

function cloneSnapshot(snapshot: TimeSnapshot): TimeSnapshot {
  return {
    ...snapshot,
    calendar: {
      ...snapshot.calendar,
      daysPerMonth: Array.isArray(snapshot.calendar.daysPerMonth)
        ? [...snapshot.calendar.daysPerMonth]
        : snapshot.calendar.daysPerMonth,
      seasons: snapshot.calendar.seasons ? [...snapshot.calendar.seasons] : undefined,
    },
  };
}
