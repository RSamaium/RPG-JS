import { ClientEngine, KeyboardControls } from 'lance-gg'
import Vue from 'vue'
import Renderer from './Renderer'
import { _initSpritesheet } from './Sprite/Spritesheets'
import { RpgPlayer } from './Sprite/Player'
import { RpgEvent} from './Sprite/Event'
import { EventEmitter } from '@rpgjs/common'

export default class RpgClientEngine extends ClientEngine<any> {

    public renderer: any
    public gameEngine: any
    public socket: any
    public _options: any
    private vm: any
    private controls: KeyboardControls
    private eventEmitter: EventEmitter = new EventEmitter()

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
            ...this._options
        }

       gameEngine._playerClass = this.renderer.options.playerClass || RpgPlayer
       gameEngine._eventClass = this.renderer.options.eventClass || RpgEvent
       gameEngine.standalone = options.standalone

        _initSpritesheet(this.renderer.options.spritesheets)

        this.controls = new KeyboardControls(this, this.eventEmitter);
        this.controls.bindKey('up', 'up', { repeat: true } )
        this.controls.bindKey('down', 'down', { repeat: true } )
        this.controls.bindKey('left', 'left', { repeat: true } )
        this.controls.bindKey('right', 'right', { repeat: true } )
        this.controls.bindKey('space', 'space')
        this.controls.bindKey('escape', 'escape')
    }

    _initUi() {
        const self = this
        const { gui, selectorGui } = this.renderer.options

        this.vm = new Vue({
            template: `
                <div>
                    <component v-for="ui in gui" :is="ui.name" v-if="ui.display" v-bind="ui.data"></component>
                </div>
            `,
            el: selectorGui,
            data() {
                return {
                    gui
                }
            }
        })

        Vue.prototype.$rpgSocket = this.socket
        Vue.prototype.$rpgStage = this.renderer.stage
        Vue.prototype.$rpgEmitter = this.eventEmitter
        Vue.prototype.$gameEngine = this.gameEngine
        Vue.prototype.$rpgPlayer = (playerId?: string) => {
            return this.gameEngine.world.getObject(playerId || this.gameEngine.playerId)
        }

        Vue.prototype.$rpgGuiClose = function(data?) {
            const guiId = this.$options.name
            self.socket.emit('gui.exit', {
                guiId, 
                data
            })
        }

        function propagateEvent(methodName, components, value) {
            if (!components) {
                return
            }
            for (let component of components) {
                if (component[methodName]) {
                    const ret = component[methodName](...value)
                    if (ret == false) return false
                }
                return propagateEvent(methodName, component.$children, value)
            }
        }

        this.eventEmitter.once('keypress', (data) => {
            return propagateEvent('$rpgKeypress', [this.vm], [data])
        })
        this.eventEmitter.once('player.changeParam', (data) => {
            const player = this.renderer.updateObject(data.playerId, data.params)
            if (player) {
                propagateEvent('$rpgPlayerChanged', [this.vm], [player, data.params])
                if (data.playerId == this.gameEngine.playerId) {
                    propagateEvent('$rpgCurrentPlayerChanged', [this.vm], [player, data.params])
                }
            }
        })
        
        for (let ui of gui) {
            Vue.component(ui.name, ui)
        } 
        
        this.renderer.vm = this.vm
        this.renderer._resize()
    }

    _initSocket() {
        this.onConnect()
        this.socket.on('player.loadScene', ({ name, data }) => {
            this.renderer.loadScene(name, data)
        })
        this.socket.on('positions', (data) => {
            this.renderer.setPlayerPosition(data.id, data)
        });
        this.socket.on('events', (data) => {
            this.renderer.addLocalEvents(data)
        });
        this.socket.on('player.changeParam', (data) => this.eventEmitter.emit('player.changeParam', data))
        this.socket.on('gui.open', ({ guiId, data }) => {
            this.displayGui(guiId, data)
        })
        this.socket.on('gui.exit', (guiId) => {
            this.hideGui(guiId)
        })
        this.socket.on('player.callMethod', ({ objectId, params, name }) => {
            const sprite = this.renderer.getScene().getPlayer(objectId)
            if (sprite[name]) sprite[name](...params)
        })
        this.socket.on('reconnect', () => {
            this.hideGui('rpg-disconnected')
        })
        this.socket.on('disconnect', () => {
            this.displayGui('rpg-disconnected')
            this.onDisconnect()
        })
        this._initUi()
    }

    onConnect() {}

    onDisconnect() {}

    connect() {
        return super.connect({}).then(() => {
            this._initSocket()
        })
    }

    _setGui(id, obj) {
        if (typeof id != 'string') {
            id = id.name
        }
        const index = this.vm.gui.findIndex(gui => gui.name == id)
        if (index == -1) {
            return
        }
        for (let key in obj) {
            this.vm.gui[index][key] = obj[key]
        }
        this.vm.$set(this.vm.gui, index, this.vm.gui[index])
    }

    displayGui(id, data = {}) {
        this._setGui(id, {
            display: true,
            data
        })
    }

    hideGui(id) {
        this._setGui(id, {
            display: false
        })
    }
}
