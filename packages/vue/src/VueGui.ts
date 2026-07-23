import {
    App,
    ComponentPublicInstance,
    computed,
    createApp,
    defineComponent,
    h,
    markRaw,
    reactive,
} from 'vue'
import { RpgClientEngine, RpgGui, inject } from '@rpgjs/client'
import type { RpgContext } from '@rpgjs/common'
import { Observable, Subscription } from 'rxjs'

export const VueGuiToken = "VueGuiToken"

interface GuiState {
    name: string
    component: any
    data: any
    openId?: string
    attachToSprite: boolean
    display: boolean
}

interface AttachedTarget {
    id: string
    object: any
    position: {
        x: number
        y: number
    }
}

interface VueInstance extends ComponentPublicInstance {
    gui: Record<string, GuiState>
    tooltips: AttachedTarget[]
}

interface VueGuiOptions {
    /** The HTML element where Vue components will be mounted */
    mountElement?: HTMLElement | string
    /** Custom CSS selector for the mount element */
    selector?: string
    /** Whether to create a new div element if none is found */
    createIfNotFound?: boolean
}

type MaybeSignal<T> = T | (() => T)

const mouseEvents = [
    'click',
    'dblclick',
    'mousedown',
    'mouseup',
    'mousemove',
    'mouseenter',
    'mouseleave',
    'mouseover',
    'mouseout',
    'contextmenu',
]

const pointerEvents = [
    'pointerdown',
    'pointerup',
    'pointermove',
    'pointerenter',
    'pointerleave',
    'pointerover',
    'pointerout',
    'pointercancel',
]

const wheelEvents = ['wheel']

const readValue = <T>(value: MaybeSignal<T> | undefined): T | undefined => {
    return typeof value === 'function'
        ? (value as () => T)()
        : value
}

const isFiniteNumber = (value: unknown): value is number => {
    return typeof value === 'number' && Number.isFinite(value)
}

export class VueGui {
    private clientEngine: RpgClientEngine
    private parentGui: RpgGui
    private app: App
    private vm: VueInstance
    private guiState: Record<string, GuiState>
    private tooltipState: AttachedTarget[]
    private mountElement?: HTMLElement
    private mounted = false
    private registeredComponents = new Set<string>()
    private objectSubscriptions: Subscription[] = []
    private tickSubscription?: Subscription

    constructor(private context: RpgContext, private options: VueGuiOptions = {}) {

    }

    mount() {
        if (this.mounted) return

        this.clientEngine = inject(RpgClientEngine)
        this.parentGui = inject(RpgGui)
        this.parentGui._setVueGuiInstance(this)

        const mountElement = this.getMountElement()
        if (!mountElement) {
            throw new Error('No mount element found for VueGui. Please provide a valid element or selector.')
        }
        this.mountElement = mountElement

        const guiState = reactive<Record<string, GuiState>>({})
        const tooltipState = reactive<AttachedTarget[]>([])
        this.guiState = guiState
        this.tooltipState = tooltipState
        const vueGui = this

        const Root = defineComponent({
            name: 'RpgVueGuiRoot',
            setup() {
                const fixedGui = computed(() => {
                    return Object.values(guiState).filter((gui) => !gui.attachToSprite)
                })
                const attachedGui = computed(() => {
                    return Object.values(guiState).filter((gui) => gui.attachToSprite)
                })

                return {
                    gui: guiState,
                    tooltips: tooltipState,
                    fixedGui,
                    attachedGui,
                    tooltipPosition: (target: AttachedTarget) => vueGui.tooltipPosition(target.position),
                    tooltipFilter: () => tooltipState.filter((target) => vueGui.parentGui.shouldDisplayAttachedGui(target.id)),
                }
            },
            provide: () => {
                return this.getInjectObject()
            },
            render() {
                const fixedNodes = this.fixedGui
                    .filter((ui: GuiState) => ui.display)
                    .map((ui: GuiState) => {
                        return h(
                            ui.component,
                            {
                                key: ui.name,
                                ...ui.data,
                                style: {
                                    pointerEvents: 'auto',
                                },
                            },
                        )
                    })

                const attachedNodes = this.attachedGui.flatMap((ui: GuiState) => {
                    return this.tooltipFilter().map((target: AttachedTarget) => {
                        return h(
                            'div',
                            {
                                key: `${ui.name}:${target.id}`,
                                style: this.tooltipPosition(target),
                            },
                            [
                                h(ui.component, {
                                    ...ui.data,
                                    spriteData: target,
                                    object: target.object,
                                    style: {
                                        pointerEvents: 'auto',
                                    },
                                }),
                            ],
                        )
                    })
                })

                return h('div', {
                    class: 'rpg-vue-gui-root',
                    style: {
                        position: 'absolute',
                        inset: '0',
                        pointerEvents: 'none',
                    },
                }, [
                    ...fixedNodes,
                    h('div', {
                        key: '__rpg-vue-tooltips',
                        id: 'tooltips',
                        style: {
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                        },
                    }, attachedNodes),
                ])
            },
        })

        this.app = createApp(Root)
        this.registerComponents(this.parentGui.getVueGuis())
        this.registerPropagateDirective()

        this.vm = this.app.mount(mountElement) as VueInstance
        this.mounted = true

        this.parentGui._initializeVueComponents()
        this.bindSceneObjects()
    }

