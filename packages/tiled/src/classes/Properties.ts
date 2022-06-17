import { TiledProperty } from "../types/Types"

export class TiledProperties {
    private _properties: Map<string, {
        name: string
        value: any
        type?: string
    }> = new Map()

    constructor(data: any) {
        if (data.properties) {
            for (let key in data.properties) {
                this._properties.set(key, data.properties[key])
            }
        }
    }

    getProperty<P, D = undefined>(name: string, defaultValue?: D): P | D {
        const val = this._properties.get(name)
        if (val === undefined) {
            return defaultValue as D
        }
        return val as any
    }

    getProperties() {
        const obj = {}
        this._properties.forEach(( value: any, name: string) => {
            obj[name] = value
        })
        return obj
    }

    setProperty<T>(name: string, value: T) {
        this._properties.set(name, value as any)
    }
 }