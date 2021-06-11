import { KeyboardControls } from './KeyboardControls'
import Renderer from './Renderer'
import { _initSpritesheet } from './Sprite/Spritesheets'
import { _initSound } from './Sound/Sounds'
import { RpgSprite } from './Sprite/Player'
import { World } from '@rpgjs/sync-client'
import { BehaviorSubject, Subject } from 'rxjs'
import { RpgGui } from './RpgGui'
import { 
    RpgCommonPlayer, 
    PrebuiltGui, 
    PlayerType, 
    Utils, 
    RpgPlugin, 
    HookClient 
} from '@rpgjs/common'
import merge from 'lodash.merge'
import { SnapshotInterpolation, Vault } from '@geckos.io/snapshot-interpolation'
import { RpgSound } from './Sound/RpgSound'

const SI = new SnapshotInterpolation(60) 

declare var __RPGJS_PRODUCTION__: boolean;

type ObjectFixture = {
    object: any,
    paramsChanged: any
}

export class RpgClientEngine {

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
    private isTeleported: boolean = false
    io
    lastTimestamp
    scheduler

    constructor(private gameEngine, private options) { }

    private async _init() {
        this.renderer = new Renderer(this)
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

        this.io = this.options['io']

       this.gameEngine._playerClass = this.renderer.options.spriteClass || RpgSprite
       this.gameEngine.standalone = this.options['standalone']
       this.gameEngine.renderer = this.renderer
       this.gameEngine.clientEngine = this

        _initSpritesheet(this.renderer.options.spritesheets)
        _initSound(this.renderer.options.sounds)

        if (typeof __RPGJS_PRODUCTION__ != 'undefined' && __RPGJS_PRODUCTION__) {
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
        await this._init()
        let frame = 0
        let renderLoop = (timestamp) => {
            this.lastTimestamp = this.lastTimestamp || timestamp;
            this.renderer.draw(timestamp, timestamp - this.lastTimestamp, frame)
            this.lastTimestamp = timestamp;
            this.step(timestamp, 0)
            frame++
            window.requestAnimationFrame(renderLoop)
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
        RpgPlugin.emit(HookClient.Start)
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

    resetObjects() {
        this._objects.next({})
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
        let teleported = false
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
            if (!localEvent && (key == 'position' || key == 'direction')) {
                continue
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
        if (teleported && id == this.gameEngine.playerId) {
            this.isTeleported = true
            this.playerVault['_vault'] = []
        }
        return logic
    }

    sendInput(actionName: string) {
        const inputEvent = { input: actionName, playerId: this.gameEngine.playerId }
        this.gameEngine.processInput(inputEvent, this.gameEngine.playerId)
        RpgPlugin.emit(HookClient.SendInput, inputEvent)
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
            const playerState = playerSnapshot.state[0]
            if (playerState) {
                const offsetX = playerState.x - serverPos.x
                const offsetY = playerState.y - serverPos.y
                const correction = 60
                player.position.x -= offsetX / correction
                player.position.y -= offsetY / correction
            }   
          }
        }
      }

    step(t, dt) {
        this.gameEngine.emit('client__preStep')
        const { playerId } = this.gameEngine
        const player = this.gameEngine.world.getObject(playerId)
        if (player && this.isTeleported) {
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
                const { id, x, y, direction } = s
                const player = this.gameEngine.world.getObject(id)
                if (player) {
                    if (id === this.gameEngine.playerId) return
                    player.position.x = Math.round(x as number)
                    player.position.y = Math.round(y as number)
                    player.direction = direction
                }
            })
        }
    }

    _initSocket() {
        const { standalone } = this.gameEngine

        if (!standalone) {
            this.socket = this.io()
        }
        else {
            this.socket = this.io
        }

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
                case 'playSound':
                    RpgSound.get(params[0]).play()
                break
            }
        })

        let lastRoomId = ''

        World.listen(this.socket)
            .value
            .subscribe((val: { data: any, partial: any, time: number, roomId: string }) => {

            if (!val.data) {
                return
            }

            if (val.roomId != lastRoomId) {
                this.resetObjects()
                lastRoomId = val.roomId
                this.isTeleported = false
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
                           time: val.time,
                           roomId: val.roomId
                       }, true)
                    }
                    if (!localEvent) snapshot.state.push({ 
                        id: key,
                        x: obj.position.x,
                        y: obj.position.y,
                        z: obj.position.z,
                        direction: obj.direction
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

            const scene = this.renderer.getScene()

            if (scene) {
                scene.update(val)
            }

            SI.snapshot.add(snapshot)
        })

        this.socket.on('disconnect', (reason: string) => {
            if (RpgGui.exists(PrebuiltGui.Disconnect)) RpgGui.display(PrebuiltGui.Disconnect)
            this.onDisconnect(reason)
            this.hasBeenDisconnected = true
        })

        RpgGui._setSocket(this.socket)

        if (standalone) {
            this.socket.connection()
        }
    }

    onConnect() {}

    onReconnect() {}

    onConnectError(err: any) {}

    onDisconnect(reason: string) {}
}
