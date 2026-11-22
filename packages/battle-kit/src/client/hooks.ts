import { ModulesToken, type Hooks } from "@rpgjs/common";
import { inject } from "@rpgjs/client";

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
   * Calls a hook (option, then game modules) and waits for every result.
   *
   * @returns The results, flattened
   */
  async call<K extends keyof T & string>(name: K, ...args: unknown[]): Promise<unknown[]> {
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

  /** Calls a hook that can take over the default behaviour: true when one of them returned `false`. */
  async replaced<K extends keyof T & string>(name: K, ...args: unknown[]): Promise<boolean> {
    return (await this.call(name, ...args)).includes(false);
  }
}
