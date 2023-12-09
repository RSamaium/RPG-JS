import { EventEmitter } from './EventEmitter'
import { isArray } from './Utils'

type PluginFunction = (obj: any, options?: any) => void
type PluginSides = { client: null | PluginFunction, server:  null | PluginFunction }
export type Plugin = PluginSides | [PluginSides, any]

export enum HookServer {
    Start = 'Server.Start',
    Step = "Server.Step",
    Auth = "Server.Auth",
    PlayerConnected = 'Server.onConnected',
    PlayerDisconnected = 'Server.onDisconnected',
    AddMap = 'Server.AddMap',
    AddEvent = 'Server.AddEvent',
    AddWorldMaps = 'Server.AddWorldMaps',
    AddDatabase = 'Server.AddDatabase',
    PlayerInput = 'Server.onInput',
    PlayerJoinMap = 'Server.onJoinMap',
    PlayerLeaveMap = 'Server.onLeaveMap',
    PlayerLevelUp = 'Server.onLevelUp',
    PlayerDead = 'Server.onDead',
    PlayerInShape = 'Server.onInShape',
    PlayerOutShape = 'Server.onOutShape',
    PlayerMove = 'Server.PlayerMove',
    PlayerCanChangeMap = 'Server.PlayerCanChangeMap',
    ScalabilityPlayerConnected = 'Server.ScalabilityPlayerConnected',
    ScalabilityChangeServer = 'Server.ScalabilityChangeServer'
}

export enum HookClient {
    Start = 'Client.Start',
    Step = 'Client.Step',
    Connected = 'Client.Connected',
    Disconnect = 'Client.Disconnect',
    ConnectedError = 'Client.ConnectedError',

    AddSpriteSheet = 'Client.AddSpriteSheet',
    AddGui = 'Client.AddGui',
    AddSound = 'Client.AddSound',
    SendInput = 'Client.SendInput',

    BeforeSceneLoading = 'Client.BeforeSceneLoading',
    AfterSceneLoading = 'Client.AfterSceneLoading',
    SceneMapLoading = 'Client.SceneMapLoading',
    SceneAddSprite = 'Client.SceneAddSprite',
    SceneOnChanges = 'Client.SceneOnChanges',
    SceneDraw = 'Client.SceneDraw',
    SceneRemoveSprite = 'Client.SceneRemoveSprite',

    AddSprite = 'Client.AddSprite',
    RemoveSprite = 'Client.RemoveSprite',
    UpdateSprite = 'Client.UpdateSprite',
    ChangesSprite = 'Client.ChangesSprite',
    WindowResize = 'Client.WindowResize',
    SpriteMove = 'Client.SpriteMove'
}

/**
 * @deprecated
 */
export class PluginSystem extends EventEmitter {
    customHooks: {
        [key: string]: boolean
    } = {}

    customHookExists(name: string): boolean {
        return this.customHooks[name]
    }
    
    private loadPlugins(plugins: Plugin[], shared: any, type: string) {
        if (!plugins) return
        for (let plugin of plugins) {
            if (!plugin) continue
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