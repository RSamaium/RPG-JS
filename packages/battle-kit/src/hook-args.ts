/**
 * The arguments of the hook `K` of a hooks interface `T`: what
 * `BattleServerHooks.call` and `BattleClientHooks.call` accept after the hook
 * name, so a call with the wrong arguments does not compile. Any runtime.
 *
 * @title BattleHookArgs
 * @example
 * ```ts
 * interface MyHooks { onStart?(player: RpgPlayer, battle: MyHandle): void }
 * type Args = BattleHookArgs<MyHooks, "onStart">; // [RpgPlayer, MyHandle]
 * ```
 */
export type BattleHookArgs<T, K extends keyof T> = NonNullable<T[K]> extends (...args: infer A) => unknown ? A : never;
