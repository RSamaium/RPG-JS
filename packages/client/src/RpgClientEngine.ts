import { KeyboardControls } from './KeyboardControls'
import { RpgRenderer } from './Renderer'
import { _initSpritesheet, spritesheets } from './Sprite/Spritesheets'
import { _initSound, sounds } from './Sound/Sounds'
import { World } from 'simple-room-client'
import { BehaviorSubject, Observable, Subject, Subscription, lastValueFrom } from 'rxjs'
import { ajax } from 'rxjs/ajax'
import { RpgGui } from './Gui/Gui'
import {
    RpgCommonPlayer,
    PrebuiltGui,
    Utils,
    RpgPlugin,
    HookClient,
    RpgCommonMap,
    Scheduler,
    Control,
    InjectContext,
} from '@rpgjs/common'
import { RpgSound } from './Sound/RpgSound'
import { SceneMap } from './Scene/Map'
import { GameEngineClient } from './GameEngine'
import { Scene } from './Scene/Scene'
import { Spritesheet } from './Sprite/Spritesheet'
import { log } from './Logger'
import { Sound } from './Sound/Sound'
import { constructor, ObjectFixtureList, PlayerType, SocketEvents, SocketMethods, Tick } from '@rpgjs/types'
import { Assets, utils } from 'pixi.js'
import * as PIXI from 'pixi.js'

const { extractId, isString } = Utils

declare var __RPGJS_PRODUCTION__: boolean;

type FrameData = {
    time: number,
    data: any
}

type MatchMakerResponse = {
    url: string,
    port: string
}

export class RpgClientEngine {

    /** 
     * Get the rendering 
     * 
     * @prop {RpgRenderer} [renderer]
     * @readonly
     * @deprecated Use `inject(RpgRenderer)` instead. Will be removed in v5
     * @memberof RpgClientEngine
     * */
    public renderer: RpgRenderer

    /** 
     * Get the socket
     * 
     * @prop {Socket} [socket]
     * @readonly
     * @memberof RpgClientEngine
     * */
    public socket: any

    /** 
    * retrieve the global configurations assigned at the entry point
    * 
    * @prop {object} [globalConfig]
    * @readonly
    * @memberof RpgClientEngine
    * */
    public globalConfig: any = {}

    /** 
     * Get the class managing the keyboard
     * 
     * @prop {KeyboardControls} [controls]
     * @deprecated Use `inject(KeyboardControls)` instead. Will be removed in v5
     * @readonly
     * @memberof RpgClientEngine
     * */
    public controls: KeyboardControls

    public _options: any

    private _tick: BehaviorSubject<Tick> = new BehaviorSubject({
        timestamp: -1,
        deltaTime: 0,
        frame: 0,
        deltaRatio: 1
    })
    public keyChange: Subject<string> = new Subject()
    public roomJoin: Subject<string> = new Subject()
    private hasBeenDisconnected: boolean = false
    private serverChanging: boolean = false
    private isTeleported: boolean = false
    // TODO, public or private
    io
    private lastTimestamp: number = 0
    private subscriptionWorld: Subscription

    private clientFrames: Map<number, FrameData> = new Map()
    private serverFrames: Map<number, FrameData> = new Map()

    private session: string | null = null
    private lastConnection: string = ''
    private lastScene: string = ''
    private matchMakerService: string | (() => MatchMakerResponse) | null = null
    private serverFps: number = 60
    private scheduler: Scheduler = new Scheduler()
    private _serverUrl: string = ''
    /**
     * * @deprecated Use `inject(GameEngineClient)` instead. Will be removed in v5
     */
    public gameEngine = this.context.inject(GameEngineClient)

    /**
     * Read objects synchronized with the server
     *
     * @prop {Observable< {
            [id: string]: {
                object: any,
                paramsChanged: any
            }
      } >} [objects]
     * @readonly
     * @memberof RpgClientEngine
     */
    objects: Observable<ObjectFixtureList> = this.gameEngine.objects

