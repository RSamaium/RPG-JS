import { InjectContext } from "@rpgjs/common";

let instanceContext: InjectContext | null = null

/**
 * Dependency injection function for RPGJS client side.
 * 
 * This client-side `inject` function is used to retrieve instances of various classes within the RPGJS framework, 
 * specifically for client-side modules. It enables developers to access singleton instances of key classes such as 
 * `RpgClientEngine`, `KeyboardControls`, and `RpgRenderer`. Utilizing `inject` on the client side promotes modular 
 * and maintainable code by simplifying dependency management.
 *
 * @template T The class type that you want to retrieve an instance of, relevant to client-side modules.
 * @returns {T} Returns the singleton instance of the specified class, ensuring only one instance is used client-side.
 * @since 4.2.0
 *
 * @example
 * ```ts
 * // Example of injecting the RpgClientEngine
 * import { inject, RpgClientEngine } from '@rpgjs/client'
 * const client = inject(RpgClientEngine)
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