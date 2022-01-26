window.PIXI = require('pixi.js')

import { RpgPlugin, HookClient } from '@rpgjs/common'
import { SceneMap } from './Scene/Map'
import { Scene } from './Presets/Scene'
import { RpgGui } from './RpgGui'

const TIME_RESET_THRESHOLD = 100

export default class RpgRenderer  {

    public vm: any
    private scene: any = null
    private stage: PIXI.Container = new PIXI.Container()
    private renderer: any
    public options: any = {}
    private _width: number = 800
    private _height: number = 400
    guiEl: HTMLDivElement
    canvasEl: HTMLElement
    selector: HTMLElement
    animation
    client
    gameEngine
    doReset = false

    constructor(private clientEngine) {
        this.gameEngine = clientEngine.gameEngine
    }

    async init() {
        this.onDOMLoaded()
    }

    _resize(w, h) {
        if (!w) w = this.options.canvas.width
        if (!h) h = this.options.canvas.height
        if (this.scene && this.scene.viewport) {
            this.scene.viewport.screenWidth = w
            this.scene.viewport.screenHeight = h
        }
        if (this.vm) {
            this.vm.$el.style = `width:${w}px;height:${h}px`
        }
        this.renderer.resize(w, h)
        this._width = w
        this._height = h
    }

    get height() {
        return this._height
    }

    set height(val) {
       this._resize(this._width, val)
    }

    get width() {
        return this._width
    }

    set width(val) {
        this._resize(val, this.height)
    }

    onDOMLoaded() {
        let options = {
            antialias: true,
            autoResize: true,
            resolution: window.devicePixelRatio || 1,
            ...this.options.canvas
        };
        this.renderer = PIXI.autoDetectRenderer(options)
        //this.gameEngine.renderer = this.renderer
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

        RpgGui._initalize(this.client)

        this.resize()
    }

    resize() {
        const size = () => {
            const { offsetWidth, offsetHeight } = this.canvasEl || this.selector
            this._resize(offsetWidth, offsetHeight)
            RpgPlugin.emit(HookClient.WindowResize)
        }
        window.addEventListener('resize', size)
        size()
    }

    getScene(): Scene {
        return this.scene
    }
    
    draw(t: number, dt: number, frame: number) {
        if (this.scene) this.scene.draw(t, dt, frame)
        this.renderer.render(this.stage)
    }

    async loadScene(name, obj) {
        RpgPlugin.emit(HookClient.BeforeSceneLoading, {
            name, 
            obj
        })
        this.gameEngine.world.removeObject(this.gameEngine.playerId)
        this.stage.removeChildren()
        const scenes = this.options.scenes || {}
        if (this.scene) {
            this.scene.controls.boundKeys = {}
        }
        switch (name) {
            case Scene.Map:
                const sceneClass = scenes[Scene.Map] || SceneMap
                this.scene = new sceneClass(this.gameEngine, {
                    screenWidth: this.renderer.screen.width,
                    screenHeight: this.renderer.screen.height
                })
                break;
        }
        
        const container = await this.scene.load(obj)
        this.stage.addChild(container)
        RpgPlugin.emit(HookClient.AfterSceneLoading, this.scene)
    }

}
