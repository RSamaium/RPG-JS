import { InjectContext } from "@rpgjs/common";

let instanceContext: InjectContext | null = null

/**
 * Dependency injection function for RPGJS server side.
 * 
 * The server-side `inject` function is designed for retrieving instances of server-related classes in the RPGJS framework. 
 * This function is crucial for accessing singleton instances of classes like `RpgServerEngine` on the server. It facilitates 
 * a clean and efficient approach to handling dependencies within server modules, contributing to a more organized codebase.
 *
 * @template T The class type that you want to retrieve an instance of, specific to server-side modules.
 * @returns {T} Returns the singleton instance of the specified class, ensuring consistent server-side behavior and state management.
 * @since 4.2.0
 *
 * @example
 * ```ts
 * // Example of injecting the RpgServerEngine
 * import { inject, RpgServerEngine } from '@rpgjs/server'
 * const server = inject(RpgServerEngine)
 * ```
 */
export function inject<T>(service: new (...args: any[]) => T, args: any[] = []): T {
    return instanceContext!.inject(service, args);
}

export function setInject(context: InjectContext) {
    instanceContext = context;
}

export function clearInject() {
    instanceContext = null
}