import { RpgPlugin, HookClient, Utils, InjectContext } from '@rpgjs/common'
import { SceneMap } from './Scene/Map'
import { Scene } from './Scene/Scene'
import { Scene as PresetScene } from './Presets/Scene'
import { RpgGui } from './Gui/Gui'
import { RpgClientEngine } from './RpgClientEngine'
import type { App, ComponentPublicInstance } from 'vue'
import { TransitionScene } from './Effects/TransitionScene'
import { Subject, forkJoin } from 'rxjs'
import { GameEngineClient } from './GameEngine'
import { SpinnerGraphic } from './Effects/Spinner'
import { autoDetectRenderer, Container, EventBoundary, FederatedEvent, FederatedPointerEvent, Graphics, ICanvas, IRenderer } from 'pixi.js'
import { KeyboardControls } from './KeyboardControls'

const { elementToPositionAbsolute } = Utils

export enum TransitionMode {
    None,
    Fading
}

enum ContainerName {
    Map = 'map'
}

export const EVENTS_MAP = {
    MouseEvent: ['click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout', 'contextmenu', 'wheel'],
    KeyboardEvent: ['keydown', 'keyup', 'keypress', 'keydownoutside', 'keyupoutside', 'keypressoutside'],
    PointerEvent: ['pointerdown', 'pointerup', 'pointermove', 'pointerover', 'pointerout', 'pointerenter', 'pointerleave', 'pointercancel'],
    TouchEvent: ['touchstart', 'touchend', 'touchmove', 'touchcancel']
};

export class RpgRenderer {
    private gameEngine: GameEngineClient = this.context.inject(GameEngineClient)
    private clientEngine: RpgClientEngine = this.context.inject(RpgClientEngine)

    public vm: ComponentPublicInstance
    public app: App
    public readonly stage: Container = new Container()
    private readonly sceneContainer: Container = new Container()
    private readonly fadeContainer: Graphics = new Graphics()
    private readonly spinner: SpinnerGraphic = new SpinnerGraphic(this.clientEngine)
    public options: any = {}
    public guiEl: HTMLDivElement

    private scene: Scene | null = null
    private renderer: IRenderer
    private _width: number = 800
    private _height: number = 400
    private canvasEl: HTMLElement
    private selector: HTMLElement
    private loadingScene = {
        transitionIn: new Subject(),
        transitionOut: new Subject()
    }
    private freeze: boolean = false
    private prevObjectScene: any = {}
    public transitionMode: TransitionMode = TransitionMode.Fading

    constructor(private context: InjectContext) {
        this.clientEngine.tick.subscribe(({ timestamp, deltaRatio, frame, deltaTime }) => {
            this.draw(timestamp, deltaTime, deltaRatio, frame)
        })
        this.transitionCompleted()
    }

    /** @internal */
    init(): Promise<void> {
        return this.onDOMLoaded()
    }

    /** @internal */
    _resize(w: number, h: number) {
        if (!w) w = this.options.canvas.width
        if (!h) h = this.options.canvas.height
        const scene = this.getScene<SceneMap>()
        if (this.scene && scene?.viewport) {
            scene.viewport.screenWidth = w
            scene.viewport.screenHeight = h
        }
        if (this.vm) {
            this.vm.$el.style = `width:${w}px;height:${h}px`
        }
        this.renderer.resize(w, h)
        this._width = w
        this._height = h
        this.fadeContainer.beginFill(0x00000)
        this.fadeContainer.drawRect(0, 0, w, h)
        this.fadeContainer.endFill()
        this.spinner.x = w * 0.5
        this.spinner.y = h * 0.5
    }

    get canvas(): HTMLCanvasElement {
        return this.renderer.view as HTMLCanvasElement
    }

    get height(): number {
        return this._height
    }

    set height(val: number) {
        this._resize(this._width, val)
    }

    get width(): number {
        return this._width
    }

    set width(val: number) {
        this._resize(val, this.height)
    }

    /** @internal */
    async onDOMLoaded(): Promise<void> {
        let options = {
            antialias: true,
            ...this.options.canvas
        };
        this.renderer = autoDetectRenderer(options)
        this.selector = document.body.querySelector(this.options.selector)
        this.guiEl = this.selector.querySelector(this.options.selectorGui)
        this.canvasEl = this.selector.querySelector(this.options.selectorCanvas)

        if (!this.guiEl) {
            this.guiEl = document.createElement('div')
            this.guiEl = this.selector.appendChild(this.guiEl)
        }

        elementToPositionAbsolute(this.guiEl)

        if (!this.canvasEl) {
            this.selector.insertBefore(this.renderer.view as HTMLCanvasElement, this.selector.firstChild)
            const [canvas] = document.querySelector(this.options.selector).children
            canvas.style.position = 'absolute'
        }
        else {
            this.canvasEl.appendChild(this.renderer.view as HTMLCanvasElement)
        }

        this.stage.addChild(this.sceneContainer)
        this.stage.addChild(this.fadeContainer)
        this.fadeContainer.addChild(this.spinner)

        this.fadeContainer.visible = false
        this.fadeContainer.alpha = 0

        await RpgGui._initialize(this.context, this.guiEl)

        this.resize()
        this.bindMouseControls()

    }