    updateGuiState(state: GuiState) {
        if (!this.mounted || !this.guiState) return
        this.registerComponent(state.name, state.component)
        this.guiState[state.name] = this.toReactiveGuiState(state)
        this.updateAttachedTargets()
    }

    initializeGuiStates(states: GuiState[]) {
        if (!this.mounted || !this.guiState) return
        this.registerComponents(states)
        Object.keys(this.guiState).forEach((key) => {
            if (!states.some((state) => state.name === key)) {
                delete this.guiState[key]
            }
        })
        states.forEach((state) => {
            this.guiState[state.name] = this.toReactiveGuiState(state)
        })
        this.updateAttachedTargets()
    }

    destroy() {
        this.objectSubscriptions.forEach(subscription => subscription.unsubscribe())
        this.objectSubscriptions = []
        this.tickSubscription?.unsubscribe()
        this.tickSubscription = undefined
        this.app?.unmount()
        this.mounted = false
        this.mountElement = undefined
    }

    private registerComponents(guis: Array<{ name: string, component: any }>) {
        guis.forEach((gui) => this.registerComponent(gui.name, gui.component))
    }

    private toReactiveGuiState(state: GuiState): GuiState {
        return {
            ...state,
            component: markRaw(state.component),
        }
    }

    private registerComponent(name: string, component: any) {
        if (this.registeredComponents.has(name)) return
        this.app.component(name, component)
        this.registeredComponents.add(name)
    }

    private registerPropagateDirective() {
        this.app.directive('propagate', {
            mounted: (el: HTMLElement) => {
                const eventListeners: Record<string, EventListener> = {}
                const events = [
                    ...mouseEvents,
                    ...wheelEvents,
                    ...(typeof PointerEvent !== 'undefined' ? pointerEvents : []),
                ]

                events.forEach(eventType => {
                    const callback = (event: Event) => this.propagateEvent(event)
                    eventListeners[eventType] = callback
                    el.addEventListener(eventType, callback)
                });
                (el as any).__rpgVuePropagateListeners = eventListeners
            },
            unmounted(el: HTMLElement) {
                const eventListeners: Record<string, EventListener> = (el as any).__rpgVuePropagateListeners || {}
                Object.entries(eventListeners).forEach(([eventType, callback]) => {
                    el.removeEventListener(eventType, callback)
                })
                delete (el as any).__rpgVuePropagateListeners
            },
        })
    }

