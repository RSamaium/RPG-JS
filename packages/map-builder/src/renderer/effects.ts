/** What an effect writes for one frame. Effects combine: offsets add up, alphas multiply. */
export interface EffectOutput {
  offsetX: number;
  offsetY: number;
  alpha: number;
}

export type EffectParams = Readonly<Record<string, unknown>>;

/**
 * A short-lived visual change: an element shaking, blinking. It never goes
 * through the model, so it is not persisted, undoable, nor replayed to late joiners.
 */
export interface EffectDefinition<P extends EffectParams = EffectParams> {
  /** Default duration in milliseconds. A `duration` param overrides it. */
  readonly duration: number;
  /** `progress` goes from 0 to 1. */
  update(progress: number, params: P, output: EffectOutput): void;
}

const number = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** Left-right oscillation that fades out. Params: `intensity` (pixels), `frequency` (oscillations). */
export const shakeEffect: EffectDefinition = {
  duration: 300,
  update(progress, params, output) {
    const intensity = number(params.intensity, 3);
    const frequency = number(params.frequency, 6);
    output.offsetX += Math.sin(progress * frequency * Math.PI * 2) * intensity * (1 - progress);
  },
};

/** Fades out and back in. Params: `strength` (0 to 1, how transparent it gets). */
export const blinkEffect: EffectDefinition = {
  duration: 400,
  update(progress, params, output) {
    const strength = Math.min(1, Math.max(0, number(params.strength, 0.6)));
    output.alpha *= 1 - strength * Math.sin(progress * Math.PI);
  },
};

export const builtInEffects: Readonly<Record<string, EffectDefinition>> = { shake: shakeEffect, blink: blinkEffect };

export type EffectStatus =
  | "completed"
  | "cancelled"
  /** The element disappeared while the effect was running. */
  | "target-removed"
  | "unknown-effect"
  | "target-missing";

export interface EffectHandle {
  readonly id: number;
  /** Stops the effect and restores the target. No effect if it already ended. */
  cancel(): void;
  readonly finished: Promise<EffectStatus>;
}

export interface EffectRunnerOptions {
  /** Whether a target still exists. */
  exists(targetKey: string): boolean;
  /** Receives the combined result for a target each frame, and `null` once its last effect ended. */
  apply(targetKey: string, output: EffectOutput | null): void;
  onWarning?(message: string): void;
}

export interface EffectRunner {
  register(name: string, definition: EffectDefinition): void;
  /** Starts an effect. It never throws: an unknown effect or target ends immediately with a status. */
  play(targetKey: string, name: string, params?: EffectParams): EffectHandle;
  /** Advances every running effect by `deltaMs`. Time only moves here, so effects are deterministic. */
  tick(deltaMs: number): void;
  /** Cancels every effect on a target, or on all targets. */
  clear(targetKey?: string): void;
  /** Called when a target is removed from the scene. */
  targetRemoved(targetKey: string): void;
  readonly running: number;
}

interface Running {
  readonly id: number;
  readonly targetKey: string;
  readonly definition: EffectDefinition;
  readonly params: EffectParams;
  readonly duration: number;
  elapsed: number;
  readonly settle: (status: EffectStatus) => void;
}

export function createEffectRunner(options: EffectRunnerOptions): EffectRunner {
  const definitions = new Map<string, EffectDefinition>(Object.entries(builtInEffects));
  let running: Running[] = [];
  let nextId = 1;

  const finish = (effect: Running, status: EffectStatus): void => {
    running = running.filter((entry) => entry !== effect);
    effect.settle(status);
  };

  const flush = (targetKey: string): void => {
    const active = running.filter((entry) => entry.targetKey === targetKey);
    if (active.length === 0) {
      options.apply(targetKey, null);
      return;
    }
    const output: EffectOutput = { offsetX: 0, offsetY: 0, alpha: 1 };
    for (const effect of active) {
      effect.definition.update(Math.min(1, effect.elapsed / effect.duration), effect.params, output);
    }
    options.apply(targetKey, output);
  };

  const ended = (status: EffectStatus): EffectHandle => ({
    id: 0,
    cancel: () => undefined,
    finished: Promise.resolve(status),
  });

  return {
    register(name, definition) {
      definitions.set(name, definition);
    },
    play(targetKey, name, params = {}) {
      const definition = definitions.get(name);
      if (!definition) {
        options.onWarning?.(`Unknown effect "${name}"`);
        return ended("unknown-effect");
      }
      if (!options.exists(targetKey)) return ended("target-missing");

      const duration = Math.max(1, number(params.duration, definition.duration));
      let settle!: (status: EffectStatus) => void;
      const finished = new Promise<EffectStatus>((resolve) => (settle = resolve));
      const effect: Running = { id: nextId++, targetKey, definition, params, duration, elapsed: 0, settle };
      running.push(effect);
      flush(targetKey);
      return {
        id: effect.id,
        cancel: () => {
          if (!running.includes(effect)) return;
          finish(effect, "cancelled");
          flush(targetKey);
        },
        finished,
      };
    },
    tick(deltaMs) {
      if (running.length === 0) return;
      const targets = new Set(running.map((effect) => effect.targetKey));
      for (const effect of running) effect.elapsed += deltaMs;
      for (const effect of [...running]) {
        if (effect.elapsed >= effect.duration) finish(effect, "completed");
      }
      for (const targetKey of targets) flush(targetKey);
    },
    clear(targetKey) {
      const cancelled = running.filter((effect) => targetKey === undefined || effect.targetKey === targetKey);
      const targets = new Set(cancelled.map((effect) => effect.targetKey));
      for (const effect of cancelled) finish(effect, "cancelled");
      for (const key of targets) flush(key);
    },
    targetRemoved(targetKey) {
      const removed = running.filter((effect) => effect.targetKey === targetKey);
      for (const effect of removed) finish(effect, "target-removed");
    },
    get running() {
      return running.length;
    },
  };
}
