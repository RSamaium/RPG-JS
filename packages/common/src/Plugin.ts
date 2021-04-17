import { EventEmitter } from './EventEmitter'
import { isArray } from './Utils'

type PluginFunction = (obj: any, options?: any) => void
export type Plugin = { client: null | PluginFunction, server:  null | PluginFunction }

export enum HookServer {
    Start = 'Server.Start',
    PlayerConnected = 'Server.PlayerConnected',
    PlayerDisconnected = 'Server.PlayerDisconnected'
}  

export enum HookClient {

}

export class PluginSystem extends EventEmitter {
    private loadPlugins(plugins: Plugin[], shared: any, type: string) {
        if (!plugins) return
        for (let plugin of plugins) {
            let plug: any = []
            if (!isArray(plugin)) {
                plug = [plugin]
            }
            else {
                plug = plugin
            }
            const [side, options] = plug
            if (!side[type]) continue
            side[type]({
                RpgPlugin,
                ...shared
            }, options)
        }
    }

    loadServerPlugins(plugins, shared) {
        this.loadPlugins(plugins, shared, 'server')
    }

    loadClientPlugins(plugins, shared) {
        this.loadPlugins(plugins, shared, 'client')
    }
}

export const RpgPlugin = new PluginSystem()