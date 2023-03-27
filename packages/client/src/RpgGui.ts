import type { App, ComponentPublicInstance } from 'vue'
import { RpgCommonPlayer } from '@rpgjs/common'
import { map } from 'rxjs'
import { RpgSound } from './Sound/RpgSound'
import { RpgClientEngine, RpgResource } from './index'
import { RpgRenderer } from './Renderer'
import { GameEngineClient } from './GameEngine'
import { SceneMap } from './Scene/Map'

interface GuiOptions {
    data: any,
    attachToSprite: boolean
    display: boolean,
    name: string
}

interface GuiList {
    [guiName: string]: GuiOptions
}

interface VueInstance extends ComponentPublicInstance {
    gui: GuiList,
    tooltips: RpgCommonPlayer[]
}

class Gui {
    private renderer: RpgRenderer
    private gameEngine: GameEngineClient
    private clientEngine: RpgClientEngine
    private app: App
    private vm: VueInstance
    private socket
    private gui: GuiList = {}

     /** @internal */
    _initalize(clientEngine: RpgClientEngine) {

        this.clientEngine = clientEngine
        this.renderer = clientEngine.renderer
        this.gameEngine = clientEngine.gameEngine

        const self = this
        const { gui } = this.renderer.options
        const selectorGui = this.renderer.guiEl

        const obj = {
           /* template: `
                <div 
                    @pointerdown="propagate('pointerdown', $event)"
                    @pointermove="propagate('pointermove', $event)"
                    @pointerleave="propagate('pointerleave', $event)"
                    @pointerover="propagate('pointerover', $event)"
                    @pointercancel="propagate('pointercancel', $event)"
                    @pointerup="propagate('pointerup', $event)"
                >
                    <template v-for="ui in fixedGui">
                        <component :is="ui.name" v-bind="ui.data" v-if="ui.display"></component>
                    </template>
                    <div id="tooltips" style="position: absolute; top: 0; left: 0;">
                        <template v-for="ui in attachedGui">
                            <template v-if="ui.display">
                                <div v-for="tooltip of tooltipFilter(tooltips, ui)" :style="tooltipPosition(tooltip.position)">
                                    <component :is="ui.name" v-bind="{ ...ui.data, spriteData: tooltip }" :ref="ui.name"></component>
                                </div>
                            </template>
                        </template>
                    </div>
                </div>
            `,*/
            render: null,
            data() {
                return {
                    gui,
                    tooltips: []
                }
            },
            provide: () => {
                return {
                    /** 
                     * Recovery of the current scene
                     * 
                     * ```js
                     * export default {
                     *      inject: ['rpgScene'],
                     *      mounted() {
                     *          const scene = this.rpgScene()
                     *          scene.stopInputs()
                     *      }
                     * }
                     * ``` 
                     * 
                     * @prop {Function returns RpgScene} [rpgScene]
                     * @memberof VueInject
                     * */
                    rpgScene: this.renderer.getScene.bind(this.renderer),

                     /** 
                     * Retrieve the main container of the game
                     * 
                     * ```js
                     * export default {
                     *      inject: ['rpgStage'],
                     *      mounted() {
                     *          const blur = new PIXI.filters.BlurFilter()
                                this.rpgStage.filters = [blur]
                     *      }
                     * }
                     * ``` 
                     * 
                     * @prop {PIXI.Container} [rpgStage]
                     * @memberof VueInject
                     * */
                    rpgStage: this.renderer.stage,

                    /** 
                     * Listen to all the objects present in the room (events and players)
                     * 
                     * ```js
                     * export default {
                     *      inject: ['rpgObjects'],
                     *      mounted() {
                     *          this.obs = this.rpgObjects.subscribe((objects) => {
                     *              for (let id in objects) {
                     *                  const obj = objects[id]
                     *                  console.log(obj.object, obj.paramsChanged)
                     *              }
                     *          })
                     *      },
                     *      unmounted() {
                     *          this.obs.unsubscribe()
                     *      }
                     * }
                     * ``` 
                     * 
                     * > remember to unsubscribe for memory leaks
                     * 
                     * It is an observable that returns an object: 
                     * 
                     * * the key is the object identifier
                     * * The value is an object comprising:
                     *      * `object`: The entire object
                     *      * `paramsChanged`: Only the representation of the properties that have been changed on this object
                     * 
                     * @prop {Observable<{ [objectId]: { object: object, paramsChanged: object } }>} [rpgObjects]
                     * @memberof VueInject
                     * */
                    rpgObjects: this.clientEngine.objects,

                    /** 
                     * Recovers and listens to the current player
                     * 
                     * ```js
                     * export default {
                     *      inject: ['rpgCurrentPlayer'],
                     *      mounted() {
                     *          this.obs = this.rpgCurrentPlayer.subscribe((obj) => {
                     *              console.log(obj.object, obj.paramsChanged)
                     *          })
                     *      },
                     *      unmounted() {
                     *          this.obs.unsubscribe()
                     *      }
                     * }
                     * ``` 
                     * 
                     * * `object`: The whole player
                     * * `paramsChanged`: Only the representation of the properties that have been changed on this player
                     * 
                     * @prop {Observable<{ object: object, paramsChanged: object }>} [rpgCurrentPlayer]
                     * @memberof VueInject
                     * */
                    rpgCurrentPlayer: this.clientEngine.objects
                        .pipe(
                            map((objects: any) => objects[this.gameEngine.playerId])
                        ),
                    rpgGameEngine: this.gameEngine,

                    /** 
                     * Tell the server to close the GUI. 
                     * 
                     * It is a function with 2 parameters:
                     * * `name`: The name of the component
                     * * `data`: The data you want to pass to the server
                     * 
                     * ```js
                     * export default {
                     *      inject: ['rpgGuiClose'],
                     *      methods: {
                     *          close() {
                     *              this.rpgGuiClose('gui-name', {
                     *                  amount: 1000
                     *              })
                     *          }
                     *      }
                     * }
                     * ``` 
                     * 
                     * @prop {Function(name, data)} [rpgGuiClose]
                     * @memberof VueInject
                     * */
                    rpgGuiClose(name: string, data?) {
                        const guiId = name || this.$options.name
                        self.socket.emit('gui.exit', {
                            guiId, 
                            data
                        })
                    },

                    /** 
                     * Perform an interaction with the open GUI
                     * 
                     * It is a function with 2 parameters:
                     * * `guiId`: The name of the component/Gui
                     * * `name`: The name of the interaction (defined on the server side)
                     * * `data`: Data to be sent
                     * 
                     * ```js
                     * export default {
                     *      inject: ['rpgGuiInteraction'],
                     *      methods: {
                     *          changeGold() {
                     *              this.rpgGuiInteraction('gui-name', 'change-gold', {
                     *                  amount: 100
                     *              })
                     *          }
                     *      }
                     * }
                     * ``` 
                     * 
                     * @prop {Function(guiId, name, data = {})} [rpgGuiInteraction]
                     * @memberof VueInject
                     * */
                    rpgGuiInteraction: (guiId: string, name: string, data: any = {}) => {
                        this.socket.emit('gui.interaction', {
                            guiId,
                            name,
                            data
                        })
                    },

                    /** 
                     * Listen to the keys that are pressed on the keyboard
                     * 
                     * ```js
                     * export default {
                     *      inject: ['rpgKeypress'],
                     *      mounted() {
                     *          this.obs = this.rpgKeypress.subscribe(({ inputName, control }) => {
                     *              console.log(inputName) // "escape"
                     *              console.log(control.actionName) // "back"
                     *          })
                     *      },
                     *      unmounted() {
                     *          this.obs.unsubscribe()
                     *      }
                     * }
                     * ``` 
                     * 
                     * @prop {Observable<{ inputName: string, control: { actionName: string, options: any } }>} [rpgKeypress]
                     * @memberof VueInject
                     * */
                    rpgKeypress: this.clientEngine.keyChange
                        .pipe(
                            map(name => {
                                const control = this.clientEngine.controls.getControl(name)
                                return {
                                    inputName: name,
                                    control
                                }
                            })
                        ),

                    /** 
                     * Recovers the socket.
                     * 
                     * ```js
                     * export default {
                     *      inject: ['rpgSocket'],
                     *      mounted() {
                     *          const socket = this.rpgSocket()
                     *          socket.emit('foo', 'bar')
                     *      }
                     * }
                     * ``` 
                     * 
                     * @prop {Function returns RpgScene} [rpgSocket]
                     * @memberof VueInject
                     * */
                    rpgSocket: () => this.socket,

                    /** 
                     * The RpgGui object to control GUIs
                     * 
                     * ```js
                     * export default {
                     *      inject: ['rpgGui'],
                     *      mounted() {
                     *         const guis = this.rpgGui.getAll()
                     *      }
                     * }
                     * ``` 
                     * 
                     * @prop {RpgGui} [rpgGui]
                     * @memberof VueInject
                     * */
                    rpgGui: this,

                    /** 
                     * Equivalent to RpgSound
                     * 
                     * ```js
                     * export default {
                     *      inject: ['rpgSound'],
                     *      mounted() {
                     *         this.rpgSound.get('my-sound-id').play()
                     *      }
                     * }
                     * ``` 
                     * 
                     * @prop {RpgSound} [rpgSound]
                     * @memberof VueInject
                     * */
                    rpgSound: RpgSound,

                    /** 
                     * Find the game's image and sound library
                     * 
                     * ```js
                     * export default {
                     *      inject: ['rpgResource'],
                     *      mounted() {
                     *         const resourceImage = this.rpgResource.spritesheets.get('image_id')
                     *         const resourceSound = this.rpgResource.sounds.get('sound_id')
                     *      }
                     * }
                     * ``` 
                     * 
                     * @prop { { spritesheets: Map, sounds: Map } } [rpgResource]
                     * @memberof VueInject
                     * */
                    rpgResource: RpgResource,

                    /** 
                     * Get RpgClientEngine instance
                     * 
                     * ```js
                     * export default {
                     *      inject: ['rpgEngine'],
                     *      mounted() {
                     *         const vueInstance = this.rpgEngine.vueInstance
                     *      }
                     * }
                     * ``` 
                     * 
                     * @prop {RpgClientEngine} [rpgEngine]
                     * @memberof VueInject
                     * */
                    rpgEngine: this.clientEngine
                }
            },
            computed: {
                fixedGui() {
                    return Object.values(this.gui).filter((gui: any) => !gui.attachToSprite)
                },
                attachedGui() {
                    return Object.values(this.gui).filter((gui: any) => gui.attachToSprite)
                }
            },
            methods: {
                propagate: (type: string, event) => {
                    this.renderer.canvas.dispatchEvent(new MouseEvent(type, event))
                },
                tooltipPosition: (position: { x: number, y: number }) => {
                    const scene = this.renderer.getScene<SceneMap>()
                    const viewport = scene?.viewport
                    if (viewport) {
                        const left = position.x - viewport.left
                        const top = position.y - viewport.top
                        return {
                            transform: `translate(${left}px,${top}px)`
                        }
                    }  
                },
                tooltipFilter(sprites: RpgCommonPlayer[], ui: GuiOptions): RpgCommonPlayer[] {
                    return sprites.filter(tooltip => tooltip.guiDisplay)
                }
            }
        }

        //this.app = createApp(obj)

        for (let ui of gui) {
            this.app.component(ui.name, ui)
            this.gui[ui.name] = {
                data: ui.data,
                attachToSprite: ui.rpgAttachToSprite,
                display: false,
                name: ui.name
            }
        } 
        this.vm = this.app.mount(selectorGui) as VueInstance
        this.vm.gui = this.gui
        this.renderer.app = this.app
        this.renderer.vm = this.vm
    }

