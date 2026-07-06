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
  type LightingState,
  type TimeDuration,
  type TimeEnvironmentReason,
  type TimeInput,
  type TimeLightingPhaseTransitionPayload,
  type TimeManagerOptions,
  type TimeSnapshot,
  type TimeState,
  type TimeWeatherAmbience,
  type TimeWeatherBeforeTransitionPayload,
  type TimeWeatherRollCandidate,
  type TimeWeatherTable,
  type TimeWeatherTransitionPayload,
  type WeatherState,
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
  weather: WeatherState | null;
  expiresAtElapsedMinutes: number;
};
type WeightedWeatherRollCandidate = TimeWeatherRollCandidate & {
  key: string;
  ambience: TimeWeatherAmbience;
  weight: number;
};
type EnvironmentSyncOptions = SyncOptions & {
  reason?: TimeEnvironmentReason;
  skipHooks?: boolean;
};

export class TimeManager {
  private options = normalizeTimeOptions();
  private snapshot: TimeSnapshot = createTimeSnapshot();
  private maps = new Set<RegisteredMap>();
  private lightingPhaseByMap = new WeakMap<RegisteredMap, string>();
  private weatherStateByMap = new WeakMap<RegisteredMap, WeatherRuntimeState>();
  private timeStateByMap = new WeakMap<RegisteredMap, TimeState>();
  private environmentTimer: ReturnType<typeof setInterval> | undefined;
  private dispatchDepth = 0;
  private pendingEnvironmentSync = false;

  configure(options: TimeManagerOptions = {}): void {
    this.options = normalizeTimeOptions(options);
    this.snapshot = createTimeSnapshot(options);
    this.lightingPhaseByMap = new WeakMap();
    this.weatherStateByMap = new WeakMap();
    this.timeStateByMap = new WeakMap();
    this.refreshEnvironmentTimer();
  }

  registerMap(map: RpgMap): void {
    const runtimeMap = map as RegisteredMap;
    const isFirstRegistration = !this.maps.has(runtimeMap);
    this.maps.add(runtimeMap);
    this.ensureMapSignal(runtimeMap);
    this.syncMap(runtimeMap, {
      forceLighting: isFirstRegistration,
      forceWeather: isFirstRegistration,
      reason: "initial",
      skipHooks: true,
    });
    this.refreshEnvironmentTimer();
  }

  unregisterMap(map: RpgMap): void {
    const runtimeMap = map as RegisteredMap;
    this.maps.delete(runtimeMap);
    this.lightingPhaseByMap.delete(runtimeMap);
    this.weatherStateByMap.delete(runtimeMap);
    this.timeStateByMap.delete(runtimeMap);
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
    this.syncAll({ ...options, reason: "set" });
    return this.state();
  }

  advance(duration: TimeDuration | number, options: { sync?: boolean } = {}): TimeState {
    const current = this.state();
    this.snapshot = this.anchorSnapshot({
      elapsedMinutes: Math.max(0, current.elapsedMinutes + timeDurationToMinutes(duration)),
    });
    this.syncAll({ ...options, reason: "advance" });
    return this.state();
  }

  pause(options: { sync?: boolean } = {}): TimeState {
    if (!this.snapshot.paused) {
      this.snapshot = this.anchorSnapshot({
        elapsedMinutes: this.state().elapsedMinutes,
        paused: true,
      });
      this.syncAll({ ...options, reason: "pause" });
    }
    return this.state();
  }

  resume(options: { sync?: boolean } = {}): TimeState {
    if (this.snapshot.paused) {
      this.snapshot = this.anchorSnapshot({
        paused: false,
      });
      this.syncAll({ ...options, reason: "resume" });
    }
    return this.state();
  }

