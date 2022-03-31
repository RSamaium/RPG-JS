import { KeyboardControls } from './KeyboardControls'
import { RpgRenderer } from './Renderer'
import { _initSpritesheet, spritesheets } from './Sprite/Spritesheets'
import { _initSound, sounds } from './Sound/Sounds'
import { World } from '@rpgjs/sync-client'
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs'
import { RpgGui } from './RpgGui'
import { 
    RpgCommonPlayer, 
    PrebuiltGui, 
    PlayerType, 
    Utils, 
    RpgPlugin, 
    HookClient, 
} from '@rpgjs/common'
import merge from 'lodash.merge'
import { RpgSound } from './Sound/RpgSound'
import { SceneMap } from './Scene/Map'
import { GameEngineClient } from './GameEngine'

declare var __RPGJS_PRODUCTION__: boolean;

type ObjectFixture = {
    object: any,
    paramsChanged: any
}

type Tick = {
    timestamp: number
    deltaTime: number
    frame: number
}

type FrameData = {
    time: number,
    data: any
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
    private _objects: BehaviorSubject<{
        [playerId: string]: ObjectFixture
    }> = new BehaviorSubject({})
    private _tick: BehaviorSubject<Tick> = new BehaviorSubject({
        timestamp: -1,
        deltaTime: 0,
        frame: 0
    })
    public keyChange: Subject<string> = new Subject()
    private hasBeenDisconnected: boolean = false
    private isTeleported: boolean = false
    // TODO, public or private
    io
    private lastTimestamp: number = 0
    private frame: number = 0
    private subscriptionWorld: Subscription

    private clientFrames: Map<number, FrameData> = new Map()
    private serverFrames: Map<number, FrameData> = new Map()

    constructor(public gameEngine: GameEngineClient, private options) { 
        this.tick.subscribe(({ timestamp, deltaTime }) => {
            if (timestamp != -1) this.step(timestamp, deltaTime)
        })
    }

    private async _init() {
        this.renderer = new RpgRenderer(this)
        this.renderer.client = this

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
        this.globalConfig = this.options.globalConfig

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
        return this._tick.asObservable()
    }

    /**
     * Adds Spritesheet classes
     *
     * @title Add Spritesheet
     * @method addSpriteSheet(spritesheetClass|spritesheetClass[])
     * @returns {void}
     * @since 3.0.0-beta.3
     * @memberof RpgClientEngine
     */
    addSpriteSheet(spritesheetClass) {
        this.addResource(spritesheetClass, _initSpritesheet)
    }

    /**
     * Adds Sound classes
     *
     * @title Add Sound
     * @method addSpriteSheet(soundClass|soundClass[])
     * @returns {void}
     * @since 3.0.0-beta.3
     * @memberof RpgClientEngine
     */
    addSound(soundClass) {
        this.addResource(soundClass, _initSound)
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
        this.gameEngine.start({
            getObjects: this.getObjects.bind(this),
            getObject: (id) => {
                const obj = this.getObject(id)
                if (!obj) return null
                return obj.object
            },
            removeObject: this.removeObject.bind(this),
            getObjectsOfGroup: () => {
                return {
                    ...this.getObjects(),
                    ...this.gameEngine.events
                }
            }
        })
        if (options.renderLoop) {
            const loop = (timestamp) => {
                this.nextFrame(timestamp)
                window.requestAnimationFrame(loop)
            }
            window.requestAnimationFrame(loop)
        }  
        RpgPlugin.emit(HookClient.Start, this)
            .then((ret: boolean[]) => {
                const hasFalseValue = ret.findIndex(el => el === false) != - 1
                if (!hasFalseValue) this.connection()
            })
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
    nextFrame(timestamp: number) {
        this.lastTimestamp = this.lastTimestamp || timestamp
        this._tick.next({
            timestamp, 
            deltaTime: timestamp - this.lastTimestamp,
            frame: this.frame
        })
        this.lastTimestamp = timestamp
        this.frame++
    }

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
    get objects(): Observable<{ [id: string]: ObjectFixture }> {
        return this._objects.asObservable()
    }

    private getObjects(): { [id: string]: ObjectFixture } {
        return this._objects.value
    }

    private getObject(id): ObjectFixture | null {
        const objects = this._objects.value
        const val = objects[id]
        if (!val) return null
        return val
    }

    private resetObjects() {
        this._objects.next({})
    }

    private removeObject(id: any): boolean {
        const logic = this.getObject(id)
        if (this.gameEngine.events[id]) {
            delete this.gameEngine.events[id]
        }
        if (logic) {
            const objects = { ...this._objects.value } // clone
            delete objects[id]
            this._objects.next(objects)
            return true
        }
        return false
    }

    private updateObject(obj) {
        const {
            playerId: id,
            params,
            localEvent,
            paramsChanged
        } = obj
        const isMe = () => id == this.gameEngine.playerId
        let logic
        let teleported = false
        if (localEvent) {
            logic = this.gameEngine.events[id]
            if (!logic) {
                logic = this.gameEngine.addEvent(RpgCommonPlayer, id)
                this.gameEngine.events[id] = {
                    object: logic
                }
            }
            else {
                logic = logic.object
            }
        }
        else {
            logic = this.gameEngine.world.getObject(id)
        }
        if (!logic) {
            logic = this.gameEngine.addPlayer(RpgCommonPlayer, id)
        }
        logic.prevParamsChanged = Object.assign({}, logic)
        for (let key in params) {
            if (!localEvent && 
                (key == 'position' ||
                (key == 'direction' && paramsChanged && paramsChanged.position))) {
                if (isMe()) continue
            }
            logic[key] = params[key]
        }
        if (paramsChanged) {
            if (paramsChanged.teleported) {
                teleported = true
                logic.position = { ...params.position } // clone
            }
            if (!logic.paramsChanged) logic.paramsChanged = {}
            logic.paramsChanged = merge(paramsChanged, logic.paramsChanged)
        }
        this._objects.next({
            ...this._objects.value,
            ...{
                [id]: {
                    object: logic,
                    paramsChanged
                }
            }
        })
        if (teleported && isMe()) {
            this.isTeleported = true
        }
        return logic
    }

    sendInput(actionName: string) {
        const inputEvent = { input: actionName, playerId: this.gameEngine.playerId }
        const player = this.gameEngine.world.getObject(this.gameEngine.playerId)
        player.pendingMove.push(inputEvent)
        this.gameEngine.processInput(this.gameEngine.playerId)
        this.clientFrames.set(this.frame, {
            data: player.position,
            time: Date.now()
        })
        RpgPlugin.emit(HookClient.SendInput, [this, inputEvent], true)
        
        if (this.socket) {
            this.socket.emit('move', { input: actionName, frame: this.frame })
        }
    }

    private serverReconciliation()  {
        const { playerId } = this.gameEngine
        const player = this.gameEngine.world.getObject(playerId)
        if (player) {
            this.serverFrames.forEach((serverData, frame) => {
                const { data: serverPos, time: serverTime } = serverData
                const client = this.clientFrames.get(frame)
                if (!client || (client && client.data.x != serverPos.x || client.data.y != serverPos.y)) {
                    if (serverPos.x) player.position.x = serverPos.x
                    if (serverPos.y) player.position.y = serverPos.y
                }
                // if (client) {
                //     const { time: clientTime } = client
                //     console.log(serverTime - clientTime)
                // }
                this.serverFrames.delete(frame)
                this.clientFrames.delete(frame)
            })
        }
      }

    private step(t: number, dt: number) {
        this.controls.preStep()
        RpgPlugin.emit(HookClient.Step, [this, t, dt], true)
        this.serverReconciliation()
    }

    /**
     *Connect to the server
     *
     * @title Connect to server
     * @method connection()
     * @returns {void}
     * @memberof RpgClientEngine
     */
    connection() {
        const { standalone } = this.gameEngine

        if (!standalone) {
            this.socket = this.io()
        }
        else {
            this.socket = this.io
        }

        this.socket.on('connect', () => {
            if (RpgGui.exists(PrebuiltGui.Disconnect)) RpgGui.hide(PrebuiltGui.Disconnect)
            RpgPlugin.emit(HookClient.Connected, [this, this.socket], true)
            if (this.hasBeenDisconnected) {
                // Todo
                window.location.reload()
                //entryPoint()
            }
            this.hasBeenDisconnected = false
        })

        this.socket.on('playerJoined', (playerEvent) => {
            this.gameEngine.playerId = playerEvent.playerId
        })

        this.socket.on('connect_error', (err: any) => {
            RpgPlugin.emit(HookClient.ConnectedError, [this, err, this.socket], true)
        })

        this.socket.on('loadScene', ({ name, data }) => {
            this.renderer.loadScene(name, data)
        })

        this.socket.on('changeTile', ({ tiles, x, y }) => {
            const scene = this.renderer.getScene<SceneMap>()
            scene.changeTile(x, y, tiles)
        })
        
        this.socket.on('callMethod', ({ objectId, params, name }) => {
            const scene = this.renderer.getScene<SceneMap>()
            const sprite = scene.getPlayer(objectId)
            switch (name) {
                case 'showAnimation':
                    scene.showAnimation({ 
                        attachTo: sprite,
                        graphic: params[0],
                        animationName: params[1],
                        replaceGraphic: params[2]
                    })
                break
                case 'playSound':
                    RpgSound.get(params[0]).play()
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
                this.resetObjects()
                lastRoomId = val.roomId
                this.isTeleported = false
            }

            const change = (prop, root = val, localEvent = false) => {
                const list = root.data[prop]
                const partial = val.partial[prop]
                for (let key in list) {
                    const obj = list[key]
                    const paramsChanged = partial ? partial[key] : undefined
                    if (obj == null) {
                        this.removeObject(key)
                    }
                    if (!obj) continue
                    obj.type = prop == 'users' ? PlayerType.Player : PlayerType.Event
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
                        if (paramsChanged?.position && partialRoom?.frame) {
                            this.serverFrames.set(partialRoom.frame, {
                                data: paramsChanged.position,
                                time: Date.now()
                            })
                        }
                    }
                    
                    this.updateObject({
                        playerId: key,
                        params: obj,
                        localEvent,
                        paramsChanged
                    })
                }
            }

            change('users')
            change('events')

            if (scene) {
                scene.update(val)
            }
        })

        this.socket.on('disconnect', (reason: string) => {
            if (RpgGui.exists(PrebuiltGui.Disconnect)) RpgGui.display(PrebuiltGui.Disconnect)
            RpgPlugin.emit(HookClient.Disconnect, [this, reason, this.socket], true)
            this.hasBeenDisconnected = true
        })

        RpgGui._setSocket(this.socket)

        if (standalone) {
            this.socket.connection()
        }
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
     * @readonly
     * @memberof RpgClientEngine
     * */
    get scene() {
        return this.renderer.getScene()
    }

    get PIXI() {
        return PIXI
    }

    reset() {
        this.subscriptionWorld.unsubscribe()
        this.world.reset()
        spritesheets.clear()
        sounds.clear()
        PIXI.Loader.shared.reset()
        PIXI.utils.clearTextureCache()
    }
}
