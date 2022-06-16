import { TiledProperty } from "../types/Types"

export class TiledProperties {
    private _properties: Map<string, {
        name: string
        value: string
        type: string
    }> = new Map()

    constructor(data: any) {
        if (data.properties) {
            for (let prop of data.properties) {
                if (!prop) continue
                this._properties.set(prop.name, prop)
            }
        }
    }

    getProperty<P>(name: string): P | null {
        const prop = this._properties.get(name)
        if (prop) {
            switch (prop.type) {
                case 'int':
                    return +prop.value as any
                case 'bool':
                    return prop.value == 'true' ? true : false as any
            }
        }
        return null
    }
 }