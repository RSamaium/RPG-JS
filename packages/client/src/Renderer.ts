window.PIXI = require('pixi.js')

import { RpgPlugin, HookClient } from '@rpgjs/common'
import { SceneMap } from './Scene/Map'
import { Scene } from './Scene/Scene'
import { Scene as PresetScene } from './Presets/Scene'
import { RpgGui } from './RpgGui'
import { RpgClientEngine } from './RpgClientEngine'
import { App, ComponentPublicInstance } from 'vue'

export class RpgRenderer  {
    public vm: ComponentPublicInstance
    public app: App
    public readonly stage: PIXI.Container = new PIXI.Container()
    public options: any = {}
    public guiEl: HTMLDivElement

    private scene: Scene | null = null
    private renderer: PIXI.Renderer
    private _width: number = 800
    private _height: number = 400 
    private canvasEl: HTMLElement
    private selector: HTMLElement
    private gameEngine = this.clientEngine.gameEngine

    constructor(private clientEngine: RpgClientEngine) {
        this.clientEngine.tick.subscribe(({ timestamp, deltaTime, frame }) => {
            this.draw(timestamp, deltaTime, frame)
        })
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
        if (this.scene && scene.viewport) {
            scene.viewport.screenWidth = w
            scene.viewport.screenHeight = h
        }
        if (this.vm) {
            this.vm.$el.style = `width:${w}px;height:${h}px`
        }
        this.renderer.resize(w, h)
        this._width = w
        this._height = h
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
    getScene<T = Scene>(): T {
        return this.scene as any
    }
    
     /** @internal */
    draw(t: number, dt: number, frame: number) {
        if (!this.renderer) return
        if (this.scene) this.scene.draw(t, dt, frame)
        this.renderer.render(this.stage)
    }

     /** @internal */
    async loadScene(name: string, obj) {
        const currentPlayerId = this.gameEngine.playerId
        RpgPlugin.emit(HookClient.BeforeSceneLoading, {
            name, 
            obj
        })
        this.scene = null
        this.gameEngine.world.removeObject(currentPlayerId)
        this.stage.removeChildren()
        const scenes = this.options.scenes || {}
        switch (name) {
            case PresetScene.Map:
                const sceneClass = scenes[PresetScene.Map] || SceneMap
                this.scene = new sceneClass(this.gameEngine, {
                    screenWidth: this.renderer.screen.width,
                    screenHeight: this.renderer.screen.height
                })
                break;
        }

        if (!this.scene) return
        
        const container = await this.getScene<SceneMap>().load(obj)

        this.stage.addChild(container)
        RpgPlugin.emit(HookClient.AfterSceneLoading, this.scene)
    }

}
