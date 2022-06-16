import { TiledProperty } from "../types/Types"

export class TiledProperties {
    private _properties: Map<string, {
        name: string
        value: any
        type?: string
    }> = new Map()

    constructor(data: any) {
        if (data.properties) {
            for (let prop of data.properties) {
                if (!prop) continue
                this._properties.set(prop.name, prop)
            }
        }
    }

    getProperty<P, D = undefined>(name: string, defaultValue?: D): P | D {
        const prop = this._properties.get(name)
        if (prop) {
            switch (prop.type) {
                case 'int':
                    return +prop.value as any
                case 'bool':
                    return prop.value == 'true' ? true : false as any
            }
        }
        return defaultValue as D
    }

    getProperties() {
        const obj = {}
        this._properties.forEach(( { value, name }: any) => {
            obj[name] = value
        })
        return obj
    }

    setProperty<T>(name: string, value: T) {
        this._properties.set(name, {
            value,
            name
        })
    }
 }