export const ModulesToken = "ModulesToken";

import type { RpgContext, RpgFactoryProvider, RpgProvider } from "./foundation";
import { Subject, Observable, from } from "rxjs";
import { mergeMap, toArray } from "rxjs/operators";

export enum Side {
  Server = 'server',
  Client = 'client'
}

export type ModuleSide<Client = unknown, Server = unknown> = {
  client?: Client,
  server?: Server
}

export type ModuleType<Client = unknown, Server = unknown> = ModuleSide<Client, Server> | [ModuleSide<Client, Server>, {
  client?: Client,
  server?: Server
}]

export function RpgModule<T>(options: T) {
  return (target) => {
      if ((options as any).hooks) {
          target.hooks = (options as any).hooks
      }
      for (let key in options) {
          target.prototype[key] = options[key]
      }
  }
}

export class Hooks {
  /**
   * Store of all module hooks by ID
   */
  private moduleHooks: Record<string, Subject<any>> = {};

  /**
   * Store of all hook functions by ID
   */
  private hookFunctions: Record<string, Function[]> = {};

  constructor(private modules: any[], private namespace: string) {
    this.init();
  }

  private init() {
    for (const module of this.modules) {
      for (const type in module) {
        const hookObject = module[type];
        for (const hook in hookObject) {
          const hookFunction = hookObject[hook];
          if (hookFunction) {
            const hookId = `${this.namespace}-${type}-${hook}`;

            // Créer un Subject pour ce hook s'il n'existe pas déjà
            if (!this.moduleHooks[hookId]) {
              this.moduleHooks[hookId] = new Subject<any>();
            }

            // Initialiser le tableau de fonctions pour cet ID si nécessaire
            if (!this.hookFunctions[hookId]) {
              this.hookFunctions[hookId] = [];
            }

            // Ajouter la fonction au tableau des hooks pour cet ID
            // (sans l'exécuter immédiatement)
            if (!this.hookFunctions[hookId].includes(hookFunction)) {
              this.hookFunctions[hookId].push(hookFunction);
            }
          }
        }
      }
    }

    return this.moduleHooks;
  }

  /**
   * Call hooks for a specific ID, passing arguments to all subscribed hooks
   *
   * @param hookId - The unique identifier of the module hook
   * @param args - Arguments to pass to the hook functions
   * @returns An Observable that emits an array with all hook results when subscribed
   * @example
   * ```ts
   * // Call all hook functions for the ID 'my-namespace-type-hook'
   * callHooks('my-namespace-type-hook', { x: 10, y: 20 }).subscribe(results => {
   *   console.log('Hook results:', results);  // Array of all hook function results
   * });
   * 
   * // Hook functions are only executed when you subscribe to the returned Observable
   * const observable = callHooks('my-namespace-type-hook', player);
   * // ... later ...
   * observable.subscribe(results => {
   *   // Process results array
   * });
   * ```
   */
  public callHooks(hookId: string, ...args: any[]): Observable<any[]> {
    if (!this.moduleHooks[hookId]) {
      this.moduleHooks[hookId] = new Subject<any>();
    }


    // Create an Observable that will execute all hook functions when subscribed
    return new Observable<any[]>((subscriber) => {
      if (this.hookFunctions[hookId] && this.hookFunctions[hookId].length > 0) {
        // Map each hook function to an Observable that can handle both synchronous values and Promises
        const hookResults$ = from(this.hookFunctions[hookId]).pipe(
          mergeMap((hookFunction) => {
            let result;
            try {
              result = hookFunction(...args);
              return from(Promise.resolve(result));
            } catch (error) {
              subscriber.error(error);
              return [];
            }
          }),
          toArray() // Collect all results into an array
        );

        // Subscribe to the hook results Observable
        const subscription = hookResults$.subscribe({
          next: (results) => {
            // Emit all collected results to subscribers of this hook
            this.moduleHooks[hookId].next(results);
            subscriber.next(results);
            subscriber.complete();
          },
          error: (err) => {
            subscriber.error(err);
          }
        });

        // Return cleanup function
        return () => {
          subscription.unsubscribe();
        };
      } else {
        // No hook functions to execute, emit an empty array
        subscriber.next([]);
        subscriber.complete();
        return () => {};
      }
    });
  }

