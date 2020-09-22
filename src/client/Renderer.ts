window.PIXI = require('pixi.js')

import { Renderer } from 'lance-gg'
import { SceneMap } from './Scene/Map'
import Player from '../common/Player'

export default class RpgRenderer extends Renderer<any, any> {

    private scene: any = null
    private stage: PIXI.Container = new PIXI.Container()
    private renderer: any
    public options: any = {}

    init() {
        if (document.readyState === 'complete' || document.readyState === 'interactive')
            this.onDOMLoaded();
        else
            document.addEventListener('DOMContentLoaded', this.onDOMLoaded.bind(this));

        return Promise.resolve()
    }

    onDOMLoaded() {
        let options = {
            ...this.options.canvas,
            antialias: true,
            autoResize: true,
            resolution: window.devicePixelRatio || 1
        };
        this.renderer = PIXI.autoDetectRenderer(options);
        document.body.querySelector(this.options.selector).appendChild(this.renderer.view)
    }

    getScene() {
        return this.scene
    }
    
    draw(t, dt) {
        super.draw(t, dt)
        if (this.scene) this.scene.draw(t, dt)
        this.renderer.render(this.stage)
    }

    loadScene(name, obj) {
        this.scene = new SceneMap(this.gameEngine, {
            screenWidth: this.options.canvas.width,
            screenHeight: this.options.canvas.height
        })
        const container = this.scene.load(obj)
        this.stage.addChild(container)
    }

    removeObject(obj) {
        if (this.scene && this.scene.removeObject) {
            this.scene.removeObject(obj)
        }
    }

    updateEvent(id, params) {
        const logic = this.gameEngine.events[id]
        for (let key in params) {
            logic[key] = params[key]
        }
    }

    addEvent(obj) {
        const logic = this.gameEngine.addEvent(Player, false)
        logic.posX  = obj.x
        logic.posY = obj.y
        logic.id = obj.id
        this.gameEngine.events[obj.id] = logic
    }

    addLocalEvents(array) {
        for (let event of array) {
            this.addEvent(event)
        }
    }
}