     /** @internal */
    update(logicObjects: RpgCommonPlayer) {
        this.vm.tooltips = Object.values(logicObjects).map((object: any) => object.object)
    }

     /** @internal */
    _setSocket(socket) {
        this.socket = socket
        this.socket.on('gui.open', ({ guiId, data }) => {
            this.display(guiId, data)
        })
        this.socket.on('gui.tooltip', ({ players, display }) => {
            for (let playerId of players) {
                const sprite = this.renderer.getScene<SceneMap>()?.getSprite(playerId)
                if (sprite) sprite.guiDisplay = display
            }   
        })
        this.socket.on('gui.exit', (guiId) => {
            this.hide(guiId)
        })
    }

     /** @internal */
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

    /**
     * Get a GUI. You retrieve GUI data and information whether it is displayed or not
     * 
     * ```ts
     * import { RpgGui } from '@rpgjs/client'
     * 
     * const gui = RpgGui.get('my-gui') 
     * console.log(gui.display) // false
     * ```
     * 
     * @title Get a GUI
     * @method RpgGui.get(id)
     * @param {string} id 
     * @returns { { data: any, display: boolean } }
     * @memberof RpgGui
     */
    get(id) {
        if (typeof id != 'string') {
            id = id.name
        }
        return this.gui[id]
    }