  public getHookFunctions(hookId: string): Function[] {
    return [...(this.hookFunctions[hookId] ?? [])];
  }
}

/**
 * Provide modules configuration to Angular Dependency Injection
 * Registers hook functions for later execution
 *
 * @param modules - Array of modules to provide
 * @param namespace - Namespace to prefix hook IDs
 * @returns Provider configuration for Angular DI
 * @example
 * ```ts
 * // Define modules
 * const modules = [
 *   {
 *     player: {
 *       onMove: (player) => {
 *         // Handle player movement
 *       }
 *     }
 *   }
 * ];
 *
 * // Provide modules
 * const provider = provideModules(modules, 'game');
 * ```
 */
export function provideModules(
  modules: any[],
  namespace: string,
  transform?: (modules: any, context: RpgContext) => any
): RpgFactoryProvider<Hooks> {
  return {
    provide: ModulesToken,
    useFactory: (context: RpgContext) => {
      modules = transform ? transform(modules, context) : modules
      return new Hooks(modules, namespace);
    },
  };
}

export function findModules(context: RpgContext, namespace: string) {
  let modules: any[] = []
  const values = (context as any).values;
  for (let key in values) {
    if (key.endsWith('Module' + namespace)) {
      modules.push(values[key].values.get('__default__'))
    }
  }
  return modules
}

/**
 * Create module providers from a token name and array of providers
 * Transforms objects with server/client properties into separate ModuleServer and ModuleClient providers
 *
 * @param tokenName - The base token name for the module
 * @param providers - Array of providers that can be regular providers or objects with server/client properties
 * @returns Flattened array of providers with transformed server/client objects
 * @example
 * ```ts
 * // Input: createModule('battle', [{ server: serverModule, client: clientModule }])
 * // Output: [
 * //   { provide: 'battleModuleServer', useValue: { server: serverModule, client: clientModule }, meta: { server: true, isModule: true } },
 * //   { provide: 'battleModuleClient', useValue: { server: serverModule, client: clientModule }, meta: { client: true, isModule: true } }
 * // ]
 * 
 * // Regular providers are passed through unchanged
 * createModule('battle', [regularProvider, { server, client }])
 * ```
 */
export function createModule(
  tokenName: string,
  providers: (RpgProvider | RpgProvider[] | ModuleSide)[]
): RpgProvider[] {
  const results = providers.map(provider => {
    const results: any[] = [];

    if (!provider) {
      return []
    }
    
    if ('server' in provider) {
      results.push({
        provide: tokenName + 'ModuleServer',
        useValue: provider,
        meta: {
          server: true,
          isModule: true,
        }
      });
    }
    
    if ('client' in provider) {
      results.push({
        provide: tokenName + 'ModuleClient',
        useValue: provider,
        meta: {
          client: true,
          isModule: true,
        }
      });
    }
    
    // If neither server nor client properties, return the provider as-is
    if (!('server' in provider) && !('client' in provider)) {
      results.push(provider);
    }
    
    return results;
  }).flat(); // Flatten the array to handle multiple results per provider

  return results.flat() as RpgProvider[];
}

/**
 * Defines the hooks and resources owned by one RPGJS runtime module.
 *
 * Use `provideServerModules()` to install a server definition and
 * `provideClientModules()` to install a client definition. Configurable
 * packages should expose a runtime-specific `provideX()` function.
 *
 * @title Define a module
 * @method defineModule
 * @param options - Runtime module hooks and resources.
 * @returns The same module definition with its precise inferred type.
 * @memberof Modules
 * @example
 * ```ts
 * import { defineModule, type RpgServer } from '@rpgjs/server'
 *
 * export default defineModule<RpgServer>({
 *   player: {
 *     onConnected(player) {
 *       console.log(player.id)
 *     }
 *   }
 * })
 * ```
 */
export function defineModule<T>(options: T): T {
  return options
}
