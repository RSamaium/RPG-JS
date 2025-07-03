import { renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, resolveDynamicComponent as _resolveDynamicComponent, normalizeProps as _normalizeProps, guardReactiveProps as _guardReactiveProps, createBlock as _createBlock, mergeProps as _mergeProps, createCommentVNode as _createCommentVNode, normalizeStyle as _normalizeStyle, createElementVNode as _createElementVNode } from "vue"
import { App, ComponentPublicInstance, createApp } from 'vue'
import { RpgCommonPlayer, Utils } from '@rpgjs/common'
import { RpgClientEngine } from '@rpgjs/client'
import type { RpgGui } from '@rpgjs/client'

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

const _hoisted_1 = {
    id: "tooltips",
    style: { "position": "absolute", "top": "0", "left": "0" }
}

function render(_ctx, _cache) {
    return (_openBlock(), _createElementBlock("div", {}, [
        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.fixedGui, (ui) => {
            return (_openBlock(), _createElementBlock(_Fragment, null, [
                (ui.display)
                    ? (_openBlock(), _createBlock(_resolveDynamicComponent(ui.name), _normalizeProps(_mergeProps({ key: 0, style: { pointerEvents: 'auto' } }, ui.data)), null, 16 /* FULL_PROPS */))
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
                                (_openBlock(), _createBlock(_resolveDynamicComponent(ui.name), _mergeProps({ ...ui.data, spriteData: tooltip, style: { pointerEvents: 'auto' } }, {
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
    private clientEngine: RpgClientEngine
    private app: App
    private vm: VueInstance
    private socket

    constructor(rootEl: HTMLDivElement, private parentGui: RpgGui) {
        this.clientEngine = parentGui.context.get(RpgClientEngine)
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
                return this.getInjectObject()
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
                tooltipPosition: this.tooltipPosition.bind(this),
                tooltipFilter: this.tooltipFilter.bind(this)
            }
        }

        this.app = createApp(obj)

        // Filter out function components (keep only Vue components)
        const guiVue = Object.values(gui.getAll()).filter(ui => !Utils.isFunction(ui.component))

        for (let ui of guiVue) {
            this.app.component(ui.name, ui.component)
        }

        // Add propagate directive for event handling
        this.app.directive('propagate', {
            mounted: (el, binding) => {
                el.eventListeners = {};
                const mouseEvents = ['click', 'mousedown', 'mouseup', 'mousemove', 'wheel'];
                mouseEvents.forEach(eventType => {
                    const callback = (ev) => {
                        // Propagate event to the game engine
                        this.propagateEvent(ev);
                    };
                    el.eventListeners[eventType] = callback;
                    el.addEventListener(eventType, callback);
                });
            },
            unmounted(el, binding) {
                const mouseEvents = ['click', 'mousedown', 'mouseup', 'mousemove', 'wheel'];
                mouseEvents.forEach(eventType => {
                    const callback = el.eventListeners[eventType];
                    if (callback) {
                        el.removeEventListener(eventType, callback);
                    }
                });
            }
        })

        this.vm = this.app.mount(rootEl) as VueInstance
    }

    private getInjectObject() {
        return {
            engine: this.clientEngine,
            socket: this.clientEngine.socket,
            gui: this.parentGui
        }
    }

    private propagateEvent(event) {
        // Propagate mouse events to the canvas/engine
        // This allows interaction with the game through Vue components
        if (this.clientEngine.renderer) {
            // Convert DOM event to canvas coordinates and propagate
            const canvas = this.clientEngine.renderer.view as HTMLCanvasElement;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const newEvent = new event.constructor(event.type, {
                    ...event,
                    clientX: event.clientX - rect.left,
                    clientY: event.clientY - rect.top
                });
                canvas.dispatchEvent(newEvent);
            }
        }
    }

    private tooltipPosition(position: any) {
        return {
            left: position.x + 'px',
            top: position.y + 'px',
            position: 'absolute'
        }
    }

    private tooltipFilter(tooltips: any[], ui: any) {
        // Filter tooltips based on UI configuration
        return tooltips.filter(tooltip => {
            // Add filtering logic based on your requirements
            return true;
        });
    }

    _setSceneReady() {
        // Handle scene ready state for tooltips and other dynamic content
        if (this.clientEngine.scene) {
            // Subscribe to object changes for tooltips
            this.vm.tooltips = [];
        }
    }

    set gui(val) {
        for (let key in val) {
            // Ignore function components (they should only be handled by CanvasEngine)
            if (Utils.isFunction(val[key].component)) continue
            this.vm.gui[key] = val[key]
        }
        this.vm.gui = Object.assign({}, this.vm.gui)
    }
}