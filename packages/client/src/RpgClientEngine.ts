import { ClientEngine } from 'lance-gg'
import Renderer from './Renderer'
import { _initSpritesheet } from './Sprite/Spritesheets'
import { _initSound } from './Sound/Sounds'
import { RpgSprite } from './Sprite/Player'
import { World } from '@rpgjs/sync-client'
import { BehaviorSubject, Subject } from 'rxjs'
import { RpgGui } from './RpgGui'
import { RpgCommonPlayer, PrebuildGui, PlayerType } from '@rpgjs/common'
import merge from 'lodash.merge'
import { Animation } from './Effects/Animation'

export default class RpgClientEngine extends ClientEngine<any> {

    public renderer: any
    public gameEngine: any
    public socket: any
    public _options: any
    private _objects: BehaviorSubject<{
        [playerId: string]: {
            object: any,
            paramsChanged: any
        }
    }> = new BehaviorSubject({})
    public keyChange: Subject<string> = new Subject()

    constructor(gameEngine, options) {
        super(gameEngine, options.io, options, Renderer)

        this.renderer.options = {
            selector: '#rpg-canvas',
            selectorGui: '#gui',
            canvas: {
                width: 816,
                height: 624
            },
            gui: [],
            spritesheets: [],
            sounds: [],
            ...this._options
        }

       gameEngine._playerClass = this.renderer.options.spriteClass || RpgSprite
       gameEngine.standalone = options.standalone
       gameEngine.clientEngine = this

        _initSpritesheet(this.renderer.options.spritesheets)
        _initSound(this.renderer.options.sounds)

        RpgGui._initalize(this)
    }

    get objects() {
        return this._objects.asObservable()
    }

    removeObject(id: any) {
        const logic = this.gameEngine.world.getObject(id)
        if (logic) {
            this.gameEngine.world.removeObject(id)
        }
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
                this.gameEngine.events[id] = logic
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
            if (key == 'position' && !localEvent) continue
            logic[key] = params[key]
        }
        if (paramsChanged) {
            if (paramsChanged.teleported) {
                logic.position.copy(params.position)
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

    _initSocket() {

        this.socket.on('connect', () => {
            if (RpgGui.exists(PrebuildGui.Disconnect)) RpgGui.hide(PrebuildGui.Disconnect)
            this.onConnect()
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
                        animationName: params[1]
                    })
                break
            }
        })

        World.listen(this.socket).value.subscribe((val: { data: any, partial: any }) => {
            if (!val.data) {
                return
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
                           partial: paramsChanged
                       }, true)
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
        })

        this.socket.on('disconnect', (reason: string) => {
            if (RpgGui.exists(PrebuildGui.Disconnect)) RpgGui.display(PrebuildGui.Disconnect)
            this.onDisconnect(reason)
        })

        RpgGui._setSocket(this.socket)
    }

    onConnect() {}

    onReconnect() {}

    onConnectError(err: any) {}

    onDisconnect(reason: string) {}

    async connect() {
         super.connect({})
         this._initSocket()
    }
}