    private bindMouseControls() {
        const controlInstance = this.context.inject(KeyboardControls)
        const controls = controlInstance.getControls()
        for (let key in controls) {
            const { actionName } = controls[key]
            if (EVENTS_MAP.MouseEvent.includes(key)) {
                this.canvas.addEventListener(key, (e) => {
                    controlInstance.applyControl(actionName)
                })
            }
        }
    }

    /** @internal */
    resize() {
        const size = () => {
            const { offsetWidth, offsetHeight } = this.canvasEl || this.selector
            this._resize(offsetWidth, offsetHeight)
            RpgPlugin.emit(HookClient.WindowResize)
        }
        window.addEventListener('resize', size)
        size()
    }

    /** @internal */
    getScene<T = Scene>(): T | null {
        return this.scene as any
    }

    /** @internal */
    draw(t: number, deltaTime: number, deltaRatio: number, frame: number) {
        if (!this.renderer) return
        if (this.scene && !this.freeze) this.scene.draw(t, deltaTime, deltaRatio, frame)
        this.renderer.render(this.stage)
    }

    /** @internal */
    async loadScene(name: string, obj) {
        const scene = this.getScene<SceneMap | null>()
        if (scene && scene.data.id == obj.id) {
            const container = await scene.load(obj, this.prevObjectScene, true)
            this.sceneContainer.removeChildren()
            this.sceneContainer.addChild(container)
            scene.updateTilesOverlayAllSprites()
            this.scene?.update()
            return
        }
        this.loadingScene.transitionIn.next({ name, obj })
        this.loadingScene.transitionIn.complete()
    }

    private async createScene(name: string, obj) {
        const container = await this.getScene<SceneMap>()?.load(obj, this.prevObjectScene)
        this.prevObjectScene = { ...obj }
        this.sceneContainer.children.forEach(child => {
            if (child.name === ContainerName.Map) this.sceneContainer.removeChild(child)
        })
        if (container) {
            container.name = ContainerName.Map
            this.sceneContainer.addChild(container)
        }
        this.scene?.update()
    }

    /** @internal */
    transitionScene(name: string) {
        this.freeze = true
        this.fadeContainer.visible = true
        RpgPlugin.emit(HookClient.BeforeSceneLoading, {
            name
        })
        this.clientEngine.controls.stopInputs()
        const finish = () => {
            this.clearScene()
            this.loadingScene.transitionOut.next(name)
            this.loadingScene.transitionOut.complete()
        }
        if (this.transitionMode == TransitionMode.Fading) {
            new TransitionScene(this.context, this.fadeContainer)
                .addFadeOut()
                .onComplete(finish)
                .start()
        }
        else {
            finish()
        }
    }

    /** @internal */
    transitionCompleted() {
        this.loadingScene = {
            transitionIn: new Subject(),
            transitionOut: new Subject()
        }
        this.clientEngine.roomJoin = new Subject()
        forkJoin({
            in: this.loadingScene.transitionIn,
            out: this.loadingScene.transitionOut,
            room: this.clientEngine.roomJoin
        }).subscribe(async (data: { in: any }) => {
            const { in: { obj, name } } = data
            const scenes = this.options.scenes || {}
            switch (name) {
                case PresetScene.Map:
                    const sceneClass = scenes[PresetScene.Map] || SceneMap
                    this.scene = new sceneClass(this.context, this.renderer, {
                        screenWidth: this.renderer.screen.width,
                        screenHeight: this.renderer.screen.height,
                        drawMap: this.options.drawMap
                    })
                    break;
            }
            await this.createScene(name, obj)
            this.freeze = false
            const finish = () => {
                this.clientEngine.controls.listenInputs()
                this.fadeContainer.visible = false
                this.transitionCompleted()
                RpgPlugin.emit(HookClient.AfterSceneLoading, this.scene)
            }
            if (this.transitionMode == TransitionMode.Fading) {
                new TransitionScene(this.context, this.fadeContainer)
                    .addFadeIn()
                    .onComplete(finish)
                    .start()
            }
            else {
                finish()
            }
        })
    }

    /** @internal */
    clearScene() {
        this.scene = null
        this.sceneContainer.removeChildren()
    }

    /**
     * @title Propagate mouse event to Viewport
     * @method propagateEvent(ev)
     * @stability 1
     * @memberof RpgRenderer
     * @returns {void}
     */
    propagateEvent(ev: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = rect.left + window.scrollX;
        const canvasY = rect.top + window.scrollY;
        const realX = ev.clientX - canvasX;
        const realY = ev.clientY - canvasY;
        const boundary = new EventBoundary(this.stage);
        const event = new FederatedPointerEvent(boundary)
        event.global.set(realX, realY);
        event.type = ev.type;
        const hitTestTarget = boundary.hitTest(realX, realY);
        hitTestTarget?.dispatchEvent(event)
        this.canvas.dispatchEvent(new MouseEvent(ev.type, ev))
    }

    /***
     * Propagate events from an HTMLElement to the canvas
     * 
     * @title Propagate events
     * @method addPropagateEventsFrom(el)
     * @stability 1
     * @memberof RpgRenderer
     * @returns {void}
     */
    addPropagateEventsFrom(el: HTMLElement) {
        for (let [_Constructor, events] of Object.entries(EVENTS_MAP)) {
            for (let type of events) {
                el.addEventListener(type, (e) => {
                    const _class = window[_Constructor] ?? MouseEvent
                    this.canvas.dispatchEvent(new _class(type, e))
                });
            }
        }
    }
}
