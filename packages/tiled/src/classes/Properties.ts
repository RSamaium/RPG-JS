import { TiledProperty } from "../types/Types"

export class TiledProperties<T extends { properties: TiledProperty<any>[] }> {
    properties: Map<string, {
        name: string
        value: string
        type: string
    }> = new Map()

    constructor(data: T) {
        for (let prop of data.properties) {
            this.properties.set(prop.name, prop)
        }
    }

    getProperty<P>(name: string): P | null {
        const prop = this.properties.get(name)
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