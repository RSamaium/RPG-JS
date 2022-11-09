import { KeyboardControls } from './KeyboardControls'
import { RpgRenderer } from './Renderer'
import { _initSpritesheet, spritesheets } from './Sprite/Spritesheets'
import { _initSound, sounds } from './Sound/Sounds'
import { World } from 'simple-room-client'
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs'
import { ajax } from 'rxjs/ajax'
import { RpgGui } from './RpgGui'
import {
    RpgCommonPlayer,
    PrebuiltGui,
    Utils,
    RpgPlugin,
    HookClient,
    RpgCommonMap,
    Scheduler,
    Control,
} from '@rpgjs/common'
import { RpgSound } from './Sound/RpgSound'
import { SceneMap } from './Scene/Map'
import { GameEngineClient } from './GameEngine'
import { Scene } from './Scene/Scene'
import { Spritesheet } from './Sprite/Spritesheet'
import { log } from './Logger'
import { Sound } from './Sound/Sound'
import { constructor, MoveClientMode, ObjectFixtureList, PlayerType, SocketEvents, SocketMethods, Tick } from '@rpgjs/types'

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
    private frame: number = 0
    private subscriptionWorld: Subscription

    private clientFrames: Map<number, FrameData> = new Map()
    private serverFrames: Map<number, FrameData> = new Map()

    private session: string | null = null
    private lastConnection: string = ''
    private lastScene: string = ''
    private matchMakerService: string | (() => MatchMakerResponse) | null = null
    private assetsPath: string = 'assets'
    private serverFps: number = 60
    private scheduler: Scheduler = new Scheduler()

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

    constructor(public gameEngine: GameEngineClient, private options) {
        this.tick.subscribe(({ timestamp, deltaTime }) => {
            if (timestamp != -1) this.step(timestamp, deltaTime)
        })
    }

    private async _init() {
        this.renderer = new RpgRenderer(this)

        const pluginLoadRessource = async (hookName: string, type: string) => {
            const resource = this.options[type] || []
            this.options[type] = [
                ...Utils.arrayFlat(await RpgPlugin.emit(hookName, resource)) || [],
                ...resource
            ]
        }

        await pluginLoadRessource(HookClient.AddSpriteSheet, 'spritesheets')
        await pluginLoadRessource(HookClient.AddGui, 'gui')
        await pluginLoadRessource(HookClient.AddSound, 'sounds')

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
        if (this.globalConfig.assetsPath) this.assetsPath = this.globalConfig.assetsPath
        this.gameEngine.standalone = this.options.standalone
        this.gameEngine.renderer = this.renderer
        this.gameEngine.clientEngine = this

        this.addSpriteSheet(this.renderer.options.spritesheets)
        this.addSound(this.renderer.options.sounds)

        if (typeof __RPGJS_PRODUCTION__ != 'undefined' && __RPGJS_PRODUCTION__) {
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/service-worker.js')
                })
            }
        }

        this.controls = new KeyboardControls(this)
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
        if (source.startsWith('data:')) {
            return source
        }
        return this.assetsPath + '/' + Utils.basename(source)
    }

    /**
     * Starts the client side and connects to the server
     *
     * @title Start Client Engine
     * @method start()
     * @returns {Promise< void >}
     * @memberof RpgClientEngine
     */
    async start(options: { renderLoop: boolean } = {
        renderLoop: true
    }) {
        PIXI.utils.skipHello()
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
                    // todo: change toPromise (RXJS v7+)
                    serverUri = await ajax.getJSON<MatchMakerResponse>(this.matchMakerService as string).toPromise()
                }

            }
            this.connection(serverUri.url ? serverUri.url + ':' + serverUri.port : undefined)
        }
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
                frame: this.frame
            })
        }
    }

    get player(): RpgCommonPlayer | null {
        return this.gameEngine.world.getObject(this.gameEngine.playerId)
    }

    private serverReconciliation(player: RpgCommonPlayer) {
        this.serverFrames.forEach((serverData, frame) => {
            const { data: serverPos, time: serverTime } = serverData
            const client = this.clientFrames.get(frame)
            if (!client || (client && client.data.x != serverPos.x || client.data.y != serverPos.y)) {
                if (serverPos.x) player.position.x = serverPos.x
                if (serverPos.y) player.position.y = serverPos.y
            }
            this.serverFrames.delete(frame)
            this.clientFrames.delete(frame)
        })
    }

    private async step(t: number, dt: number) {
        RpgPlugin.emit(HookClient.Step, [this, t, dt], true)
    }

    async processInput() {
        const player = this.player
        this.controls.preStep()
        if (player) {
            if (player.pendingMove.length > 0) {
                const { inputs: inputEvent } = await this.gameEngine.processInput<RpgCommonPlayer>(this.gameEngine.playerId, this.controls.options).then()
                if (inputEvent.length == 0) return
                this.clientFrames.set(this.frame, {
                    data: player.position,
                    time: Date.now()
                })
                if (this.socket) {
                    this.socket.emit('move', { input: inputEvent, frame: this.frame })
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
    connection(uri?: string) {
        const { standalone } = this.gameEngine

        if (!standalone) {
            this.socket = this.io(uri, {
                auth: {
                    token: this.session
                }
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

        this.socket.on('preLoadScene', (name: string) => {
            if (this.lastScene == name) {
                return
            }
            this.lastScene = name
            this.renderer.transitionScene(name)
        })

        this.socket.on('loadScene', ({ name, data }) => {
            this.renderer.loadScene(name, data)
        })

        this.socket.on('changeServer', ({ url, port }) => {
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

        this.socket.on(SocketEvents.CallMethod, ({ objectId, params, name }) => {
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
        })

        let lastRoomId = ''

        this.subscriptionWorld = World.listen(this.socket)
            .value
            .subscribe((val: { data: any, partial: any, time: number, roomId: string }) => {

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

                const change = (prop, root = val, localEvent = false) => {
                    const list = root.data[prop]
                    const partial = root.partial[prop]
                    for (let key in partial) {
                        const obj = list[key]
                        const paramsChanged = partial ? partial[key] : undefined
                        if (obj == null) {
                            this.gameEngine.removeObjectAndShape(key)
                        }
                        if (!obj) continue
                        const isShape = prop == 'shapes'
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
                                        roomId: val.roomId
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
            this.socket.connection({
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

    get PIXI() {
        return PIXI
    }

    get playerId(): string {
        return this.gameEngine.playerId
    }

    reset() {
        this.subscriptionWorld.unsubscribe()
        this.world.reset()
        spritesheets.clear()
        sounds.clear()
        PIXI.Loader.shared.reset()
        PIXI.utils.clearTextureCache()
        RpgGui.clear()
        RpgCommonMap.bufferClient.clear()
        RpgSound.clear()
    }
}
