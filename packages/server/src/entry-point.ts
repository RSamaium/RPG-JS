import { RpgCommonGame, HookServer, loadModules, ModuleType, GameSide, RpgPlugin, InjectContext } from '@rpgjs/common'
import { RpgServerEngine } from './server'
import { RpgPlayer } from './Player/Player'
import { RpgMatchMaker } from './MatchMaker'
import { inject, setInject } from './inject'

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

    standalone?: boolean

    /** 
   * The general configurations of the game.
   * 
   * @prop {object} [globalConfig]
   * @memberof RpgServerEntryPoint
   * */
    globalConfig?: any

    workers?: any

    envs?: object
}

export default async function (modules: ModuleType[], options: RpgServerEntryPointOptions): Promise<RpgServerEngine> {
    const context = new InjectContext()
    setInject(context)

    inject(RpgCommonGame, [GameSide.Server])

    if (!options.globalConfig) options.globalConfig = {}

    const relations = {
        onConnected: HookServer.PlayerConnected,
        onInput: HookServer.PlayerInput,
        onJoinMap: HookServer.PlayerJoinMap,
        onLeaveMap: HookServer.PlayerLeaveMap,
        onLevelUp: HookServer.PlayerLevelUp,
        onDead: HookServer.PlayerDead,
        onDisconnected: HookServer.PlayerDisconnected,
        onInShape: HookServer.PlayerInShape,
        onOutShape: HookServer.PlayerOutShape,
        onMove: HookServer.PlayerMove,
        canChangeMap: HookServer.PlayerCanChangeMap
    }

    const relationsEngine = {
        onStart: HookServer.Start,
        onStep: HookServer.Step,
        auth: HookServer.Auth
    }

    const { playerProps } = await loadModules(modules, {
        side: 'server',
        relations: {
            player: relations,
            engine: relationsEngine,
            scalability: {
                onConnected: HookServer.ScalabilityPlayerConnected,
                doChangeServer: HookServer.ScalabilityChangeServer
            }
        }
    }, (mod) => {
        const { scalability } = mod
        if (scalability) {
            const { hooks, stateStore, matchMaker } = scalability
            const matchMakerInstance = new RpgMatchMaker(matchMaker)
            RpgPlugin.on(HookServer.Start, () => {
                return stateStore.connect()
            })
            mod.scalability._hooks = {}
            for (let hookName in hooks) {
                let originalHook = mod.scalability.hooks[hookName]
                mod.scalability._hooks[hookName] = function (player: RpgPlayer) {
                    return originalHook(stateStore, matchMakerInstance, player)
                }
            }
        }
        return mod
    })

    const serverEngine = inject(RpgServerEngine, [
        options.io, {
            debug: {},
            updateRate: 10,
            stepRate: 60,
            timeoutInterval: 0,
            countConnections: false,
            playerProps,
            ...options
        }
    ])
    return serverEngine
}
