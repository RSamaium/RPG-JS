import {
  DEFAULT_DAY_LIGHTING,
  DEFAULT_NIGHT_LIGHTING,
  TIME_MANAGER_SYNC_KEY,
  createTimeSnapshot,
  mergeTimeInput,
  normalizeScale,
  normalizeTimeOptions,
  projectTimeState,
  timeDurationToMinutes,
  timeInputToElapsedMinutes,
  type TimeDuration,
  type TimeInput,
  type TimeManagerOptions,
  type TimeSnapshot,
  type TimeState,
} from "@rpgjs/common";
import type { RpgMap } from "../rooms/map";

type RegisteredMap = RpgMap & Record<string, any>;

export class TimeManager {
  private options = normalizeTimeOptions();
  private snapshot: TimeSnapshot = createTimeSnapshot();
  private maps = new Set<RegisteredMap>();

  configure(options: TimeManagerOptions = {}): void {
    this.options = normalizeTimeOptions(options);
    this.snapshot = createTimeSnapshot(options);
  }

  registerMap(map: RpgMap): void {
    const runtimeMap = map as RegisteredMap;
    this.maps.add(runtimeMap);
    this.ensureMapSignal(runtimeMap);
    this.syncMap(runtimeMap);
  }

  unregisterMap(map: RpgMap): void {
    this.maps.delete(map as RegisteredMap);
  }

  state(now = Date.now()): TimeState {
    return projectTimeState(this.snapshot, now);
  }

  getSnapshot(now = Date.now()): TimeSnapshot {
    return this.anchorSnapshot({
      elapsedMinutes: this.state(now).elapsedMinutes,
      serverTimestamp: now,
    });
  }

  set(input: TimeInput, options: { sync?: boolean } = {}): TimeState {
    const current = this.state();
    const nextInput = mergeTimeInput(current, input);
    this.snapshot = this.anchorSnapshot({
      elapsedMinutes: timeInputToElapsedMinutes(nextInput, this.snapshot.calendar),
    });
    this.syncAll(options);
    return this.state();
  }

  advance(duration: TimeDuration | number, options: { sync?: boolean } = {}): TimeState {
    const current = this.state();
    this.snapshot = this.anchorSnapshot({
      elapsedMinutes: Math.max(0, current.elapsedMinutes + timeDurationToMinutes(duration)),
    });
    this.syncAll(options);
    return this.state();
  }

  pause(options: { sync?: boolean } = {}): TimeState {
    if (!this.snapshot.paused) {
      this.snapshot = this.anchorSnapshot({
        elapsedMinutes: this.state().elapsedMinutes,
        paused: true,
      });
      this.syncAll(options);
    }
    return this.state();
  }

  resume(options: { sync?: boolean } = {}): TimeState {
    if (this.snapshot.paused) {
      this.snapshot = this.anchorSnapshot({
        paused: false,
      });
      this.syncAll(options);
    }
    return this.state();
  }

  setScale(scale: number, options: { sync?: boolean } = {}): TimeState {
    this.snapshot = this.anchorSnapshot({
      elapsedMinutes: this.state().elapsedMinutes,
      scale: normalizeScale(scale),
    });
    this.syncAll(options);
    return this.state();
  }

  private anchorSnapshot(patch: Partial<TimeSnapshot>): TimeSnapshot {
    return {
      ...this.snapshot,
      ...patch,
      calendar: patch.calendar ?? this.snapshot.calendar,
      serverTimestamp: patch.serverTimestamp ?? Date.now(),
    };
  }

  private ensureMapSignal(map: RegisteredMap): void {
    if (typeof map[TIME_MANAGER_SYNC_KEY] === "function") {
      return;
    }
    map.setSync({
      [TIME_MANAGER_SYNC_KEY]: {
        $initial: this.getSnapshot(),
        $syncWithClient: true,
        $permanent: false,
      },
    });
  }

  private syncAll(options: { sync?: boolean } = {}): void {
    for (const map of this.maps) {
      this.syncMap(map, options);
    }
  }

  private syncMap(map: RegisteredMap, options: { sync?: boolean } = {}): void {
    this.ensureMapSignal(map);
    const snapshot = this.getSnapshot();
    map[TIME_MANAGER_SYNC_KEY].set(snapshot);
    this.applyLighting(map);
    if (options.sync !== false && typeof map.$broadcast === "function") {
      map.$broadcast({
        type: "timeState",
        value: snapshot,
      });
    }
    if (options.sync !== false && typeof map.applySyncToClient === "function" && typeof map.$applySync === "function") {
      map.applySyncToClient();
    }
  }

  private applyLighting(map: RegisteredMap): void {
    const lighting = this.options.lighting;
    if (!lighting || lighting.enabled === false) {
      return;
    }

    const state = this.state();
    const configuredPhase = this.resolveLightingPhase(state);
    const nextLighting = configuredPhase?.lighting
      ?? (state.hour >= 6 && state.hour < 18 ? DEFAULT_DAY_LIGHTING : DEFAULT_NIGHT_LIGHTING);
    const transitionMs = configuredPhase ? lighting.transitionMs : 0;

    if (transitionMs && typeof map.transitionLighting === "function") {
      map.transitionLighting(nextLighting, { duration: transitionMs });
      return;
    }

    if (typeof map.setLighting === "function") {
      map.setLighting(nextLighting);
    }
  }

  private resolveLightingPhase(state: TimeState) {
    const phases = this.options.lighting ? this.options.lighting.phases : undefined;
    if (!phases) {
      return undefined;
    }

    const currentMinutes = state.hour * 60 + state.minute;
    return Object.values(phases)
      .filter((phase) => (phase.hour * 60 + (phase.minute ?? 0)) <= currentMinutes)
      .sort((a, b) => (b.hour * 60 + (b.minute ?? 0)) - (a.hour * 60 + (a.minute ?? 0)))[0]
      ?? Object.values(phases).sort((a, b) => (b.hour * 60 + (b.minute ?? 0)) - (a.hour * 60 + (a.minute ?? 0)))[0];
  }
}
