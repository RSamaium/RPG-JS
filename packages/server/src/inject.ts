import { InjectContext } from "@rpgjs/common";

let instanceContext: InjectContext | null = null

export function inject<T>(service: new (...args: any[]) => T, args: any[] = []): T {
    return instanceContext!.inject(service, args);
}

export function setInject(context: InjectContext) {
    instanceContext = context;
}

export function clearInject() {
    instanceContext = null
}