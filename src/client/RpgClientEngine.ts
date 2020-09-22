import { ClientEngine, KeyboardControls } from 'lance-gg'
import Vue from 'vue'
import Renderer from './Renderer'
import { _initSpritesheet } from './Sprite/Spritesheets'
import { RpgPlayer } from './Sprite/Player'
import { RpgEvent} from './Sprite/Event'

export default class RpgClientEngine extends ClientEngine<any> {

    public renderer: any
    public socket: any
    public _options: any
    private vm: any
    private controls: KeyboardControls

    constructor(gameEngine, options) {
        super(gameEngine, options, Renderer)

        this.renderer.options = {
            selector: '#rpg-canvas',
            selectorGui: '#gui',
            canvas: {
                width: 600,
                height: 600
            },
            gui: [],
            spritesheets: [],
            ...this._options
        }

       gameEngine._playerClass = this.renderer.options.playerClass || RpgPlayer
       gameEngine._eventClass = this.renderer.options.eventClass || RpgEvent

        this._initUi()
        _initSpritesheet(this.renderer.options.spritesheets)

        this.controls = new KeyboardControls(this);
        this.controls.bindKey('up', 'up', { repeat: true } )
        this.controls.bindKey('down', 'down', { repeat: true } )
        this.controls.bindKey('left', 'left', { repeat: true } )
        this.controls.bindKey('right', 'right', { repeat: true } )
        this.controls.bindKey('space', 'space')
    }

    _initUi() {
        const { gui, selectorGui } = this.renderer.options
        for (let ui of gui) {
            Vue.component(ui.name, ui)
        }
        this.vm = new Vue({
            template: `
                <div>
                    <div v-for="ui in gui">
                        <component :is="ui.name" v-if="ui.display" v-bind="ui.data"></component>
                    </div>
                </div>
            `,
            el: selectorGui,
            data() {
                return {
                    gui
                }
            }
        })
    }

    /*connect() {
        this['socket'] = clientIo.connection()

        this['networkMonitor'].registerClient(this);

        this['socket'].on('playerJoined', (playerData) => {
            this['gameEngine'].playerId = playerData.playerId;
            this['messageIndex'] = Number(this['gameEngine'].playerId) * 10000;
        });

        this['socket'].on('worldUpdate', (worldData) => {
            this['inboundMessages'].push(worldData);
        });

        this['socket'].on('roomUpdate', (roomData) => {
            this['gameEngine'].emit('client__roomUpdate', roomData);
        });

        this['_initSocket']()

        return Promise.resolve()
    }*/

    _initSocket() {
        this.onConnect()
        this.socket.on('loadScene', ({ name, data }) => {
            this.renderer.loadScene(name, data)
        })
        this.socket.on('positions', (data) => {
            this.renderer.setPlayerPosition(data.id, data)
        });
        this.socket.on('events', (data) => {
            this.renderer.addLocalEvents(data)
        });
        this.socket.on('changeParam', (data) => {
            if (data.type == 'event') {
                this.renderer.updateEvent(data.playerId, data.params)
            }
        })
        this.socket.on('disconnect', () => {
            this.onDisconnect()
        })
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
