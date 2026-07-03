import {
  DEFAULT_DAY_LIGHTING,
  DEFAULT_NIGHT_LIGHTING,
  TIME_MANAGER_SYNC_KEY,
  createTimeSnapshot,
  mergeTimeInput,
  normalizeScale,
  normalizeTimeOptions,
  projectTimeState,
  resolveTimeWeatherDuration,
  resolveTimeWeatherWeight,
  timeDurationToMinutes,
  timeInputToElapsedMinutes,
  type TimeDuration,
  type TimeInput,
  type TimeManagerOptions,
  type TimeSnapshot,
  type TimeState,
  type TimeWeatherAmbience,
  type TimeWeatherTable,
} from "@rpgjs/common";
import type { RpgMap } from "../rooms/map";

type RegisteredMap = RpgMap & Record<string, any>;
type SyncOptions = {
  forceLighting?: boolean;
  forceWeather?: boolean;
  sync?: boolean;
};
type WeatherRuntimeState = {
  ambienceKey: string;
  expiresAtElapsedMinutes: number;
};
type WeatherRollCandidate = {
  key: string;
  ambience: TimeWeatherAmbience;
  weight: number;
};

export class TimeManager {
  private options = normalizeTimeOptions();
  private snapshot: TimeSnapshot = createTimeSnapshot();
  private maps = new Set<RegisteredMap>();
  private lightingPhaseByMap = new WeakMap<RegisteredMap, string>();
  private weatherStateByMap = new WeakMap<RegisteredMap, WeatherRuntimeState>();
  private environmentTimer: ReturnType<typeof setInterval> | undefined;

  configure(options: TimeManagerOptions = {}): void {
    this.options = normalizeTimeOptions(options);
    this.snapshot = createTimeSnapshot(options);
    this.lightingPhaseByMap = new WeakMap();
    this.weatherStateByMap = new WeakMap();
    this.refreshEnvironmentTimer();
  }

  registerMap(map: RpgMap): void {
    const runtimeMap = map as RegisteredMap;
    const isFirstRegistration = !this.maps.has(runtimeMap);
    this.maps.add(runtimeMap);
    this.ensureMapSignal(runtimeMap);
    this.syncMap(runtimeMap, { forceLighting: isFirstRegistration, forceWeather: isFirstRegistration });
    this.refreshEnvironmentTimer();
  }

  unregisterMap(map: RpgMap): void {
    const runtimeMap = map as RegisteredMap;
    this.maps.delete(runtimeMap);
    this.lightingPhaseByMap.delete(runtimeMap);
    this.weatherStateByMap.delete(runtimeMap);
    this.refreshEnvironmentTimer();
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
    this.refreshEnvironmentTimer();
  }

  private syncMap(map: RegisteredMap, options: SyncOptions = {}): void {
    this.ensureMapSignal(map);
    const snapshot = this.getSnapshot();
    map[TIME_MANAGER_SYNC_KEY].set(snapshot);
    this.applyLighting(map, options.forceLighting);
    this.applyWeather(map, options.forceWeather);
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

  private refreshEnvironmentTimer(): void {
    const lighting = this.options.lighting;
    const weather = this.options.weather;
    const shouldRun = Boolean(
      this.maps.size > 0
      && this.snapshot.scale > 0
      && !this.snapshot.paused
      && (
        Boolean(lighting && lighting.enabled !== false)
        || Boolean(weather && weather.enabled !== false)
      )
    );

    if (!shouldRun) {
      if (this.environmentTimer) {
        clearInterval(this.environmentTimer);
        this.environmentTimer = undefined;
      }
      return;
    }

    if (!this.environmentTimer) {
      this.environmentTimer = setInterval(() => this.syncEnvironment(), 1000);
      this.environmentTimer.unref?.();
    }
  }

  private syncEnvironment(): void {
    const lighting = this.options.lighting;
    const shouldSyncLighting = Boolean(lighting && lighting.enabled !== false);
    for (const map of this.maps) {
      const phaseKey = shouldSyncLighting ? this.resolveLightingPhase(this.state()).key : undefined;
      if (phaseKey && this.lightingPhaseByMap.get(map) !== phaseKey) {
        this.syncMap(map);
        continue;
      }

      if (this.shouldRollWeather(map)) {
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

  private shouldRollWeather(map: RegisteredMap): boolean {
    if (!this.resolveWeatherTable(map)) {
      return false;
    }
    const weatherState = this.weatherStateByMap.get(map);
    return !weatherState || this.state().elapsedMinutes >= weatherState.expiresAtElapsedMinutes;
  }

  private applyWeather(map: RegisteredMap, force = false): void {
    const table = this.resolveWeatherTable(map);
    if (!table) {
      return;
    }

    const currentState = this.weatherStateByMap.get(map);
    const elapsedMinutes = this.state().elapsedMinutes;
    if (!force && currentState && elapsedMinutes < currentState.expiresAtElapsedMinutes) {
      return;
    }

    const next = this.rollWeather(map, table);
    if (!next) {
      return;
    }

    const durationMinutes = resolveTimeWeatherDuration(next.ambience.duration, this.randomFor(map, `${next.key}:duration:${Math.floor(elapsedMinutes)}`));
    const expiresAtElapsedMinutes = elapsedMinutes + Math.max(1, durationMinutes);
    const canBroadcast = typeof map.$broadcast === "function";
    const options = canBroadcast ? undefined : { sync: false };

    if (next.ambience.weather) {
      map.setWeather?.({
        ...next.ambience.weather,
        params: next.ambience.weather.params ? { ...next.ambience.weather.params } : undefined,
        startedAt: Date.now(),
      }, options);
    } else {
      map.clearWeather?.(options);
    }

    this.weatherStateByMap.set(map, {
      ambienceKey: next.key,
      expiresAtElapsedMinutes,
    });
  }

  private resolveWeatherTable(map: RegisteredMap): TimeWeatherTable | undefined {
    const weather = this.options.weather;
    if (!weather || weather.enabled === false) {
      return undefined;
    }
    return weather.maps?.[map.id] ?? weather.default;
  }

  private rollWeather(map: RegisteredMap, table: TimeWeatherTable): WeatherRollCandidate | undefined {
    const state = this.state();
    const candidates = Object.entries(table.ambiences)
      .map(([key, ambience]) => ({
        key,
        ambience,
        weight: resolveTimeWeatherWeight(ambience.weight, state),
      }))
      .filter((candidate) => candidate.weight > 0);
    const total = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
    if (total <= 0) {
      return undefined;
    }

    let cursor = this.randomFor(map, `weather:${state.year}:${state.month}:${state.day}:${Math.floor(state.elapsedMinutes)}`) * total;
    for (const candidate of candidates) {
      cursor -= candidate.weight;
      if (cursor <= 0) {
        return candidate;
      }
    }
    return candidates[candidates.length - 1];
  }

  private randomFor(map: RegisteredMap, salt: string): number {
    let hash = 2166136261;
    const input = `${map.id}:${salt}`;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967296;
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
