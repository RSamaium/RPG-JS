import RpgGuiCompiled from './RpgGuiCompiled'
import { App, ComponentPublicInstance, createApp } from 'vue'
import { RpgCommonPlayer, Utils } from '@rpgjs/common'
import { RpgRenderer } from '../Renderer'
import { GameEngineClient } from '../GameEngine'
import { RpgClientEngine } from '../RpgClientEngine'
import type { Gui } from './Gui'
import { SceneMap } from '../Scene/Map'

interface VueInstance extends ComponentPublicInstance {
    gui: GuiList,
    tooltips: RpgCommonPlayer[]
}

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

export class VueGui {
    private renderer: RpgRenderer
    private gameEngine: GameEngineClient
    private clientEngine: RpgClientEngine
    private app: App
    private vm: VueInstance
    private socket

    constructor(rootEl: HTMLDivElement, parentGui: Gui) {
        this.clientEngine = parentGui.clientEngine
        this.renderer = this.clientEngine.renderer
        this.gameEngine = this.clientEngine.gameEngine
        const { gui } = parentGui

        const obj = {
            render: RpgGuiCompiled,
            data() {
                return {
                    gui,
                    tooltips: []
                }
            },
            provide: () => {
                return parentGui.getInjectObject()
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

        this.app = createApp(obj)

        const guiVue = Object.values(gui).filter(ui => !Utils.isFunction(ui))

        for (let ui of guiVue) {
            this.app.component(ui.name, ui)
        } 
        this.vm = this.app.mount(rootEl) as VueInstance
        this.renderer.app = this.app
        this.renderer.vm = this.vm
    }

    set gui(val) {
        for (let key in val) {
            // ignore react component
            if (val[key].isFunction) continue
            this.vm.gui[key] = val[key]
        }
    }
  
     /** @internal */
    update(logicObjects: RpgCommonPlayer) {
        this.vm.tooltips = Object.values(logicObjects).map((object: any) => object.object)
    }
}
