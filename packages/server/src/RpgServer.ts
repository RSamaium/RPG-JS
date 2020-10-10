import RpgPlayer from './Player'
import { RpgMap } from './Game/Map'

interface RpgClassPlayer<T> {
    new (gamePlayer: any, options: any, props: any): T,
}

interface RpgClassMap<T> {
    new (server: any): T,
}

interface RpgServerOptions { 
    playerClass?: RpgClassPlayer<RpgPlayer>,
    database?: object,
    maps?: RpgClassMap<RpgMap>[],
    basePath: string,
    damageFormulas?: object
}

export function RpgServer(options: RpgServerOptions) {
    return (target) => {
        target._options = {}
        for (let key in options) {
            target._options[key] = options[key]
        }
    }
}