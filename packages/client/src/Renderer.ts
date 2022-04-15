window.PIXI = require('pixi.js')

import { RpgPlugin, HookClient } from '@rpgjs/common'
import { SceneMap } from './Scene/Map'
import { Scene } from './Scene/Scene'
import { Scene as PresetScene } from './Presets/Scene'
import { RpgGui } from './RpgGui'
import { RpgClientEngine } from './RpgClientEngine'
import { App, ComponentPublicInstance } from 'vue'
import { TransitionScene } from './Effects/TransitionScene'
import { Subject, forkJoin, Observable } from 'rxjs'
import { GameEngineClient } from './GameEngine'

export enum TransitionMode {
    None,
    Fading
}

export class RpgRenderer  {
    public vm: ComponentPublicInstance
    public app: App
    public readonly stage: PIXI.Container = new PIXI.Container()
    private readonly sceneContainer: PIXI.Container = new PIXI.Container()
    private readonly fadeContainer: PIXI.Graphics = new PIXI.Graphics()
    public options: any = {}
    public guiEl: HTMLDivElement

    private scene: Scene | null = null
    private renderer: PIXI.Renderer
    private _width: number = 800
    private _height: number = 400 
    private canvasEl: HTMLElement
    private selector: HTMLElement
    private gameEngine: GameEngineClient = this.clientEngine.gameEngine
    private loadingScene = {
        transitionIn: new Subject(),
        transitionOut: new Subject()
    }
    private freeze: boolean = false
    public transitionMode: TransitionMode = TransitionMode.Fading

    constructor(private clientEngine: RpgClientEngine) {
        this.clientEngine.tick.subscribe(({ timestamp, deltaTime, frame }) => {
            this.draw(timestamp, deltaTime, frame)
        })
        this.transitionCompleted()
    }

     /** @internal */
    async init() {
        this.onDOMLoaded()
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
    }

    get canvas(): HTMLCanvasElement {
        return this.renderer.view
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
    onDOMLoaded() {
        let options = {
            antialias: true,
            autoResize: true,
            resolution: window.devicePixelRatio || 1,
            ...this.options.canvas
        };
        this.renderer = PIXI.autoDetectRenderer(options)
        this.selector = document.body.querySelector(this.options.selector)
        this.guiEl = this.selector.querySelector(this.options.selectorGui)
        this.canvasEl = this.selector.querySelector(this.options.selectorCanvas)

        if (!this.guiEl) {
            this.guiEl = document.createElement('div')
            this.selector.appendChild(this.guiEl)
        }

        if (!this.canvasEl) {
            this.selector.insertBefore(this.renderer.view, this.selector.firstChild)
            const [canvas] = document.querySelector(this.options.selector).children
            canvas.style.position = 'absolute'
        }
        else {
            this.canvasEl.appendChild(this.renderer.view)
        }

        this.stage.addChild(this.sceneContainer)
        this.stage.addChild(this.fadeContainer)

        this.fadeContainer.visible = false
        this.fadeContainer.alpha = 0

        RpgGui._initalize(this.clientEngine)

        this.resize()
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
    draw(t: number, dt: number, frame: number) {
        if (!this.renderer) return
        if (this.scene && !this.freeze) this.scene.draw(t, dt, frame)
        this.renderer.render(this.stage)
    }

     /** @internal */
    loadScene(name: string, obj) {
        this.loadingScene.transitionIn.next({ name, obj })
        this.loadingScene.transitionIn.complete()
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
            new TransitionScene(this.clientEngine, this.fadeContainer)
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
                    this.scene = new sceneClass(this.gameEngine, {
                        screenWidth: this.renderer.screen.width,
                        screenHeight: this.renderer.screen.height,
                        drawMap:  this.options.drawMap
                    })
                    break;
            }
            const container = await this.getScene<SceneMap>()?.load(obj)
            if (container) {
                this.sceneContainer.addChild(container) 
            }
            this.scene?.update()
            this.freeze = false
            const finish = () => {
                RpgPlugin.emit(HookClient.AfterSceneLoading, this.scene)
                    this.clientEngine.controls.listenInputs()
                    this.fadeContainer.visible = false
                    this.transitionCompleted()
            }
            if (this.transitionMode == TransitionMode.Fading) {
                new TransitionScene(this.clientEngine, this.fadeContainer)
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
}