  setScale(scale: number, options: { sync?: boolean } = {}): TimeState {
    this.snapshot = this.anchorSnapshot({
      elapsedMinutes: this.state().elapsedMinutes,
      scale: normalizeScale(scale),
    });
    this.syncAll({ ...options, reason: "scale" });
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

  private syncAll(options: { sync?: boolean; reason?: TimeEnvironmentReason } = {}): void {
    if (this.dispatchDepth > 0) {
      this.pendingEnvironmentSync = true;
      for (const map of this.maps) {
        this.syncMap(map, { ...options, skipHooks: true });
      }
      return;
    }
    for (const map of this.maps) {
      this.syncMap(map, options);
    }
    this.refreshEnvironmentTimer();
  }

  private syncMap(map: RegisteredMap, options: EnvironmentSyncOptions = {}): void {
    this.ensureMapSignal(map);
    const snapshot = this.getSnapshot();
    map[TIME_MANAGER_SYNC_KEY].set(snapshot);
    if (options.sync !== false && typeof map.$broadcast === "function") {
      map.$broadcast({
        type: "timeState",
        value: snapshot,
      });
    }
    if (options.sync !== false && typeof map.applySyncToClient === "function" && typeof map.$applySync === "function") {
      map.applySyncToClient();
    }
    void this.applyMapEnvironment(map, options);
  }

  private async applyMapEnvironment(map: RegisteredMap, options: EnvironmentSyncOptions): Promise<void> {
    await this.applyTimeHooks(map, options);
    await this.applyLighting(map, options);
    await this.applyWeather(map, options);
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
        || Boolean(this.options.hooks)
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
        this.syncMap(map, { reason: "tick" });
        continue;
      }

      if (this.shouldRollWeather(map)) {
        this.syncMap(map, { reason: "tick" });
        continue;
      }

      if (this.hasTimeTransition(map)) {
        this.syncMap(map, { reason: "tick" });
      }
    }
  }

  private hasTimeTransition(map: RegisteredMap): boolean {
    const previous = this.timeStateByMap.get(map);
    if (!previous) {
      return false;
    }
    const current = this.state();
    return previous.year !== current.year
      || previous.month !== current.month
      || previous.day !== current.day
      || previous.hour !== current.hour
      || previous.minute !== current.minute;
  }

  private async applyTimeHooks(map: RegisteredMap, options: EnvironmentSyncOptions): Promise<void> {
    const current = this.state();
    const previous = this.timeStateByMap.get(map);
    this.timeStateByMap.set(map, current);

    if (options.skipHooks || !previous) {
      return;
    }

    if (!this.hasTimeChanged(previous, current)) {
      return;
    }

    const payload = {
      map,
      previous,
      current,
      reason: options.reason ?? "tick",
    };
    if (this.hasEnvironmentHook(map, "onTimeChange")) {
      await this.dispatchEnvironmentHook(map, "onTimeChange", payload);
    }

    if (this.hasDayChanged(previous, current) && this.hasEnvironmentHook(map, "onDayChange")) {
      await this.dispatchEnvironmentHook(map, "onDayChange", payload);
    }
  }

  private hasTimeChanged(previous: TimeState, current: TimeState): boolean {
    return previous.year !== current.year
      || previous.month !== current.month
      || previous.day !== current.day
      || previous.hour !== current.hour
      || previous.minute !== current.minute;
  }

  private hasDayChanged(previous: TimeState, current: TimeState): boolean {
    return previous.year !== current.year
      || previous.month !== current.month
      || previous.day !== current.day;
  }

  private async applyLighting(map: RegisteredMap, options: EnvironmentSyncOptions = {}): Promise<void> {
    const lighting = this.options.lighting;
    if (!lighting || lighting.enabled === false) {
      return;
    }

    const state = this.state();
    const phase = this.resolveLightingPhase(state);
    const previousKey = this.lightingPhaseByMap.get(map);
    if (!options.forceLighting && previousKey === phase.key) {
      return;
    }

    const nextLighting = phase.config?.lighting
      ?? (state.hour >= 6 && state.hour < 18 ? DEFAULT_DAY_LIGHTING : DEFAULT_NIGHT_LIGHTING);
    const transitionMs = phase.config ? lighting.transitionMs : 0;
    const canBroadcast = typeof map.$broadcast === "function";
    const previousLighting = map.getLighting?.();

    if (transitionMs && canBroadcast && typeof map.transitionLighting === "function") {
      map.transitionLighting(nextLighting, { duration: transitionMs });
      this.lightingPhaseByMap.set(map, phase.key);
      if (!options.skipHooks && previousKey && previousKey !== phase.key) {
        await this.dispatchLightingHook(map, previousKey, phase.key, previousLighting, nextLighting, options.reason ?? "tick");
      }
      return;
    }

    if (typeof map.setLighting === "function") {
      map.setLighting(nextLighting, canBroadcast ? undefined : { sync: false });
      this.lightingPhaseByMap.set(map, phase.key);
      if (!options.skipHooks && previousKey && previousKey !== phase.key) {
        await this.dispatchLightingHook(map, previousKey, phase.key, previousLighting, nextLighting, options.reason ?? "tick");
      }
    }
  }

  private shouldRollWeather(map: RegisteredMap): boolean {
    if (!this.resolveWeatherTable(map)) {
      return false;
    }
    const weatherState = this.weatherStateByMap.get(map);
    return !weatherState || this.state().elapsedMinutes >= weatherState.expiresAtElapsedMinutes;
  }

  private async applyWeather(map: RegisteredMap, options: EnvironmentSyncOptions = {}): Promise<void> {
    const table = this.resolveWeatherTable(map);
    if (!table) {
      return;
    }

    const currentState = this.weatherStateByMap.get(map);
    const elapsedMinutes = this.state().elapsedMinutes;
    if (!options.forceWeather && currentState && elapsedMinutes < currentState.expiresAtElapsedMinutes) {
      return;
    }

    let next = this.rollWeather(map, table);
    if (!next) {
      return;
    }

    const canBroadcast = typeof map.$broadcast === "function";
    const syncOptions = canBroadcast ? undefined : { sync: false };
    const previousWeather = currentState?.weather ?? map.getWeather?.() ?? null;
    let durationMinutes = resolveTimeWeatherDuration(next.ambience.duration, this.randomFor(map, `${next.key}:duration:${Math.floor(elapsedMinutes)}`));
    let expiresAtElapsedMinutes = elapsedMinutes + Math.max(1, durationMinutes);
    const beforePayload: TimeWeatherBeforeTransitionPayload = {
      map,
      previousKey: currentState?.ambienceKey,
      currentKey: next.key,
      previousWeather,
      currentWeather: cloneWeather(next.ambience.weather),
      durationMinutes,
      expiresAtElapsedMinutes,
      time: this.state(),
      reason: options.reason ?? "tick",
      candidate: {
        key: next.key,
        ambience: next.ambience,
      },
    };

    if (!options.skipHooks) {
      const override = await this.dispatchBeforeWeatherHook(map, beforePayload);
      if (override === false) {
        this.weatherStateByMap.set(map, {
          ambienceKey: currentState?.ambienceKey ?? next.key,
          weather: previousWeather,
          expiresAtElapsedMinutes,
        });
        return;
      }
      if (override) {
        next = {
          ...next,
          key: override.key,
          ambience: override.ambience,
        };
        durationMinutes = resolveTimeWeatherDuration(next.ambience.duration, this.randomFor(map, `${next.key}:duration:${Math.floor(elapsedMinutes)}`));
        expiresAtElapsedMinutes = elapsedMinutes + Math.max(1, durationMinutes);
      }
    }

    if (next.ambience.weather) {
      map.setWeather?.({
        ...next.ambience.weather,
        params: next.ambience.weather.params ? { ...next.ambience.weather.params } : undefined,
        startedAt: Date.now(),
      }, syncOptions);
    } else {
      map.clearWeather?.(syncOptions);
    }

    this.weatherStateByMap.set(map, {
      ambienceKey: next.key,
      weather: cloneWeather(next.ambience.weather),
      expiresAtElapsedMinutes,
    });

    if (!options.skipHooks && currentState?.ambienceKey !== next.key) {
      const payload: TimeWeatherTransitionPayload = {
        map,
        previousKey: currentState?.ambienceKey,
        currentKey: next.key,
        previousWeather,
        currentWeather: cloneWeather(next.ambience.weather),
        durationMinutes,
        expiresAtElapsedMinutes,
        time: this.state(),
        reason: options.reason ?? "tick",
      };
      await this.dispatchEnvironmentHook(map, "onWeatherChange", payload);
    }
  }

  private resolveWeatherTable(map: RegisteredMap): TimeWeatherTable | undefined {
    const weather = this.options.weather;
    if (!weather || weather.enabled === false) {
      return undefined;
    }
    return weather.maps?.[map.id] ?? weather.default;
  }

  private rollWeather(map: RegisteredMap, table: TimeWeatherTable): WeightedWeatherRollCandidate | undefined {
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

  private async dispatchLightingHook(
    map: RegisteredMap,
    previousKey: string,
    currentKey: string,
    previousLighting: LightingState | null | undefined,
    currentLighting: Partial<LightingState>,
    reason: TimeEnvironmentReason,
  ): Promise<void> {
    const payload: TimeLightingPhaseTransitionPayload = {
      map,
      previousKey,
      currentKey,
      previousLighting: previousLighting ?? undefined,
      currentLighting,
      time: this.state(),
      reason,
    };
    await this.dispatchEnvironmentHook(map, "onLightingPhaseChange", payload);
  }

  private async dispatchBeforeWeatherHook(
    map: RegisteredMap,
    payload: TimeWeatherBeforeTransitionPayload,
  ): Promise<false | TimeWeatherRollCandidate | undefined> {
    return this.withEnvironmentDispatch(async () => {
      const hook = this.options.hooks?.onBeforeWeatherChange;
      if (!hook) {
        return undefined;
      }
      try {
        const result = await hook(payload);
        return result === undefined ? undefined : result;
      } catch (error) {
        this.logEnvironmentHookError("onBeforeWeatherChange", map, error);
        return undefined;
      }
    });
  }

  private async dispatchEnvironmentHook(map: RegisteredMap, hookName: string, payload: unknown): Promise<void> {
    await this.withEnvironmentDispatch(async () => {
      await this.callPluginHook(hookName, payload, map);
      await this.callEventHooks(map, hookName, payload);
    });
  }

  private async withEnvironmentDispatch<T>(callback: () => Promise<T>): Promise<T> {
    this.dispatchDepth += 1;
    try {
      return await callback();
    } finally {
      this.dispatchDepth -= 1;
      if (this.dispatchDepth === 0 && this.pendingEnvironmentSync) {
        this.pendingEnvironmentSync = false;
        for (const map of this.maps) {
          this.syncMap(map, { reason: "tick" });
        }
      }
    }
  }

  private async callPluginHook(hookName: string, payload: unknown, map: RegisteredMap): Promise<void> {
    const hooks = this.options.hooks as Record<string, ((payload: unknown) => any) | undefined> | undefined;
    const hook = hooks?.[hookName];
    if (!hook) {
      return;
    }
    try {
      await hook(payload);
    } catch (error) {
      this.logEnvironmentHookError(hookName, map, error);
    }
  }

  private async callEventHooks(map: RegisteredMap, hookName: string, payload: unknown): Promise<void> {
    const events = this.getMapEvents(map);
    const hasGlobalEventHook = this.hasGlobalEventHook(map, hookName);
    for (const event of events) {
      if (!event || (!hasGlobalEventHook && typeof event[hookName] !== "function")) {
        continue;
      }
      try {
        await event.execMethod?.(hookName, [payload]);
      } catch (error) {
        this.logEnvironmentHookError(hookName, map, error);
      }
    }
  }

  private hasEnvironmentHook(map: RegisteredMap, hookName: string): boolean {
    const hooks = this.options.hooks as Record<string, unknown> | undefined;
    if (typeof hooks?.[hookName] === "function") {
      return true;
    }
    if (this.hasGlobalEventHook(map, hookName)) {
      return true;
    }
    return this.getMapEvents(map).some((event) => typeof event?.[hookName] === "function");
  }

  private hasGlobalEventHook(map: RegisteredMap, hookName: string): boolean {
    return typeof map.hooks?.getHookFunctions === "function"
      && map.hooks.getHookFunctions(`server-event-${hookName}`).length > 0;
  }

  private getMapEvents(map: RegisteredMap): Record<string, any>[] {
    if (typeof map.getEvents === "function") {
      return map.getEvents();
    }
    const events = typeof map.events === "function" ? map.events() : undefined;
    return events && typeof events === "object" ? Object.values(events) : [];
  }

  private logEnvironmentHookError(hookName: string, map: RegisteredMap, error: unknown): void {
    console.error(`[RPGJS] Error during TimeManager ${hookName} hook on map "${map.id}":`, error);
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

function cloneWeather(weather: WeatherState | null | undefined): WeatherState | null {
  if (!weather) {
    return null;
  }
  return {
    ...weather,
    params: weather.params ? { ...weather.params } : undefined,
  };
}
