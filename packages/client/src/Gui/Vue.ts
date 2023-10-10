import { renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, resolveDynamicComponent as _resolveDynamicComponent, normalizeProps as _normalizeProps, guardReactiveProps as _guardReactiveProps, createBlock as _createBlock, mergeProps as _mergeProps, createCommentVNode as _createCommentVNode, normalizeStyle as _normalizeStyle, createElementVNode as _createElementVNode } from "vue"
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

const _hoisted_1 = {
    id: "tooltips",
    style: { "position": "absolute", "top": "0", "left": "0" }
}
function render(_ctx, _cache) {
    return (_openBlock(), _createElementBlock("div", {}, [
        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.fixedGui, (ui) => {
            return (_openBlock(), _createElementBlock(_Fragment, null, [
                (ui.display)
                    ? (_openBlock(), _createBlock(_resolveDynamicComponent(ui.name), _normalizeProps(_mergeProps({ key: 0 }, ui.data)), null, 16 /* FULL_PROPS */))
                    : _createCommentVNode("v-if", true)
            ], 64 /* STABLE_FRAGMENT */))
        }), 256 /* UNKEYED_FRAGMENT */)),
        _createElementVNode("div", _hoisted_1, [
            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.attachedGui, (ui) => {
                return (_openBlock(), _createElementBlock(_Fragment, null, [
                    (ui.display)
                        ? (_openBlock(true), _createElementBlock(_Fragment, { key: 0 }, _renderList(_ctx.tooltipFilter(_ctx.tooltips, ui), (tooltip) => {
                            return (_openBlock(), _createElementBlock("div", {
                                style: _normalizeStyle(_ctx.tooltipPosition(tooltip.position))
                            }, [
                                (_openBlock(), _createBlock(_resolveDynamicComponent(ui.name), _mergeProps({ ...ui.data, spriteData: tooltip }, {
                                    ref_for: true,
                                    ref: ui.name
                                }), null, 16 /* FULL_PROPS */))
                            ], 4 /* STYLE */))
                        }), 256 /* UNKEYED_FRAGMENT */))
                        : _createCommentVNode("v-if", true)
                ], 64 /* STABLE_FRAGMENT */))
            }), 256 /* UNKEYED_FRAGMENT */))
        ])
    ], 32 /* HYDRATE_EVENTS */))
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
            render,
            data() {
                return {
                    gui: {},
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
            this.app.component(ui.name, ui.gui)
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
        this.vm.gui = Object.assign({}, this.vm.gui)
    }

    set tooltips(tooltips: any[]) {
        this.vm.tooltips = tooltips
    }
}
