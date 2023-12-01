type Constructor<T> = new (...args: any[]) => T;
type ServiceIdentifier<T> = string;

export class InjectContext {
    private instances = new Map<ServiceIdentifier<any>, any>();

    inject<T>(constructor: Constructor<T>, args: any[] = []): T {
        const serviceName = constructor.name;
        if (!this.instances.has(serviceName)) {
            const instance = new constructor(this, ...args);
            if (instance['initialize']) {
                instance['initialize'](...args);
            }
            this.instances.set(serviceName, instance);
        }
        return this.instances.get(serviceName);
    }
}

export interface InjectInit {
    initialize(...args: any[]): any
}