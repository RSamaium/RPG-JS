import type { RpgPlayer } from "@rpgjs/server";

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

  /** The functions of a hook, in order: the option, then the game modules. Use it for synchronous rule hooks. */
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
   *
   * @returns The results, flattened
   */
  async call<K extends keyof T & string>(player: RpgPlayer, name: K, ...args: unknown[]): Promise<unknown[]> {
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

  /** Calls a veto hook: true when one of them returned `false`. */
  async vetoed<K extends keyof T & string>(player: RpgPlayer, name: K, ...args: unknown[]): Promise<boolean> {
    return (await this.call(player, name, ...args)).includes(false);
  }
}
