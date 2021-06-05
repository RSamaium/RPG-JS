import { RpgCommonGame, HookServer, loadModules, ModuleType } from '@rpgjs/common'
import { RpgServerEngine } from './server'

interface RpgServerEntryPointOptions {
     /** 
     * Represents socket io but you can put something else (which is of the same scheme as socket io)
     * 
     * @prop {SocketIO or other} io
     * @memberof RpgServerEntryPoint
     * */
    io: any,
    /** 
     * It allows you to know where the maps are located. Usually put `__dirname` for the current directory.
     * 
     * ```ts
     * basePath: __dirname
     * ``` 
     * 
     * @prop {string} basePath
     * @memberof RpgServerEntryPoint
     * */
     basePath: string
}

export default function(modules: ModuleType[], options: RpgServerEntryPointOptions) {
    const gameEngine = new RpgCommonGame()

    const relations = {
        onConnected: HookServer.PlayerConnected,
        onInput: HookServer.PlayerInput,
        onJoinMap: HookServer.PlayerJoinMap,
        onLeaveMap: HookServer.PlayerLeaveMap,
        onLevelUp: HookServer.PlayerLevelUp,
        onDead: HookServer.PlayerDead,
        onDisconnected: HookServer.PlayerDisconnected
    }

    loadModules(modules, {
        side: 'server',
        relations: {
            player: relations
        }
    })

    const serverEngine = new RpgServerEngine(options.io, gameEngine, { 
        debug: {}, 
        updateRate: 10, 
        stepRate: 60,
        timeoutInterval: 0, 
        countConnections: false,
        ...options
    })
    return serverEngine
}
