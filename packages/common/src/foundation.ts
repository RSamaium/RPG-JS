/**
 * Stable, implementation-neutral readable signal exposed by RPGJS.
 *
 * The runtime implementation is provided internally by Signe or CanvasEngine.
 */
export interface RpgReadableSignal<T = unknown> {
  (): T;
}

/**
 * Stable writable signal used by synchronized RPGJS gameplay properties.
 */
export interface RpgWritableSignal<T = unknown> extends RpgReadableSignal<T> {
  /** Replace the current signal value. */
  set(value: T): void;
  /** Mutate the current value in place and notify reactive consumers. */
  mutate(mutator: (value: T) => void): void;
  /** Replace the current value with the result of an updater function. */
  update(updater: (value: T) => T): void;
}

/** Token used to register and resolve an RPGJS dependency. */
export type RpgProviderToken<T = unknown> =
  | string
  | (new (...args: any[]) => T);

/**
 * Stable dependency-injection context returned by RPGJS bootstrap functions.
 *
 * The context is shared by providers for one client or server runtime.
 */
export interface RpgContext {
  /** Runtime that owns this context, when the bootstrap process specifies it. */
  side?: "client" | "server";
  /** Store a dependency under a string token. */
  set<T = unknown>(key: string, value: T): void;
  /** Resolve a dependency previously stored under a string token. */
  get<T = unknown>(key: string): T;
}

/** Common options supported by RPGJS dependency providers. */
export interface RpgProviderOptions {
  /** Allow several providers to be registered for the same token. */
  multi?: boolean;
  /** Optional named registration for the token. */
  name?: string;
  /** Tokens that must be initialized before this provider. */
  deps?: RpgProviderToken[];
  /** Framework or extension metadata associated with the provider. */
  meta?: Record<string, unknown>;
}

/** Register an existing value in an RPGJS dependency context. */
export interface RpgValueProvider<T = unknown> extends RpgProviderOptions {
  /** Token under which the value is registered. */
  provide: RpgProviderToken;
  /** Value made available to the runtime. */
  useValue: T;
  /** A value provider cannot use another creation strategy. */
  useClass?: never;
  /** A value provider cannot use another creation strategy. */
  useFactory?: never;
  /** A value provider cannot use another creation strategy. */
  useExisting?: never;
}

/** Register a class instantiated by the RPGJS dependency container. */
export interface RpgClassProvider<T = unknown> extends RpgProviderOptions {
  /** Token under which the instance is registered. */
  provide: RpgProviderToken;
  /** Class constructed when the provider is initialized. */
  useClass: new (...args: any[]) => T;
  /** A class provider cannot use another creation strategy. */
  useValue?: never;
  /** A class provider cannot use another creation strategy. */
  useFactory?: never;
  /** A class provider cannot use another creation strategy. */
  useExisting?: never;
}

/**
 * Register a factory that receives the stable RPGJS dependency context.
 *
 * @example
 * ```ts
 * const provider = {
 *   provide: 'inventory',
 *   useFactory: (context: RpgContext) => createInventory(context)
 * } satisfies RpgFactoryProvider
 * ```
 */
export interface RpgFactoryProvider<T = unknown> extends RpgProviderOptions {
  /** Token under which the factory result is registered. */
  provide: RpgProviderToken;
  /** Factory invoked and awaited during runtime initialization. */
  useFactory: (context: RpgContext) => T | Promise<T>;
  /** A factory provider cannot use another creation strategy. */
  useValue?: never;
  /** A factory provider cannot use another creation strategy. */
  useClass?: never;
  /** A factory provider cannot use another creation strategy. */
  useExisting?: never;
}

/** Register an alias to another dependency token. */
export interface RpgExistingProvider extends RpgProviderOptions {
  /** Token exposed by the alias. */
  provide: RpgProviderToken;
  /** Existing token resolved through the alias. */
  useExisting: RpgProviderToken;
  /** An alias provider cannot use another creation strategy. */
  useValue?: never;
  /** An alias provider cannot use another creation strategy. */
  useClass?: never;
  /** An alias provider cannot use another creation strategy. */
  useFactory?: never;
}

/** Provider shapes accepted by RPGJS client and server bootstrap functions. */
export type RpgProvider<T = unknown> =
  | (new (...args: any[]) => T)
  | RpgValueProvider<T>
  | RpgClassProvider<T>
  | RpgFactoryProvider<T>
  | RpgExistingProvider;

/** Recursive provider list accepted by RPGJS bootstrap functions. */
export type RpgProviders = Array<RpgProvider | RpgProviders>;
