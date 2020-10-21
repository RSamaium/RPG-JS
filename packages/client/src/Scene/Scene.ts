import * as PIXI from 'pixi.js'
import { KeyboardControls, GameEngine } from 'lance-gg'

export class Scene {
   
    protected objects: Map<string, any> = new Map()
    protected loader = PIXI.Loader.shared
    private controls: KeyboardControls
    inputs: any

    constructor(protected game: GameEngine<any>) {
        this.setInput()
    }

    private setInput() {
        const clientEngine = this.game.clientEngine
        this.controls = new KeyboardControls(clientEngine, clientEngine.eventEmitter)
        if (!this.inputs) return
        for (let input in this.inputs) {
            const option = this.inputs[input]
            const { method } = option
            if (method) {
                if (!this[method]) throw new Error(`"${method}" method does not exist on the "${input}" input`)
                option.method = this[method].bind(this)
            }
            this.controls.bindKey(input, option.action || input, option)
        }
    }

    draw(t, dt) {
        const logicObjects = this.game.world
        const renderObjects = this.objects
        logicObjects.forEach((val, key) => {
            if (!renderObjects.has(key)) {
                this.addObject(val, key)
            }
            else {
                const object = renderObjects.get(key)
                if (!object.update) return
                const ret = object.update(val, t, dt)
                if (this.onUpdateObject) this.onUpdateObject(ret)
            }
        })
        if (logicObjects.size < renderObjects.size) {
            renderObjects.forEach((val, key) => {
                if (!logicObjects.has(key)) {
                    this.removeObject(key)
                }
            })
        }
    }

    stopInputs() {
        this.controls.stop = true
    }

    listenInputs() {
        this.controls.stop = false
    }

    onUpdateObject(ret) {}

    addObject(obj, id) {
        const sprite = new PIXI.Container()
        this.objects.set(id, sprite)
    }

    removeObject(id) {
        this.objects.delete(id)
    }

    getPlayer(id) {
        return this.objects.get(id)
    }
}