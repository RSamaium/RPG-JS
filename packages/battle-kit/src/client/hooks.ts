import { ModulesToken, type Hooks } from "@rpgjs/common";
import { inject } from "@rpgjs/client";
import type { BattleHookArgs } from "../hook-args";

/**
 * The hooks of a battle system on the client: the ones given to its
 * `provide…Client` function (`hooks` option), then the ones of the game
 * modules, declared under the key of the battle system:
 *
 * ```ts
 * defineModule<RpgClient>({ turnBattle: { onStart(scene, view) {} } })
 * // engine hook id: "client-turnBattle-onStart"
 * ```
 *
 * A failing hook is logged and does not stop the battle. Client only.
 *
 * @title BattleClientHooks
 * @example
 * ```ts
 * const hooks = new BattleClientHooks<TurnBattleClientHooks>("turnBattle", options.hooks);
 * const replaced = (await hooks.call("onPlay", beat, scene, steps)).includes(false);
 * ```
 */
export class BattleClientHooks<T extends object> {
  /**
   * @param key - Key of the hooks in a module (`turnBattle`, `tactical`)
   * @param own - Hooks given to the `provide…Client` function, called first
   */
  constructor(
    readonly key: string,
    private readonly own?: Partial<T>,
  ) {}

  /**
   * Calls a hook (option, then game modules) and waits for every result. A
   * failure is logged with `console.warn` and the results gathered so far are
   * returned.
   *
   * @title call
   * @method hooks.call(name, ...args)
   * @param {string} name - Hook name (`"onStart"`)
   * @param {...unknown} args - Arguments given to every hook
   * @returns {Promise<unknown[]>} The results, flattened
   * @memberof BattleClientHooks
   * @example
   * ```ts
   * await hooks.call("onStart", scene, view);
   * ```
   */
  async call<K extends keyof T & string>(name: K, ...args: BattleHookArgs<T, K>): Promise<unknown[]> {
    const results: unknown[] = [];
    try {
      const own = this.own?.[name] as ((...a: unknown[]) => unknown) | undefined;
      if (own) results.push(await own(...args));
      let hooks: Hooks | undefined;
      try {
        hooks = inject<Hooks>(ModulesToken);
      } catch {
        hooks = undefined;
      }
      if (!hooks?.callHooks) return results;
      await new Promise<void>((resolve) =>
        hooks!.callHooks(`client-${this.key}-${name}`, ...args).subscribe({
          next: (value: unknown) => results.push(...(Array.isArray(value) ? value : [value])),
          error: (error: unknown) => {
            console.warn(`[${this.key}] ${name} hook failed`, error);
            resolve();
          },
          complete: () => resolve(),
        }),
      );
    } catch (error) {
      console.warn(`[${this.key}] ${name} hook failed`, error);
    }
    return results;
  }

  /**
   * Calls a hook that can take over the default behaviour.
   *
   * @title replaced
   * @method hooks.replaced(name, ...args)
   * @param {string} name - Hook name (`"onPlay"`)
   * @param {...unknown} args - Arguments given to every hook
   * @returns {Promise<boolean>} True when one of them returned `false`
   * @memberof BattleClientHooks
   * @example
   * ```ts
   * if (!(await hooks.replaced("onPlay", beat, scene))) await playDefault(beat);
   * ```
   */
  async replaced<K extends keyof T & string>(name: K, ...args: BattleHookArgs<T, K>): Promise<boolean> {
    return (await this.call(name, ...args)).includes(false);
  }
}
