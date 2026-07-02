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
type SyncOptions = {
  forceLighting?: boolean;
  sync?: boolean;
};

export class TimeManager {
  private options = normalizeTimeOptions();
  private snapshot: TimeSnapshot = createTimeSnapshot();
  private maps = new Set<RegisteredMap>();
  private lightingPhaseByMap = new WeakMap<RegisteredMap, string>();
  private lightingTimer: ReturnType<typeof setInterval> | undefined;

  configure(options: TimeManagerOptions = {}): void {
    this.options = normalizeTimeOptions(options);
    this.snapshot = createTimeSnapshot(options);
    this.lightingPhaseByMap = new WeakMap();
    this.refreshLightingTimer();
  }

  registerMap(map: RpgMap): void {
    const runtimeMap = map as RegisteredMap;
    this.maps.add(runtimeMap);
    this.ensureMapSignal(runtimeMap);
    this.syncMap(runtimeMap, { forceLighting: true });
    this.refreshLightingTimer();
  }

  unregisterMap(map: RpgMap): void {
    const runtimeMap = map as RegisteredMap;
    this.maps.delete(runtimeMap);
    this.lightingPhaseByMap.delete(runtimeMap);
    this.refreshLightingTimer();
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
    this.refreshLightingTimer();
  }

  private syncMap(map: RegisteredMap, options: SyncOptions = {}): void {
    this.ensureMapSignal(map);
    const snapshot = this.getSnapshot();
    map[TIME_MANAGER_SYNC_KEY].set(snapshot);
    this.applyLighting(map, options.forceLighting);
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

  private refreshLightingTimer(): void {
    const lighting = this.options.lighting;
    const shouldRun = Boolean(lighting && lighting.enabled !== false && this.maps.size > 0 && this.snapshot.scale > 0 && !this.snapshot.paused);

    if (!shouldRun) {
      if (this.lightingTimer) {
        clearInterval(this.lightingTimer);
        this.lightingTimer = undefined;
      }
      return;
    }

    if (!this.lightingTimer) {
      this.lightingTimer = setInterval(() => this.syncLightingPhases(), 1000);
      this.lightingTimer.unref?.();
    }
  }

  private syncLightingPhases(): void {
    for (const map of this.maps) {
      const phaseKey = this.resolveLightingPhase(this.state()).key;
      if (this.lightingPhaseByMap.get(map) !== phaseKey) {
        this.syncMap(map);
      }
    }
  }

  private applyLighting(map: RegisteredMap, force = false): void {
    const lighting = this.options.lighting;
    if (!lighting || lighting.enabled === false) {
      return;
    }

    const state = this.state();
    const phase = this.resolveLightingPhase(state);
    if (!force && this.lightingPhaseByMap.get(map) === phase.key) {
      return;
    }

    const nextLighting = phase.config?.lighting
      ?? (state.hour >= 6 && state.hour < 18 ? DEFAULT_DAY_LIGHTING : DEFAULT_NIGHT_LIGHTING);
    const transitionMs = phase.config ? lighting.transitionMs : 0;
    const canBroadcast = typeof map.$broadcast === "function";

    if (transitionMs && canBroadcast && typeof map.transitionLighting === "function") {
      map.transitionLighting(nextLighting, { duration: transitionMs });
      this.lightingPhaseByMap.set(map, phase.key);
      return;
    }

    if (typeof map.setLighting === "function") {
      map.setLighting(nextLighting, canBroadcast ? undefined : { sync: false });
      this.lightingPhaseByMap.set(map, phase.key);
    }
  }

  private resolveLightingPhase(state: TimeState) {
    const phases = this.options.lighting ? this.options.lighting.phases : undefined;
    if (!phases) {
      return {
        key: state.hour >= 6 && state.hour < 18 ? "default:day" : "default:night",
        config: undefined,
      };
    }

    const currentMinutes = state.hour * 60 + state.minute;
    const sorted = Object.entries(phases)
      .sort(([, a], [, b]) => (b.hour * 60 + (b.minute ?? 0)) - (a.hour * 60 + (a.minute ?? 0)));
    const resolved = sorted.find(([, phase]) => (phase.hour * 60 + (phase.minute ?? 0)) <= currentMinutes)
      ?? sorted[0];

    return {
      key: resolved ? resolved[0] : "default",
      config: resolved ? resolved[1] : undefined,
    };
  }
}