    envs?: object = {}

    constructor(private context: InjectContext, private options) {
        this.envs = options.envs || {}
        this.tick.subscribe(({ timestamp, deltaTime }) => {
            if (timestamp != -1) this.step(timestamp, deltaTime)
        })
    }

    private async _init() {
        this.renderer = this.context.inject(RpgRenderer)

        const pluginLoadResource = async (hookName: string, type: string) => {
            const resource = this.options[type] || []
            this.options[type] = [
                ...Utils.arrayFlat(await RpgPlugin.emit(hookName, resource)) || [],
                ...resource
            ]
        }

        await pluginLoadResource(HookClient.AddSpriteSheet, 'spritesheets')
        await pluginLoadResource(HookClient.AddGui, 'gui')
        await pluginLoadResource(HookClient.AddSound, 'sounds')

        this.renderer.options = {
            selector: '#rpg',
            selectorCanvas: '#canvas',
            selectorGui: '#gui',
            canvas: {},
            gui: [],
            spritesheets: [],
            sounds: [],
            ...this.options
        }

        this.io = this.options.io
        if (this.options.serverFps) this.serverFps = this.options.serverFps
        this.globalConfig = this.options.globalConfig
        this.gameEngine.standalone = this.options.standalone
        this.gameEngine.renderer = this.renderer
        this.gameEngine.clientEngine = this

        this.addSpriteSheet(this.renderer.options.spritesheets);

        (this.renderer.options.sounds || []).forEach(sound => {
            const id: any = isString(sound) ? extractId(sound) : undefined
            this.addSound(sound, id)
        })

        // deprecated
        if (typeof __RPGJS_PRODUCTION__ != 'undefined' && __RPGJS_PRODUCTION__) {
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/service-worker.js')
                })
            }
        }

        this.controls = this.context.inject(KeyboardControls)
    }

    private addResource(resourceClass, cb) {
        let array = resourceClass
        if (!Utils.isArray(resourceClass)) {
            array = [resourceClass]
        }
        cb(array, this)
    }

    /** 
     * Listen to each frame
     * 
     * @prop {Observable<{ timestamp: number, deltaTime: number, frame: number }>} tick
     * @readonly
     * @since 3.0.0-beta.5
     * @memberof RpgClientEngine
     * @example
     * 
     * ```ts
     * client.tick.subscribe(({ timestamp, deltaTime, frame }) => {
     * 
     * })
     * ```
     * */
    get tick(): Observable<Tick> {
        return this.scheduler.tick as any
    }

    /**
     * Adds Spritesheet classes
     *
     * @title Add Spritesheet
     * @method addSpriteSheet(spritesheetClass|spritesheetClass[])
     * @param { Class|Class[] } spritesheetClass
     * @method addSpriteSheet(url,id)
     * @param {string} url Define the url of the resource
     * @param {string} id Define a resource identifier
     * @returns {Class}
     * @since 3.0.0-beta.3
     * @memberof RpgClientEngine
     */
    addSpriteSheet(spritesheetClass: constructor<any>)
    addSpriteSheet(url: string, id: string)
    addSpriteSheet<T = any>(spritesheetClass: constructor<T> | string, id?: string): constructor<T> {
        if (typeof spritesheetClass === 'string') {
            if (!id) {
                throw log('Please, specify the resource ID (second parameter)')
            }
            @Spritesheet({
                id,
                image: this.getResourceUrl(spritesheetClass)
            })
            class AutoSpritesheet { }
            spritesheetClass = AutoSpritesheet as any
        }
        this.addResource(spritesheetClass, _initSpritesheet)
        return spritesheetClass as any
    }

    /**
     * Adds Sound classes
     *
     * @title Add Sound
     * @method addSound(soundClass|soundClass[])
     * @param { Class|Class[] } soundClass
     * @method addSound(url,id)
     * @param {string} url Define the url of the resource
     * @param {string} id Define a resource identifier
     * @returns {Class}
     * @since 3.0.0-beta.3
     * @memberof RpgClientEngine
     */
    addSound(soundClass: constructor<any>)
    addSound(url: string, id: string)
    addSound<T = any>(soundClass: constructor<T> | string, id?: string): constructor<T> {
        if (typeof soundClass === 'string') {
            if (!id) {
                throw log('Please, specify the resource ID (second parameter)')
            }
            @Sound({
                id,
                sound: this.getResourceUrl(soundClass)
            })
            class AutoSound { }
            soundClass = AutoSound as any
        }
        this.addResource(soundClass, _initSound)
        return soundClass as any
    }

    getResourceUrl(source: string): string {
        // @ts-ignore
        if (window.urlCache && window.urlCache[source]) {
            // @ts-ignore
            return window.urlCache[source]
        }

        if (source.startsWith('data:')) {
            return source
        }

        // @ts-ignore
        const staticDir = this.envs.VITE_BUILT

        if (staticDir) {
            return this.assetsPath + '/' + Utils.basename(source)
        }

        return source
    }

    /**
     * Starts the client side and connects to the server
     *
     * @title Start Client Engine
     * @method start()
     * @returns {Promise< RpgClientEngine >}
     * @memberof RpgClientEngine
     */
    async start(options: { renderLoop: boolean } = {
        renderLoop: true
    }): Promise<RpgClientEngine> {
        await this._init()
        await this.renderer.init()
        const { maxFps } = this.options

        if (options.renderLoop) {
            this.scheduler.start({
                maxFps
            })
            // The processing is outside the rendering loop because if the FPS are lower (or higher) then the sending to the server would be slower or faster. Here it is constant
            setInterval(() => {
                this.processInput()
            }, Utils.fps2ms(this.serverFps))
        }
        const ret: boolean[] = await RpgPlugin.emit(HookClient.Start, this)
        this.matchMakerService = this.options.globalConfig.matchMakerService
        const hasFalseValue = ret.findIndex(el => el === false) != - 1
        if (!hasFalseValue) {
            let serverUri = {} as MatchMakerResponse
            if (this.matchMakerService) {
                if (Utils.isFunction(this.matchMakerService)) {
                    serverUri = (this.matchMakerService as Function)()
                }
                else {
                    serverUri = await lastValueFrom(ajax.getJSON<MatchMakerResponse>(this.matchMakerService as string))
                }

            }
            // @ts-ignore
            const envUrl = this.envs.VITE_SERVER_URL
            await this.connection(
                serverUri.url ? serverUri.url + ':' + serverUri.port :
                    envUrl ? envUrl : undefined
            )
        }
        return this
    }

    /**
     * Display the next frame. Useful for unit tests
     *
     * @title Next Frame
     * @since 3.0.0-beta.5
     * @param {number} timestamp Indicate the timestamp of the frame
     * @method nextFrame()
     * @memberof RpgClientEngine
     */
    nextFrame(timestamp: number): void {
        this.scheduler.nextTick(timestamp)
    }

    async sendInput(actionName: string | Control) {
        const player = this.player
        if (!player) return
        if (player.canMove) {
            player.pendingMove.push({
                input: actionName,
                frame: this.scheduler.frame
            })
        }
    }

    get player(): RpgCommonPlayer | null {
        return this.gameEngine.world.getObject(this.gameEngine.playerId)
    }

    private serverReconciliation(player: RpgCommonPlayer) {
        let garbage: number[] = []
        this.serverFrames.forEach((serverData, frame) => {
            const { data: serverPos, time: serverTime } = serverData
            const client = this.clientFrames.get(frame)
            if (!client || (client && client.data.x != serverPos.x || client.data.y != serverPos.y)) {
                if (serverPos.x) player.position.x = serverPos.x
                if (serverPos.y) player.position.y = serverPos.y
            }
            player.position.z = serverPos.z
            garbage.push(frame)
        })
        garbage.forEach(frame => {
            this.serverFrames.delete(frame)
            this.clientFrames.delete(frame)
        })
        garbage = []
    }

    private async step(t: number, dt: number) {
        RpgPlugin.emit(HookClient.Step, [this, t, dt], true)
    }

    async processInput() {
        const player = this.player
        this.controls.preStep()
        if (player) {
            if (player.pendingMove.length > 0) {
                const { inputs: inputEvent } = await this.gameEngine.processInput<RpgCommonPlayer>(this.gameEngine.playerId, this.controls.options)
                if (inputEvent.length == 0) return
                const frame = Date.now()
                this.clientFrames.set(frame, {
                    data: player.position.copy(),
                    time: frame
                })
                if (this.socket) {
                    this.socket.emit('move', { input: inputEvent, frame })
                }
                RpgPlugin.emit(HookClient.SendInput, [this, inputEvent], true)
            }
            if (player.canMove) this.serverReconciliation(player)
        }
    }

    /**
     *Connect to the server
     *
     * @title Connect to server
     * @method connection()
     * @returns {void}
     * @memberof RpgClientEngine
     */
    async connection(uri?: string) {
        const { standalone } = this.gameEngine
        const { globalConfig } = this

        this._serverUrl = uri || ''

        if (!standalone) {
            this.socket = this.io(uri, {
                auth: {
                    token: this.session
                },
                ...(globalConfig.socketIoClient || {})
            })
        }
        else {
            this.socket = this.io
        }

        this.socket.on('connect', () => {
            if (RpgGui.exists(PrebuiltGui.Disconnect)) RpgGui.hide(PrebuiltGui.Disconnect)
            RpgPlugin.emit(HookClient.Connected, [this, this.socket], true)
            this.hasBeenDisconnected = false
        })

        this.socket.on('playerJoined', (playerEvent) => {
            this.gameEngine.playerId = playerEvent.playerId
            this.session = playerEvent.session
        })

        this.socket.on('connect_error', (err: any) => {
            RpgPlugin.emit(HookClient.ConnectedError, [this, err, this.socket], true)
        })

        this.socket.on('preLoadScene', ({ id, reconnect }: { id: string, reconnect?: boolean }) => {
            if (this.lastScene == id) {
                return
            }
            this.lastScene = id
            this.renderer.transitionScene(id)
            if (reconnect) {
                this.roomJoin.next('')
                this.roomJoin.complete()
            }
        })

        this.socket.on(SocketEvents.GameReload, () => {
            window.location.reload()
        })

        this.socket.on(SocketEvents.LoadScene, ({ name, data }) => {
            this.renderer.loadScene(name, data)
        })

        this.socket.on(SocketEvents.ChangeServer, async ({ url, port }) => {
            const connection = url + ':' + port
            if (this.lastConnection == connection) {
                return
            }
            if (this.subscriptionWorld) {
                this.subscriptionWorld.unsubscribe()
            }
            this.lastConnection = connection
            this.serverChanging = true
            this.socket.disconnect()
            this.connection(connection)
        })

        this.socket.on('changeTile', ({ tiles, x, y }) => {
            const scene = this.renderer.getScene<SceneMap>()
            scene?.changeTile(x, y, tiles)
        })

        const callMethod = ({ objectId, params, name }) => {
            const scene = this.renderer.getScene<SceneMap>()
            const sprite = scene?.getPlayer(objectId)
            if (!sprite) return
            switch (name) {
                case SocketMethods.ShowAnimation:
                    scene?.showAnimation({
                        attachTo: sprite,
                        graphic: params[0],
                        animationName: params[1],
                        replaceGraphic: params[2]
                    })
                    break
                case SocketMethods.CameraFollow:
                    const [spriteId, options] = params
                    scene?.cameraFollowSprite(spriteId, options)
                    break
                case SocketMethods.PlaySound:
                    RpgSound.play(params[0])
                    break
                case SocketMethods.ModeMove:
                    const player = this.player
                    const { checkCollision } = params[0]
                    if (player) {
                        player.checkCollision = checkCollision
                    }
                    break
            }
        }

        this.socket.on(SocketEvents.CallMethod, callMethod)

        let lastRoomId = ''

        this.subscriptionWorld = World.listen(this.socket)
            .value
            .subscribe(async (val: { data: any, partial: any, time: number, roomId: string, resetProps: string[] }) => {
                const scene = this.renderer.getScene<SceneMap>()

                if (!val.data) {
                    return
                }

                const partialRoom = val.partial

                if (val.roomId != lastRoomId) {
                    this.clientFrames.clear()
                    this.serverFrames.clear()
                    this.gameEngine.resetObjects()
                    lastRoomId = val.roomId
                    this.isTeleported = false
                }

                const objectsChanged = {}

                const callAction = (objectId: string, paramsChanged) => {
                    if (paramsChanged && SocketEvents.CallMethod in paramsChanged) {
                        // Force rendering on the map (display events) and then perform actions on it (animation, etc.).
                        this.renderer.draw(Date.now(), 1, 1, 1)
                        callMethod({
                            objectId,
                            ...paramsChanged[SocketEvents.CallMethod]
                        })
                    }
                }

                const change = (prop, root = val, localEvent = false) => {
                    const list = root.data[prop]
                    const partial = root.partial[prop]
                    const isShape = prop == 'shapes'
                    if (!partial) {
                        return
                    }
                    if (val.resetProps.indexOf(prop) != -1) {
                        const objects = isShape ? this.gameEngine.getShapes() : this.gameEngine.getObjects()
                        for (let key in objects) {
                            const obj = objects[key]
                            if (obj) {
                                this.gameEngine.removeObjectAndShape(key)
                            }
                        }
                    }
                    for (let key in partial) {
                        const obj = list[key]
                        const paramsChanged = partial ? partial[key] : undefined

                        if (obj == null || obj.deleted) {
                            // perform actions on the sprite before deleting it
                            callAction(key, paramsChanged)
                            this.gameEngine.removeObjectAndShape(key)
                            continue
                        }

                        if (!obj) continue

                        if (!isShape) {
                            obj.type = {
                                users: PlayerType.Player,
                                events: PlayerType.Event
                            }[prop]
                        }
                        if (prop == 'users' && this.gameEngine.playerId == key) {
                            if (obj.events) {
                                const nbEvents = Object.values(obj.events)
                                if (nbEvents.length == 0) {
                                    this.gameEngine.events = {}
                                }
                                else {
                                    change('events', {
                                        data: obj,
                                        partial: paramsChanged,
                                        time: val.time,
                                        roomId: val.roomId,
                                        resetProps: val.resetProps
                                    }, true)
                                }
                            }
                            if (partialRoom?.pos && partialRoom?.frame !== undefined) {
                                this.serverFrames.set(partialRoom.frame, {
                                    data: partialRoom.pos,
                                    time: Date.now()
                                })
                            }
                        }
                        objectsChanged[key] = this.gameEngine.updateObject({
                            playerId: key,
                            params: obj,
                            localEvent,
                            paramsChanged,
                            isShape
                        })

                        // perform actions on the sprite after creation/update
                        callAction(key, paramsChanged)
                    }
                }

                if (partialRoom.join) {
                    this.roomJoin.next(partialRoom)
                    this.roomJoin.complete()
                }

                change('users')
                change('events')
                change('shapes')

                this.gameEngine.setObjectsChanged(objectsChanged)

                if (scene) {
                    scene.update(val)
                }
            })

        this.socket.on('disconnect', (reason: string) => {
            if (this.serverChanging) {
                return
            }
            if (RpgGui.exists(PrebuiltGui.Disconnect)) RpgGui.display(PrebuiltGui.Disconnect)
            RpgPlugin.emit(HookClient.Disconnect, [this, reason, this.socket], true)
            this.hasBeenDisconnected = true
        })

        RpgGui._setSocket(this.socket)

        if (standalone) {
            await this.socket.connection({
                auth: {
                    token: this.session
                }
            })
        }

        this.serverChanging = false
    }

    get world(): any {
        return World
    }

    // shortcuts

    /** 
    * VueJS Application instance
    * 
    * [https://v3.vuejs.org/api/application-api.html](https://v3.vuejs.org/api/application-api.html)
    * 
    * @prop {Vue} [vueApp]
    * @readonly
    * @memberof RpgClientEngine
    * */
    get vueApp() {
        return this.renderer.app
    }

    /** 
     * VueJS Parent component instance
     * 
     * [https://v3.vuejs.org/api/instance-properties.html](https://v3.vuejs.org/api/instance-properties.html)
     * 
     * @prop {Vue Instance} [vueInstance]
     * @readonly
     * @memberof RpgClientEngine
     * */
    get vueInstance() {
        return this.renderer.vm
    }

    /** 
     * retrieves the current scene (SceneMap if you are on a map)
     * 
     * @prop {RpgScene} [scene]
     * @deprecated
     * @readonly
     * @memberof RpgClientEngine
     * */
    get scene() {
        return this.renderer.getScene()
    }

    /**
     * retrieves the current scene (SceneMap if you are on a map)
     *
     * @title Connect to server
     * @method getScene()
     * @returns {RpgScene}
     * @memberof RpgClientEngine
     */
    getScene<T = Scene>(): T | null {
        return this.renderer.getScene<T>()
    }

    /**
     * get PIXI class
     * @prop {PIXI} [PIXI]
     * @readonly
     * @memberof RpgClientEngine
     */
    get PIXI() {
        return PIXI
    }

    /**
     * get player id of the current player
     * @prop {string} [playerId]
     * @readonly
     * @memberof RpgClientEngine
     */
    get playerId(): string {
        return this.gameEngine.playerId
    }

    /**
     * Finds the game mode from the environment variables sent by the compiler.
     * Can be used in menus to display options according to type
     * 
     * @title Game Type
     * @prop {string|undefined} [gameType] mmorpg | rpg or undefined if environment variable not found
     * @readonly
     * @memberof RpgClientEngine
     * @since 4.0.0
     */
    get gameType(): 'mmorpg' | 'rpg' | undefined {
        return this.envs?.['VITE_RPG_TYPE']
    }

    /**
     * Find out if the game is in production or not, from the environment variables sent by the compiler.
     * 
     * @title Game is dev mode
     * @prop {boolean} [isDev]
     * @readonly
     * @memberof RpgClientEngine
     * @since 4.0.0
     */
    get isDev(): boolean {
        return !this.envs?.['VITE_BUILT']
    }

    /**
     * Get the server url. This is the url for the websocket
     * 
     * To customize the URL, use the `matchMakerService` configuration
     * 
     * @title Server URL
     * @prop {string} [serverUrl] If empty string, server url is same as client url
     * @readonly
     * @memberof RpgClientEngine
     * @since 4.0.0
     */
    get serverUrl(): string {
        if (!this._serverUrl.startsWith('http')) {
            return 'http://' + this._serverUrl
        }
        return this._serverUrl
    }

    get assetsPath(): string {
        return this.envs?.['VITE_ASSETS_PATH'] || 'assets'
    }

    get module() {
        return RpgPlugin
    }

    reset() {
        this.subscriptionWorld.unsubscribe()
        this.world.reset()
        spritesheets.clear()
        sounds.clear()
        Assets.reset()
        utils.clearTextureCache()
        for (let textureUrl in utils.BaseTextureCache) {
            delete utils.BaseTextureCache[textureUrl]
        }
        for (let textureUrl in utils.TextureCache) {
            delete utils.TextureCache[textureUrl]
        }
        RpgGui.clear()
        RpgCommonMap.bufferClient.clear()
        RpgSound.clear()
    }
}
