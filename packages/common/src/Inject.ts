const cacheInstances: { [key: string]: any } = {};

export function inject<T>(service: new (...args: any[]) => T, args: any[] = []): T {
    if (cacheInstances[service.name]) {
        return cacheInstances[service.name] as T;
    }
    const instance = new service(...args);
    if (instance['initialize']) instance['initialize'](...args)
    cacheInstances[service.name] = instance;
    return instance;
}

export interface InjectInit {
    initialize(...args: any[]): any
}