    private getMountElement(): HTMLElement {
        const { mountElement, selector, createIfNotFound = true } = this.options

        if (mountElement) {
            if (typeof mountElement === 'string') {
                const element = document.querySelector(mountElement) as HTMLElement
                if (element) return this.prepareOverlayElement(element)
            } else {
                return this.prepareOverlayElement(mountElement)
            }
        }

        if (selector) {
            const element = document.querySelector(selector) as HTMLElement
            if (element) return this.prepareOverlayElement(element)
        }

        const defaultElement = document.querySelector('#vue-gui-overlay') as HTMLElement
        if (defaultElement) return this.prepareOverlayElement(defaultElement)

        if (createIfNotFound) {
            const newElement = document.createElement('div')
            newElement.id = 'vue-gui-overlay'
            newElement.style.position = 'absolute'
            newElement.style.top = '0'
            newElement.style.left = '0'
            newElement.style.width = '100%'
            newElement.style.height = '100%'
            newElement.style.pointerEvents = 'none'
            newElement.style.zIndex = '1000'

            const gameContainer = document.querySelector('#rpg')
            if (gameContainer) {
                const style = getComputedStyle(gameContainer)
                if (style.position === 'static') {
                    ;(gameContainer as HTMLElement).style.position = 'relative'
                }
                gameContainer.appendChild(newElement)
                return newElement
            }

            document.body.appendChild(newElement)
            return newElement
        }

        throw new Error('Could not find or create mount element for VueGui')
    }

    private prepareOverlayElement(element: HTMLElement): HTMLElement {
        const style = getComputedStyle(element)
        if (style.position === 'static') {
            element.style.position = 'absolute'
        }
        if (!element.style.top) element.style.top = '0'
        if (!element.style.left) element.style.left = '0'
        if (!element.style.width) element.style.width = '100%'
        if (!element.style.height) element.style.height = '100%'
        if (!element.style.pointerEvents) element.style.pointerEvents = 'none'
        if (!element.style.zIndex) element.style.zIndex = '1000'

        const parent = element.parentElement
        if (parent) {
            const parentStyle = getComputedStyle(parent)
            if (parentStyle.position === 'static') {
                parent.style.position = 'relative'
            }
        }

        return element
    }

    private getInjectObject() {
        return {
            engine: this.clientEngine,
            socket: this.clientEngine.socket,
            gui: this.parentGui,

            rpgEngine: this.clientEngine,
            rpgSocket: () => this.clientEngine.socket,
            rpgGui: this.parentGui,
            rpgScene: () => this.clientEngine.scene,
            rpgStage: (this.clientEngine as any).canvasApp?.stage,
            rpgResource: {
                spritesheets: this.clientEngine.spritesheets,
                sounds: this.clientEngine.sounds,
            },
            rpgObjects: this.createObjectsObservable(),
            rpgCurrentPlayer: this.createCurrentPlayerObservable(),
            rpgGuiClose: (name: string, data?: any) => {
                this.parentGui.guiClose(name, data, this.guiState[name]?.openId)
            },
            rpgGuiInteraction: (guiId: string, name: string, data: any = {}) => {
                this.parentGui.guiInteraction(guiId, name, data)
            },
            rpgKeypress: this.createKeypressObservable(),
            rpgSound: this.createSoundService(),
        }
    }

    private createObjectsObservable() {
        const scene = this.clientEngine.scene
        if (!scene) return null

        return new Observable((observer) => {
            const emit = () => {
                const objects: Record<string, any> = {}
                for (const [id, player] of Object.entries(scene.players())) {
                    objects[id] = {
                        object: player,
                        paramsChanged: player,
                    }
                }
                for (const [id, event] of Object.entries(scene.events())) {
                    objects[id] = {
                        object: event,
                        paramsChanged: event,
                    }
                }
                observer.next(objects)
            }

            const subscriptions = [
                scene.players.observable.subscribe(emit),
                scene.events.observable.subscribe(emit),
            ]
            emit()

            return () => {
                subscriptions.forEach(subscription => subscription.unsubscribe())
            }
        })
    }

    private createCurrentPlayerObservable() {
        const scene = this.clientEngine.scene
        if (!scene) return null

        return new Observable((observer) => {
            const emit = () => {
                const player = scene.currentPlayer()
                if (player) {
                    observer.next({
                        object: player,
                        paramsChanged: player,
                    })
                }
            }
            const subscription = scene.currentPlayer.observable.subscribe(emit)
            emit()

            return () => subscription.unsubscribe()
        })
    }

