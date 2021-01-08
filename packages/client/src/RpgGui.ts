import { createApp, ref } from 'vue'
import { map } from 'rxjs/operators'

class Gui {

    private renderer
    private gameEngine
    private clientEngine
    private app
    private vm
    private socket
    private gui = {}

    _initalize(clientEngine) {

        this.clientEngine = clientEngine
        this.renderer = clientEngine.renderer
        this.gameEngine = clientEngine.gameEngine

        const self = this
        const { gui } = this.renderer.options
        const selectorGui = this.renderer.guiEl

        this.app = createApp({
            template: `
                <div>
                    <template v-for="(ui, name) in gui">
                        <component :is="name" v-bind="ui.data" v-if="ui.display"></component>
                    </template>  
                </div>
            `,
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
                    rpgSocket: () => this.socket
                }
            }
        })

        for (let ui of gui) {
            this.app.component(ui.name, ui)
            this.gui[ui.name] = {
                data: ui.data,
                display: false
            }
        } 

        this.vm = this.app.mount(selectorGui)
        this.vm.gui = this.gui
        this.renderer.app = this.app
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
        const guiObj = this.get(id)
        if (!guiObj) {
            throw `The GUI named ${id} is non-existent. Please add the component in the gui property of the decorator @RpgClient`
        }
        for (let key in obj) {
            guiObj[key] = obj[key]
        }
        this.vm.gui = Object.assign({}, this.vm.gui)
    }

    get(id) {
        if (typeof id != 'string') {
            id = id.name
        }
        return this.gui[id]
    }

    exists(id): boolean {
        return !!this.get(id)
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