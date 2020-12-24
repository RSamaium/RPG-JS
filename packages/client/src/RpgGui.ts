import Vue from 'vue'
import { map } from 'rxjs/operators'

class Gui {

    private renderer
    private gameEngine
    private clientEngine
    private vm
    private socket

    _initalize(clientEngine) {

        this.clientEngine = clientEngine
        this.renderer = clientEngine.renderer
        this.gameEngine = clientEngine.gameEngine

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
            },
            provide: () => {
                return {
                    rpgScene: this.renderer.getScene.bind(this.renderer),
                    rpgStage: this.renderer.stage,
                    rpgObjects: this.clientEngine.objects,
                    rpgCurrentPlayer: this.clientEngine.objects
                        .pipe(
                            map((objects: any) => objects[this.gameEngine.playerId])
                        ),
                    rpgGameEngine: this.gameEngine,
                    rpgGuiClose: function(name: string, data?) {
                        const guiId = name || this.$options.name
                        self.socket.emit('gui.exit', {
                            guiId, 
                            data
                        })
                    },
                    rpgKeypress: this.clientEngine.keyChange,
                    rpgSocket: this.socket
                }
            }
        })

        Vue.prototype.$rpgScene = this.renderer.getScene.bind(this.renderer)
       // Vue.prototype.$rpgEmitter = this.eventEmitter
        /*this.eventEmitter.once('keypress', (data) => {
            return this.propagateEvent('$rpgKeypress', [this.vm], [data])
        })*/

        for (let ui of gui) {
            Vue.component(ui.name, ui)
        } 
        
        this.renderer.vm = this.vm
    }

    _setSocket(socket) {
        this.socket = socket
        this.socket.on('gui.open', ({ guiId, data }) => {
            this.display(guiId, data)
        })
        this.socket.on('gui.exit', (guiId) => {
            this.hide(guiId)
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

    display(id, data = {}) {
        this._setGui(id, {
            display: true,
            data
        })
    }

    hide(id) {
        this._setGui(id, {
            display: false
        })
    }
}

export const RpgGui = new Gui()