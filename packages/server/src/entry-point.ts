import { RpgCommonGame, RpgPlugin, HookServer, loadModules } from '@rpgjs/common'
import { RpgServerEngine } from './server'

export default function(modules, options = {}) {
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

    const serverEngine = new RpgServerEngine(options['io'], gameEngine, { 
        debug: {}, 
        updateRate: 10, 
        stepRate: 60,
        timeoutInterval: 0, 
        countConnections: false,
        ...options
    })
    return serverEngine
}
