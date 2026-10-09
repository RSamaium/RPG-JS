import { Context, inject as injector } from "@signe/di";
import type { RpgContext } from "@rpgjs/common";

export let context: RpgContext | null = null

export function inject<T>(service: (new (...args: any[]) => T) | string, _context?: RpgContext): T {
    const c = _context ?? context
    if (!c) throw new Error("Context is not set. use setInject() to set the context");
    return injector(c as Context, service);
}

export function setInject(_context: RpgContext) {
    context = _context;
}

export function clearInject() {
    context = null
}
