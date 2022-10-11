export class TiledProperties {
    properties: {
        [key: string]: any
    } = {}
    class: string

    constructor(data?: any) {
        this.properties = data?.properties ?? {}
    }

    getProperty<P, D = undefined>(name: string, defaultValue?: D): P | D {
        const val = this.properties[name]
        if (val === undefined) {
            return defaultValue as D
        }
        return val as any
    }

    hasProperty(name: string): boolean {
        return !!this.properties[name]
    }

    setProperty<T>(name: string, value: T) {
        this.properties[name] = value
    }

    getType(): string {
        return this.class || this['type']
    }
 }