    private createKeypressObservable() {
        return new Observable((observer) => {
            const keyHandler = (event: KeyboardEvent) => {
                const keyMap = this.clientEngine.globalConfig?.keyboardControls || {
                    up: 'up',
                    down: 'down',
                    left: 'left',
                    right: 'right',
                    action: 'space',
                    escape: 'escape',
                }

                const inputName = event.key.toLowerCase()
                let control: { actionName: string; options: any } | null = null

                for (const [actionName, keyName] of Object.entries(keyMap)) {
                    if (keyName === inputName || keyName === event.code.toLowerCase()) {
                        control = {
                            actionName,
                            options: {},
                        }
                        break
                    }
                }

                if (control) {
                    observer.next({
                        inputName,
                        control,
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
                    play: () => sound?.play?.(),
                    stop: () => sound?.stop?.(),
                    pause: () => sound?.pause?.(),
                }
            },
            play: (id: string) => {
                this.clientEngine.sounds.get(id)?.play?.()
            },
        }
    }

    private bindSceneObjects() {
        const scene = this.clientEngine.scene
        if (!scene || !this.tooltipState) return

        this.objectSubscriptions = [
            scene.players.observable.subscribe(() => this.updateAttachedTargets()),
            scene.events.observable.subscribe(() => this.updateAttachedTargets()),
            this.parentGui.attachedGuiDisplayState.observable.subscribe(() => this.updateAttachedTargets()),
        ]

        this.tickSubscription = this.clientEngine.tick?.subscribe(() => this.updateAttachedTargets())
        this.updateAttachedTargets()
    }

    private updateAttachedTargets() {
        const scene = this.clientEngine?.scene
        if (!scene || !this.tooltipState) return

        const objects = {
            ...scene.players(),
            ...scene.events(),
        }
        const currentPlayer = scene.getCurrentPlayer?.()
        if (currentPlayer?.id) {
            objects[currentPlayer.id] = currentPlayer
        }

        const targets = Object.entries(objects)
            .filter(([id]) => this.parentGui.shouldDisplayAttachedGui(id))
            .map(([id, object]) => {
                return {
                    id,
                    object,
                    position: this.objectScreenPosition(object as any),
                }
            })

        this.tooltipState.splice(0, this.tooltipState.length, ...targets)
    }

    private objectScreenPosition(object: any) {
        const canvas = document.querySelector('#rpg canvas') as HTMLCanvasElement | null
        const rect = canvas?.getBoundingClientRect()
        const width = rect?.width || (this.clientEngine.renderer as any)?.screen?.width || 0
        const height = rect?.height || (this.clientEngine.renderer as any)?.screen?.height || 0
        const hitbox = this.readObjectHitbox(object)
        const objectX = this.readObjectCoordinate(object, 'x')
        const objectY = this.readObjectCoordinate(object, 'y')
        const worldX = isFiniteNumber(objectX) ? objectX + hitbox.w / 2 : undefined
        const worldY = isFiniteNumber(objectY) ? objectY : undefined
        const viewportPosition = this.viewportScreenPosition(worldX, worldY)
        if (viewportPosition) return viewportPosition

        const currentPlayer = this.clientEngine.scene?.getCurrentPlayer?.()
        const cameraX = this.readObjectCoordinate(currentPlayer, 'x')
        const cameraY = this.readObjectCoordinate(currentPlayer, 'y')

        if (
            isFiniteNumber(worldX)
            && isFiniteNumber(worldY)
            && isFiniteNumber(cameraX)
            && isFiniteNumber(cameraY)
        ) {
            return {
                x: width / 2 + worldX - cameraX,
                y: height / 2 + worldY - cameraY,
            }
        }

        return {
            x: isFiniteNumber(worldX) ? worldX : 0,
            y: isFiniteNumber(worldY) ? worldY : 0,
        }
    }

    private viewportScreenPosition(worldX: number | undefined, worldY: number | undefined) {
        if (!isFiniteNumber(worldX) || !isFiniteNumber(worldY)) return undefined

        const viewport = this.getViewport()
        if (!viewport) return undefined

        const screenPoint = typeof viewport.toScreen === 'function'
            ? viewport.toScreen(worldX, worldY)
            : typeof viewport.toGlobal === 'function'
                ? viewport.toGlobal({ x: worldX, y: worldY })
                : undefined
        if (!screenPoint || !isFiniteNumber(screenPoint.x) || !isFiniteNumber(screenPoint.y)) {
            return undefined
        }

        const canvas = document.querySelector('#rpg canvas') as HTMLCanvasElement | null
        const overlay = this.mountElement ?? document.querySelector('#vue-gui-overlay') as HTMLElement | null
        const canvasRect = canvas?.getBoundingClientRect()
        const overlayRect = overlay?.getBoundingClientRect()
        const rendererScreen = (this.clientEngine.renderer as any)?.screen
        const scaleX = canvasRect && rendererScreen?.width
            ? canvasRect.width / rendererScreen.width
            : 1
        const scaleY = canvasRect && rendererScreen?.height
            ? canvasRect.height / rendererScreen.height
            : 1

        return {
            x: screenPoint.x * scaleX + ((canvasRect?.left ?? 0) - (overlayRect?.left ?? 0)),
            y: screenPoint.y * scaleY + ((canvasRect?.top ?? 0) - (overlayRect?.top ?? 0)),
        }
    }

    private getViewport() {
        return (this.clientEngine as any).canvasElement
            ?.propObservables
            ?.context
            ?.viewport
    }

    private readObjectCoordinate(object: any, key: 'x' | 'y') {
        if (!object) return undefined
        const bodyPosition = this.clientEngine.scene?.getBodyPosition?.(object.id, 'top-left')
        const bodyValue = bodyPosition?.[key]
        if (isFiniteNumber(bodyValue)) return bodyValue
        return readValue<number>(object[key])
    }

    private readObjectHitbox(object: any) {
        const hitbox = readValue<any>(object?.hitbox)
        return {
            w: isFiniteNumber(hitbox?.w) ? hitbox.w : 32,
            h: isFiniteNumber(hitbox?.h) ? hitbox.h : 32,
        }
    }

    private propagateEvent(event: Event) {
        const canvas = document.querySelector('#rpg canvas') as HTMLCanvasElement
        if (!canvas) return

        const propagatedEvent = this.createPropagatedEvent(event)
        canvas.dispatchEvent(propagatedEvent)
    }

    private createPropagatedEvent(event: Event) {
        if (typeof WheelEvent !== 'undefined' && event instanceof WheelEvent) {
            return new WheelEvent(event.type, {
                ...this.getMouseEventInit(event),
                deltaX: event.deltaX,
                deltaY: event.deltaY,
                deltaZ: event.deltaZ,
                deltaMode: event.deltaMode,
            })
        }

        if (typeof PointerEvent !== 'undefined' && event instanceof PointerEvent) {
            return new PointerEvent(event.type, {
                ...this.getMouseEventInit(event),
                pointerId: event.pointerId,
                width: event.width,
                height: event.height,
                pressure: event.pressure,
                tangentialPressure: event.tangentialPressure,
                tiltX: event.tiltX,
                tiltY: event.tiltY,
                twist: event.twist,
                pointerType: event.pointerType,
                isPrimary: event.isPrimary,
            })
        }

        if (typeof MouseEvent !== 'undefined' && event instanceof MouseEvent) {
            return new MouseEvent(event.type, this.getMouseEventInit(event))
        }

        return new Event(event.type, {
            bubbles: event.bubbles,
            cancelable: event.cancelable,
            composed: event.composed,
        })
    }

    private getMouseEventInit(event: MouseEvent): MouseEventInit {
        return {
            bubbles: event.bubbles,
            cancelable: event.cancelable,
            composed: event.composed,
            detail: event.detail,
            view: event.view,
            screenX: event.screenX,
            screenY: event.screenY,
            clientX: event.clientX,
            clientY: event.clientY,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
            button: event.button,
            buttons: event.buttons,
            relatedTarget: event.relatedTarget,
        }
    }

    private tooltipPosition(position: { x: number, y: number }) {
        return {
            left: `${position.x}px`,
            top: `${position.y}px`,
            position: 'absolute',
            pointerEvents: 'none',
        }
    }
}
