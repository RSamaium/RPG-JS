import type { Unsubscribe } from "../model/result";

/** A small observable store, framework-neutral: `subscribe(cb)` plugs into signals, Vue, React… */
export interface Store<T> {
  get(): T;
  /** Merges `patch` into the state. Listeners run only if a value actually changed. */
  update(patch: Partial<T>): void;
  subscribe(listener: (state: T) => void): Unsubscribe;
}

export function createStore<T extends object>(initial: T, onListenerError: (error: unknown) => void = console.error): Store<T> {
  let state = initial;
  const listeners = new Set<(state: T) => void>();
  return {
    get: () => state,
    update(patch) {
      const keys = Object.keys(patch) as Array<keyof T>;
      if (keys.every((key) => Object.is(state[key], patch[key]))) return;
      state = { ...state, ...patch };
      for (const listener of [...listeners]) {
        try {
          listener(state);
        } catch (error) {
          onListenerError(error);
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
