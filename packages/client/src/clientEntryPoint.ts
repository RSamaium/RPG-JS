import { InjectContext, HookClient, loadModules, ModuleType } from '@rpgjs/common'
import { GameEngineClient } from './GameEngine'
import { RpgClientEngine } from './RpgClientEngine'
import { setInject } from './inject'

interface RpgClientEntryPointOptions {
    /** 
     * Represents socket io client but you can put something else (which is the same schema as socket io)
     * 
     * @prop {SocketIO or other} io
     * @memberof RpgClientEntryPoint
     * */
    io: any
    /** 
     * Canvas Options
     * 
     * * {boolean} [options.transparent=false] - If the render view is transparent, default false
     * * {boolean} [options.autoDensity=false] - Resizes renderer view in CSS pixels to allow for
     *   resolutions other than 1
     * * {boolean} [options.antialias=false] - sets antialias
     * * {number} [options.resolution=1] - The resolution / device pixel ratio of the renderer. The
     *  resolution of the renderer retina would be 2.
     * * {boolean} [options.preserveDrawingBuffer=false] - enables drawing buffer preservation,
     *  enable this if you need to call toDataUrl on the webgl context.
     * * {boolean} [options.clearBeforeRender=true] - This sets if the renderer will clear the canvas or
     *      not before the new render pass.
     * * {number} [options.backgroundColor=0x000000] - The background color of the rendered area
     *  (shown if not transparent).
     * 
     * @prop {object} [canvas]
     * @memberof RpgClientEntryPoint
     * */
     canvas?: {
        transparent?: boolean,
        autoDensity?: boolean,
        antialias?: boolean,
        resolution?: number
        preserveDrawingBuffer?: boolean
        backgroundColor?: number
    }
    /** 
     * The element selector that will display the canvas. By default, `#rpg`
     * 
     * @prop {string} [selector]
     * @memberof RpgClientEntryPoint
     * */
    selector?: string,

    /** 
     * The selector that corresponds to the GUIs. By default, `#gui`
     * If you didn't put a GUI element in the div, an element will be automatically created.
     * 
     * @prop {string} [selectorGui]
     * @memberof RpgClientEntryPoint
     * */
    selectorGui?: string

    /** 
     * The selector that corresponds to the element contains canvas. By default, `#canvas`
     * If you didn't put element in the main div, an element will be automatically created.
     * 
     * @prop {string} [selectorCanvas]
     * @memberof RpgClientEntryPoint
     * */
    selectorCanvas?: string

    standalone?: boolean

    /** 
     * The general configurations of the game. For example, default keyboard keys, cursor noise. This is information that external modules can reuse
     * 
     * @prop {object} [globalConfig]
     * @memberof RpgClientEntryPoint
     * */
    globalConfig?: any

    drawMap?: boolean

    /** 
     * The maximum number of fps for the rendering
     * 
     * @prop {object} [maxFps]
     * @since 3.0.2
     * @memberof RpgClientEntryPoint
     * */
    maxFps?: number

    /** 
     * Put the number of FPS that the server processes. It allows to synchronize the client rendering with the server. The default value is 60
     * 
     * @prop {object} [serverFps]
     * @since 3.0.2
     * @memberof RpgClientEntryPoint
     * */
    serverFps?: number

    envs?: object
}

export default (modules: ModuleType[], options: RpgClientEntryPointOptions): RpgClientEngine => {

    if (!options.globalConfig) options.globalConfig = {}

    options = {
        ...options.globalConfig,
        ...options
    }

    const relations = {
        onInit: HookClient.AddSprite,
        onDestroy: HookClient.RemoveSprite,
        onUpdate: HookClient.UpdateSprite,
        onChanges: HookClient.ChangesSprite,
        onMove: HookClient.SpriteMove
    }

    const relationsMap = {
        onAddSprite: HookClient.SceneAddSprite,
        onRemoveSprite: HookClient.SceneRemoveSprite,
        onBeforeLoading: HookClient.BeforeSceneLoading,
        onAfterLoading: HookClient.AfterSceneLoading,
        onMapLoading: HookClient.SceneMapLoading,
        onChanges: HookClient.SceneOnChanges,
        onDraw: HookClient.SceneDraw
    }

    const relationsEngine = {
        onStart: HookClient.Start,
        onStep: HookClient.Step,
        onConnected: HookClient.Connected,
        onDisconnect: HookClient.Disconnect,
        onConnectError: HookClient.ConnectedError,
        onInput: HookClient.SendInput,
        onWindowResize: HookClient.WindowResize
    }

    loadModules(modules, {
        side: 'client',
        relations: {
            player: relations,
            sceneMap: relationsMap,
            engine: relationsEngine
        }
    })

    const context = new InjectContext()
    setInject(context)

    return context.inject(RpgClientEngine, [options])
}