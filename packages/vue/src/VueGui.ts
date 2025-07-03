import { renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, resolveDynamicComponent as _resolveDynamicComponent, normalizeProps as _normalizeProps, guardReactiveProps as _guardReactiveProps, createBlock as _createBlock, mergeProps as _mergeProps, createCommentVNode as _createCommentVNode, normalizeStyle as _normalizeStyle, createElementVNode as _createElementVNode } from "vue"
import { App, ComponentPublicInstance, createApp } from 'vue'
import { RpgCommonPlayer, Utils } from '@rpgjs/common'
import { RpgClientEngine, RpgGui } from '@rpgjs/client'
import { Context, inject } from "@signe/di"
import { Observable } from 'rxjs'

export const VueGuiToken = "VueGuiToken"

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

interface VueGuiOptions {
    /** The HTML element where Vue components will be mounted */
    mountElement?: HTMLElement | string
    /** Custom CSS selector for the mount element */
    selector?: string
    /** Whether to create a new div element if none is found */
    createIfNotFound?: boolean
}

const _hoisted_1 = {
    id: "tooltips",
    style: { "position": "absolute", "top": "0", "left": "0" }
}

function render(_ctx, _cache) {
    return (_openBlock(), _createElementBlock("div", {}, [
        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.fixedGui, (ui: any) => {
            return (_openBlock(), _createElementBlock(_Fragment, null, [
                (ui.display)
                    ? (_openBlock(), _createBlock(_resolveDynamicComponent(ui.name), _normalizeProps(_mergeProps({ key: 0, style: { pointerEvents: 'auto' } }, ui.data)), null, 16 /* FULL_PROPS */))
                    : _createCommentVNode("v-if", true)
            ], 64 /* STABLE_FRAGMENT */))
        }), 256 /* UNKEYED_FRAGMENT */)),
        _createElementVNode("div", _hoisted_1, [
            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.attachedGui, (ui: any) => {
                return (_openBlock(), _createElementBlock(_Fragment, null, [
                    (ui.display)
                        ? (_openBlock(true), _createElementBlock(_Fragment, { key: 0 }, _renderList(_ctx.tooltipFilter(_ctx.tooltips, ui), (tooltip: any) => {
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
    private parentGui: RpgGui
    private app: App
    private vm: VueInstance
    private socket

    constructor(private context: Context, private options: VueGuiOptions = {}) {
        this.clientEngine = inject(context, RpgClientEngine)
        this.parentGui = inject(context, RpgGui)
        
        // Get or create mount element
        const mountElement = this.getMountElement()
        if (!mountElement) {
            throw new Error('No mount element found for VueGui. Please provide a valid element or selector.')
        }

        // Get all GUI components from the parent GUI service
        const allGuis = this.parentGui.getAll()

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
        const guiVue = Object.values(allGuis).filter(ui => !Utils.isFunction(ui.component))

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

        this.vm = this.app.mount(mountElement) as VueInstance
    }

    private getMountElement(): HTMLElement {
        const { mountElement, selector, createIfNotFound = true } = this.options

        // If mountElement is provided directly
        if (mountElement) {
            if (typeof mountElement === 'string') {
                const element = document.querySelector(mountElement) as HTMLElement
                if (element) return element
            } else {
                return mountElement
            }
        }

        // If selector is provided
        if (selector) {
            const element = document.querySelector(selector) as HTMLElement
            if (element) return element
        }

        // Default selector
        const defaultElement = document.querySelector('#vue-gui-overlay') as HTMLElement
        if (defaultElement) return defaultElement

        // Create element if not found and createIfNotFound is true
        if (createIfNotFound) {
            const newElement = document.createElement('div')
            newElement.id = 'vue-gui-overlay'
            newElement.style.position = 'absolute'
            newElement.style.top = '0'
            newElement.style.left = '0'
            newElement.style.width = '100%'
            newElement.style.height = '100%'
            newElement.style.pointerEvents = 'none' // Allow canvas events to pass through

            // Try to add to game container
            const gameContainer = document.querySelector('#rpg')
            if (gameContainer) {
                gameContainer.appendChild(newElement)
                return newElement
            }

            // Fallback to body
            document.body.appendChild(newElement)
            return newElement
        }

        throw new Error('Could not find or create mount element for VueGui')
    }

    private getInjectObject() {
        return {
            // Legacy injections (for backward compatibility)
            engine: this.clientEngine,
            socket: this.clientEngine.socket,
            gui: this.parentGui,

            // Standard RPGJS Vue injections
            rpgEngine: this.clientEngine,
            rpgSocket: () => this.clientEngine.socket,
            rpgGui: this.parentGui,
            rpgScene: () => this.clientEngine.scene,
            rpgStage: this.clientEngine.renderer?.stage,
            rpgResource: {
                spritesheets: this.clientEngine.spritesheets,
                sounds: this.clientEngine.sounds
            },
            rpgObjects: this.createObjectsObservable(),
            rpgCurrentPlayer: this.createCurrentPlayerObservable(),
            rpgGuiClose: (name: string, data?: any) => {
                this.parentGui.guiClose(name, data)
            },
            rpgGuiInteraction: (guiId: string, name: string, data: any = {}) => {
                this.parentGui.guiInteraction(guiId, name, data)
            },
            rpgKeypress: this.createKeypressObservable(),
            rpgSound: this.createSoundService()
        }
    }

    private createObjectsObservable() {
        // Combine players and events into a single observable
        const scene = this.clientEngine.scene
        if (!scene) return null

        // Create an observable that merges players and events
        return new Observable((observer) => {
            const subscription1 = scene.players.observable.subscribe((players) => {
                const objects = {}
                for (const [id, player] of Object.entries(players)) {
                    objects[id] = {
                        object: player,
                        paramsChanged: player // For simplicity, could be enhanced to track actual changes
                    }
                }
                observer.next(objects)
            })

            const subscription2 = scene.events.observable.subscribe((events) => {
                const objects = {}
                for (const [id, event] of Object.entries(events)) {
                    objects[id] = {
                        object: event,
                        paramsChanged: event
                    }
                }
                observer.next(objects)
            })

            return () => {
                subscription1.unsubscribe()
                subscription2.unsubscribe()
            }
        })
    }

    private createCurrentPlayerObservable() {
        const scene = this.clientEngine.scene
        if (!scene) return null

        return new Observable((observer) => {
            const subscription = scene.currentPlayer.observable.subscribe((player) => {
                if (player) {
                    observer.next({
                        object: player,
                        paramsChanged: player
                    })
                }
            })

            return () => subscription.unsubscribe()
        })
    }

    private createKeypressObservable() {
        return new Observable((observer) => {
            const keyHandler = (event: KeyboardEvent) => {
                // Map keyboard events to RPG controls
                const keyMap = this.clientEngine.globalConfig?.keyboardControls || {
                    up: 'up',
                    down: 'down', 
                    left: 'left',
                    right: 'right',
                    action: 'space',
                    escape: 'escape'
                }

                const inputName = event.key.toLowerCase()
                let control: { actionName: string; options: any } | null = null

                // Find matching control
                for (const [actionName, keyName] of Object.entries(keyMap)) {
                    if (keyName === inputName || keyName === event.code.toLowerCase()) {
                        control = {
                            actionName,
                            options: {}
                        }
                        break
                    }
                }

                if (control) {
                    observer.next({
                        inputName,
                        control
                    })
                }
            }

            document.addEventListener('keydown', keyHandler)
            
            return () => {
                document.removeEventListener('keydown', keyHandler)
            }
        })
    }

    private createSoundService() {
        return {
            get: (id: string) => {
                const sound = this.clientEngine.sounds.get(id)
                return {
                    play: () => {
                        if (sound && sound.play) {
                            sound.play()
                        }
                    },
                    stop: () => {
                        if (sound && sound.stop) {
                            sound.stop()
                        }
                    },
                    pause: () => {
                        if (sound && sound.pause) {
                            sound.pause()
                        }
                    }
                }
            },
            play: (id: string) => {
                const sound = this.clientEngine.sounds.get(id)
                if (sound && sound.play) {
                    sound.play()
                }
            }
        }
    }

    private propagateEvent(event: Event) {
        // Propagate mouse events to the canvas/engine
        // This allows interaction with the game through Vue components
        if (this.clientEngine.renderer) {
            // Convert DOM event to canvas coordinates and propagate
            const canvas = this.clientEngine.renderer.view as HTMLCanvasElement;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const mouseEvent = event as MouseEvent
                
                // Create a new mouse event with adjusted coordinates
                const newEvent = new MouseEvent(event.type, {
                    bubbles: event.bubbles,
                    cancelable: event.cancelable,
                    clientX: mouseEvent.clientX - rect.left,
                    clientY: mouseEvent.clientY - rect.top,
                    button: mouseEvent.button,
                    buttons: mouseEvent.buttons
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

    set gui(val: any) {
        for (let key in val) {
            // Ignore function components (they should only be handled by CanvasEngine)
            if (Utils.isFunction(val[key].component)) continue
            this.vm.gui[key] = val[key]
        }
        this.vm.gui = Object.assign({}, this.vm.gui)
    }
}