    /**
     * Get all GUI. You retrieve GUI data and information whether it is displayed or not
     * 
     * ```ts
     * import { RpgGui } from '@rpgjs/client'
     * 
     * const gui = RpgGui.getAll() 
     * console.log(gui) // { 'rpg-dialog': { data: {}, display: true } }
     * ```
     * 
     * @title Get all GUI
     * @method RpgGui.getAll()
     * @returns { { [guiName]: { data: any, display: boolean }  }}
     * @memberof RpgGui
     */
    getAll() {
        return this.gui
    }

    /**
     * Checks if the GUI exists RpgClient's gui array
     * 
     * ```ts
     * import { RpgGui } from '@rpgjs/client'
     * 
     * RpgGui.exists('my-gui') // true
     * ```
     * 
     * @title GUI Exists ?
     * @method RpgGui.exists(id)
     * @param {string} id 
     * @returns {boolean}
     * @memberof RpgGui
     */
    exists(id: string): boolean {
        return !!this.get(id)
    }

    /**
     * Calls a GUI according to identifier. You can send retrievable data in the component
     * 
     * ```ts
     * import { RpgGui } from '@rpgjs/client'
     * 
     * RpgGui.display('my-gui')
     * ```
     * 
     * @title Display GUI
     * @method RpgGui.display(id,data)
     * @param {string} id 
     * @param {object} [data]
     * @returns {void}
     * @memberof RpgGui
     */
    display(id: string, data = {}) {
        this._setGui(id, {
            display: true,
            data
        })
    }

    /**
     * Hide a GUI according to its identifier
     * 
     * ```ts
     * import { RpgGui } from '@rpgjs/client'
     * 
     * RpgGui.hide('my-gui')
     * ```
     * 
     * @title Hide GUI
     * @method RpgGui.hide(id)
     * @param {string} id 
     * @returns {void}
     * @memberof RpgGui
     */
    hide(id: string) {
        this._setGui(id, {
            display: false
        })
    }

    /** @internal */
    clear() {
        this.gui = {}
    }
}

export const RpgGui = new Gui()