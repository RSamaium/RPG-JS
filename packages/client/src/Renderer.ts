window.PIXI = require('pixi.js')

import { Renderer } from 'lance-gg'
import { SceneMap } from './Scene/Map'
import { SceneBattle } from './Scene/Battle'
import { RpgCommonPlayer } from '@rpgjs/common'
import merge from 'lodash.merge'
import { Animation } from './Effects/Animation'

export default class RpgRenderer extends Renderer<any, any> {

    public vm: any
    private scene: any = null
    private stage: PIXI.Container = new PIXI.Container()
    private renderer: any
    public options: any = {}
    private _width: number = 800
    private _height: number = 400
    animation

    init() {
        if (document.readyState === 'complete' || document.readyState === 'interactive')
            this.onDOMLoaded();
        else
            document.addEventListener('DOMContentLoaded', this.onDOMLoaded.bind(this))
        return Promise.resolve()
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
        const wrapper = document.querySelector('#screen')
        if (wrapper) {
            wrapper.setAttribute('style', `width:${w}px;height:${h}px`)
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
        this.gameEngine.renderer = this.renderer
        this.gameEngine.on('client__objectUpdate', (object) => {
            console.log(object) 
        })
        document.body.querySelector(this.options.selector).appendChild(this.renderer.view)
        this.resize()
    }

    resize() {
        const size = () => {
            const { fullScreen, width, height } = this.options.canvas
            if (fullScreen) {
                this._resize(window.innerWidth, window.innerHeight)
            }
            else {
                this._resize(width, height)
            }
        }
        window.addEventListener('resize', size)
    }

    getScene() {
        return this.scene
    }
    
    draw(t, dt) {
        super.draw(t, dt)
        if (this.scene) this.scene.draw(t, dt)
        this.renderer.render(this.stage)
    }

    async loadScene(name, obj) {
        this.gameEngine.world.removeObject(this.gameEngine.playerId)
        this.stage.removeChildren()
        if (this.scene) {
            this.scene.controls.boundKeys = {}
        }
        switch (name) {
            case 'map':
                this.scene = new SceneMap(this.gameEngine, {
                    screenWidth: this.options.canvas.width,
                    screenHeight: this.options.canvas.height
                })
                break;
            case 'battle':
                this.scene = new SceneBattle(this.gameEngine)
                break;
        }
        
        const container = await this.scene.load(obj)
        
        this.stage.addChild(container)
    }

    removeObject(id: any) {
        if (this.scene && this.scene.removeObject) {
            const logic = this.gameEngine.world.getObject(id)
            if (logic) {
                this.gameEngine.world.removeObject(id)
            }
            this.scene.removeObject(id)
        }
    }

    showAnimation(sprite) { 
        
        this.animation.run(200, 160, sprite)
        this.animation.run(800, 160, sprite)
    }

    updateObject(obj) {
        const {
            playerId: id,
            params,
            localEvent,
            paramsChanged
        } = obj
        let logic
        if (localEvent) {
            logic = this.gameEngine.events[id]
            if (!logic) {
                logic = this.gameEngine.addEvent(RpgCommonPlayer, false)
                this.gameEngine.events[id] = logic
            }
        }
        else {
            logic = this.gameEngine.world.getObject(id)
        }
        if (!logic) return null
        logic.prevParamsChanged = Object.assign({}, logic)
        for (let key in params) {
            logic[key] = params[key]
        }
        if (paramsChanged) {
            if (!logic.paramsChanged) logic.paramsChanged = {}
            logic.paramsChanged = merge(paramsChanged, logic.paramsChanged)
        }
        return logic
    }
}
