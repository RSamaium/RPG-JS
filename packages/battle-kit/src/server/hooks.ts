import type { RpgPlayer } from "@rpgjs/server";
import type { BattleHookArgs } from "../hook-args";

type HookFunction = (...args: never[]) => unknown;

/**
 * The hooks of a battle system on the server: the ones given to its `provide…`
 * function (`hooks` option), then the ones of the game modules, declared under
 * the key of the battle system:
 *
 * ```ts
 * defineModule<RpgServer>({ turnBattle: { onStart(player, battle) {} } })
 * // engine hook id: "server-turnBattle-onStart"
 * ```
 *
 * Server only.
 *
 * @title BattleServerHooks
 * @example
 * ```ts
 * const hooks = new BattleServerHooks<TurnBattleServerHooks>("turnBattle", options.hooks);
 * if (await hooks.vetoed(player, "onCommand", player, battle, env)) return;
 * const damageHooks = hooks.functions(player, "onDamage");
 * ```
 */
export class BattleServerHooks<T extends object> {
  /**
   * @param key - Key of the hooks in a module (`turnBattle`, `tactical`)
   * @param own - Hooks given to the `provide…` function, called first
   */
  constructor(
    readonly key: string,
    private readonly own?: Partial<T>,
  ) {}

  /**
   * The functions of a hook, in order: the option, then the game modules.
   * Use it for synchronous rule hooks (a damage formula) that the battle
   * calls itself.
   *
   * @title functions
   * @method hooks.functions(player, name)
   * @param {RpgPlayer} player - A player of the battle (gives access to the module hooks)
   * @param {string} name - Hook name (`"onDamage"`)
   * @returns {Function[]} The hook functions, empty when none is declared
   * @memberof BattleServerHooks
   * @example
   * ```ts
   * let damage = base;
   * for (const fn of hooks.functions(player, "onDamage")) damage = fn(damage, target) ?? damage;
   * ```
   */
  functions<K extends keyof T & string>(player: RpgPlayer, name: K): NonNullable<T[K]>[] {
    const list: NonNullable<T[K]>[] = [];
    const own = this.own?.[name];
    if (own) list.push(own as NonNullable<T[K]>);
    const modules = player.hooks?.getHookFunctions?.(`server-${this.key}-${name}`) ?? [];
    list.push(...(modules as unknown as NonNullable<T[K]>[]));
    return list;
  }

  /**
   * Calls a hook (option, then game modules) and waits for every result.
   * Unlike the client hooks, a failing hook rejects the returned promise.
   *
   * @title call
   * @method hooks.call(player, name, ...args)
   * @param {RpgPlayer} player - A player of the battle (gives access to the module hooks)
   * @param {string} name - Hook name (`"onStart"`)
   * @param {...unknown} args - Arguments given to every hook
   * @returns {Promise<unknown[]>} The results, flattened
   * @memberof BattleServerHooks
   * @example
   * ```ts
   * await hooks.call(player, "onEnd", player, battle, result);
   * ```
   */
  async call<K extends keyof T & string>(player: RpgPlayer, name: K, ...args: BattleHookArgs<T, K>): Promise<unknown[]> {
    const results: unknown[] = [];
    const own = this.own?.[name] as HookFunction | undefined;
    if (own) results.push(await (own as (...a: unknown[]) => unknown)(...args));
    const hooks = player.hooks;
    if (!hooks?.callHooks) return results;
    await new Promise<void>((resolve, reject) =>
      hooks.callHooks(`server-${this.key}-${name}`, ...args).subscribe({
        next: (value: unknown) => results.push(...(Array.isArray(value) ? value : [value])),
        error: reject,
        complete: () => resolve(),
      }),
    );
    return results;
  }

  /**
   * Calls a veto hook. Rejects like `call` when a hook fails.
   *
   * @title vetoed
   * @method hooks.vetoed(player, name, ...args)
   * @param {RpgPlayer} player - A player of the battle
   * @param {string} name - Hook name (`"onCommand"`)
   * @param {...unknown} args - Arguments given to every hook
   * @returns {Promise<boolean>} True when one of them returned `false`
   * @memberof BattleServerHooks
   * @example
   * ```ts
   * if (await hooks.vetoed(player, "onCommand", player, battle, command)) return;
   * ```
   */
  async vetoed<K extends keyof T & string>(player: RpgPlayer, name: K, ...args: BattleHookArgs<T, K>): Promise<boolean> {
    return (await this.call(player, name, ...args)).includes(false);
  }
}
