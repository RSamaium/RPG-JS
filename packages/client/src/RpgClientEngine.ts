import { KeyboardControls } from './KeyboardControls'
import Renderer from './Renderer'
import { _initSpritesheet } from './Sprite/Spritesheets'
import { _initSound } from './Sound/Sounds'
import { RpgSprite } from './Sprite/Player'
import { World } from '@rpgjs/sync-client'
import { BehaviorSubject, Subject } from 'rxjs'
import { RpgGui } from './RpgGui'
import { RpgCommonPlayer, PrebuiltGui, PlayerType, Utils } from '@rpgjs/common'
import merge from 'lodash.merge'
import entryPoint from './clientEntryPoint'
import { SnapshotInterpolation, Vault } from '@geckos.io/snapshot-interpolation'

const SI = new SnapshotInterpolation(15) 
const STEP_DELAY_MSEC = 12

declare var __RPGJS_PRODUCTION__: boolean;

type ObjectFixture = {
    object: any,
    paramsChanged: any
}

export default class RpgClientEngine {

    public renderer: any
    public socket: any
    public _options: any
    private _objects: BehaviorSubject<{
        [playerId: string]: ObjectFixture
    }> = new BehaviorSubject({})
    public keyChange: Subject<string> = new Subject()
    private hasBeenDisconnected: boolean = false
    controls: KeyboardControls
    private playerVault = new Vault()
    io
    lastTimestamp
    scheduler

    constructor(private gameEngine, private options) {
        this.renderer = new Renderer(this)
        this.renderer.client = this
        this.renderer.options = {
            selector: '#rpg',
            selectorGui: '#gui',
            canvas: {},
            gui: [],
            spritesheets: [],
            sounds: [],
            ...this._options
        }

        this.io = options.io

       gameEngine._playerClass = this.renderer.options.spriteClass || RpgSprite
       gameEngine.standalone = options.standalone
       gameEngine.clientEngine = this

        _initSpritesheet(this.renderer.options.spritesheets)
        _initSound(this.renderer.options.sounds)

        if (__RPGJS_PRODUCTION__) {
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/service-worker.js')
                })
            }
        }
        else {
            console.log('> RPGJS is in development mode <')
        }

        this.controls = new KeyboardControls(this)
    }

    async start() {
        let renderLoop = (timestamp) => {
            this.lastTimestamp = this.lastTimestamp || timestamp;
            this.renderer.draw(timestamp, timestamp - this.lastTimestamp);
            this.lastTimestamp = timestamp;
            this.step(timestamp, 0)
            window.requestAnimationFrame(renderLoop);
        };
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
                return  Object.values({
                    ...this.getObjects(),
                    ...this.gameEngine.events
                }).map((ev: any) => ev.object)
            }
        })
        window.requestAnimationFrame(renderLoop)
        this._initSocket()
    }

    get objects() {
        return this._objects.asObservable()
    }

    getObjects() {
        return this._objects.value
    }

    getObject(id): ObjectFixture | null {
        const objects = this._objects.value
        const val = objects[id]
        if (!val) return null
        return val
    }

    removeObject(id: any): boolean {
        const logic = this.getObject(id)
        if (logic) {
            const objects = { ...this._objects.value } // clone
            delete objects[id]
            this._objects.next(objects)
            return true
        }
        return false
    }

    updateObject(obj) {
        const {
            playerId: id,
            params,
            localEvent,
            paramsChanged
        } = obj
        let logic
        if (localEvent) {
            logic = this.gameEngine.events[id]
            if (!logic) {
                logic = this.gameEngine.addEvent(RpgCommonPlayer, false)
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
            if (key == 'position' && !localEvent) {
                continue
            }
            logic[key] = params[key]
        }
        if (paramsChanged) {
            if (paramsChanged.teleported) {
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
        return logic
    }

    sendInput(actionName, inputOptions) {
        const inputEvent = { input: actionName, playerId: this.gameEngine.playerId }
        this.gameEngine.processInput(inputEvent, this.gameEngine.playerId)
        this.socket.emit('move', inputEvent)
    }

    serverReconciliation()  {
        const { playerId } = this.gameEngine
        const player = this.gameEngine.world.getObject(playerId)
      
        if (player) {
          const serverSnapshot: any = SI.vault.get()

          if (!serverSnapshot) return
          const playerSnapshot: any = this.playerVault.get(serverSnapshot.time, true)
      
          if (serverSnapshot && playerSnapshot) {
            const serverPos = serverSnapshot.state.filter(s => s.id === playerId)[0]
            // calculate the offset between server and client
            const offsetX = playerSnapshot.state[0].x - serverPos.x
            const offsetY = playerSnapshot.state[0].y - serverPos.y
            const correction = 60

            player.position.x -= offsetX / correction
            player.position.y -= offsetY / correction
          }
        }
      }

    step(t, dt) {
        this.gameEngine.emit('client__preStep')
        const { playerId } = this.gameEngine
        const player = this.gameEngine.world.getObject(playerId)
        if (player) {
            const { x, y } = player.position
            this.playerVault.add(
                SI.snapshot.create([{ id: playerId, x, y }])
            )
            this.serverReconciliation()
        }
        const snapshot = SI.calcInterpolation('x y') 
        if (snapshot) {
            const { state } = snapshot
            state.forEach(s => {
                const { id, x, y } = s
                const player = this.gameEngine.world.getObject(id)
                if (id === this.gameEngine.playerId) return
                player.position.x = x
                player.position.y = y
            })
        }
    }

    _initSocket() {
        this.socket = this.io()

        this.socket.on('connect', () => {
            if (RpgGui.exists(PrebuiltGui.Disconnect)) RpgGui.hide(PrebuiltGui.Disconnect)
            this.onConnect()
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
            this.onConnectError(err)
        })

        this.socket.on('loadScene', ({ name, data }) => {
            this.renderer.loadScene(name, data)
        })
        
        this.socket.on('callMethod', ({ objectId, params, name }) => {
            const scene = this.renderer.getScene()
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
            }
        })

        World.listen(this.socket).value.subscribe((val: { data: any, partial: any, time: number }) => {
            if (!val.data) {
                return
            }
            const snapshot: any = { 
                id: Utils.generateUID(),
                time: val.time,
                state: []
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
                    if (prop == 'users' && this.gameEngine.playerId == key && obj.events) {
                       change('events', {
                           data: obj,
                           partial: paramsChanged,
                           time: val.time
                       }, true)
                    }
                    if (!localEvent) snapshot.state.push({ 
                        id: key,
                        x: obj.position.x,
                        y: obj.position.y,
                        z: obj.position.z
                    })
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
            SI.snapshot.add(snapshot)
        })

        this.socket.on('disconnect', (reason: string) => {
            if (RpgGui.exists(PrebuiltGui.Disconnect)) RpgGui.display(PrebuiltGui.Disconnect)
            this.onDisconnect(reason)
            this.hasBeenDisconnected = true
        })

        RpgGui._setSocket(this.socket)
    }

    onConnect() {}

    onReconnect() {}

    onConnectError(err: any) {}

    onDisconnect(reason: string) {}
}
